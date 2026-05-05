// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type KeyDefinition<T> =
    | keyof T
    | { key: keyof T | string; weight: number };

export type MatchType = "partial" | "exact" | "partial-sensitive";

export interface SearchOptions<T> {
    keys?: ReadonlyArray<KeyDefinition<T> | string>;
    matchType?: MatchType;
    sortByScore?: boolean;
    queries?: ReadonlyArray<string | number | RegExp>;
    limit?: number;
    offset?: number;
}

export interface SearchMatch {
    key: string;
    value: unknown;
    score: number;
}

export interface SearchResult<T> {
    path: string;
    value: T;
    matches: SearchMatch[];
    score: number;
}

// ---------------------------------------------------------------------------
// Scoring constants
// ---------------------------------------------------------------------------

const SCORE_EXACT = 100;
const SCORE_PREFIX = 60;
const SCORE_SUBSTRING = 30;
const SCORE_SUBSTRING_SENSITIVE = 40;
const SCORE_REGEX = 50;
const SCORE_NUMBER = 100;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isNonNull<T>(value: T | null): value is T {
    return value !== null;
}

function resolvePath(obj: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((current, segment) => {
        if (current === null || typeof current !== "object") return undefined;
        return (current as Record<string, unknown>)[segment];
    }, obj);
}

function collectLeaves(
    value: unknown,
    prefix: string = "",
): Array<[string, string | number | boolean]> {
    if (Array.isArray(value)) {
        return value.flatMap((item, i) =>
            collectLeaves(item, prefix ? `${prefix}.${i}` : String(i)),
        );
    }

    if (value !== null && typeof value === "object") {
        return Object.entries(value as Record<string, unknown>).flatMap(
            ([k, v]) => collectLeaves(v, prefix ? `${prefix}.${k}` : k),
        );
    }

    if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
    ) {
        return [[prefix, value]];
    }

    return [];
}

// ---------------------------------------------------------------------------
// Cached leaf extraction (BIG WIN)
// ---------------------------------------------------------------------------

const leafCache = new WeakMap<
    object,
    Array<[string, string | number | boolean]>
>();

function getCachedLeaves(
    obj: object,
): Array<[string, string | number | boolean]> {
    let cached = leafCache.get(obj);
    if (!cached) {
        cached = collectLeaves(obj);
        leafCache.set(obj, cached);
    }
    return cached;
}

// ---------------------------------------------------------------------------
// Faster scoring
// ---------------------------------------------------------------------------

function scoreValueFast(
    value: unknown,
    query: any,
    matchType: MatchType,
): number {
    // regex
    if (query.type === "regex") {
        return typeof value === "string" && query.raw.test(value)
            ? SCORE_REGEX
            : 0;
    }

    // number
    if (query.type === "number") {
        return value === query.raw ? SCORE_NUMBER : 0;
    }

    // string
    const q = query.normalized;

    if (typeof value === "number" || typeof value === "boolean") {
        const val = String(value).toLowerCase();
        return val.includes(q) ? SCORE_SUBSTRING : 0;
    }

    if (typeof value !== "string") return 0;

    if (matchType === "exact") {
        return value === query.raw ? SCORE_EXACT : 0;
    }

    if (matchType === "partial-sensitive") {
        if (value === query.raw) return SCORE_EXACT;
        if (value.startsWith(query.raw)) return SCORE_PREFIX;
        if (value.includes(query.raw)) return SCORE_SUBSTRING_SENSITIVE;
        return 0;
    }

    const val = value.toLowerCase();

    if (val === q) return SCORE_EXACT;
    if (val.startsWith(q)) return SCORE_PREFIX;
    if (val.includes(q)) return SCORE_SUBSTRING;

    return 0;
}

// ---------------------------------------------------------------------------

interface ResolvedKey {
    path: string;
    weight: number;
}

function resolveKeyDefinition<T>(def: KeyDefinition<T> | string): ResolvedKey {
    if (typeof def === "object" && def !== null && "key" in def) {
        return { path: String(def.key), weight: def.weight };
    }
    return { path: String(def), weight: 1 };
}

// ---------------------------------------------------------------------------
// MAIN
// ---------------------------------------------------------------------------

function searchJsonAdvanced<T extends Record<string, unknown>>(
    data: ReadonlyArray<T>,
    query: string | number | RegExp,
    options: SearchOptions<T> = {},
): SearchResult<T>[] {
    const {
        keys,
        matchType = "partial",
        sortByScore = true,
        queries: multiQueries,
        limit = 0,
        offset = 0,
    } = options;

    const effectiveQueries = (
        multiQueries && multiQueries.length > 0 ? multiQueries : [query]
    ).map((q) => {
        if (typeof q === "string") {
            return {
                raw: q,
                normalized: q.toLowerCase(),
                type: "string" as const,
            };
        }

        if (typeof q === "number") {
            return { raw: q, type: "number" as const };
        }

        return {
            raw: new RegExp(q.source, q.flags.replace("g", "")),
            type: "regex" as const,
        };
    });

    const resolvedKeys: ResolvedKey[] | null =
        keys && keys.length > 0 ? keys.map(resolveKeyDefinition) : null;

    const isAllSearch = effectiveQueries.every(
        (q) => q.type === "string" && q.raw.trim() === "",
    );

    const results = data
        .map((item, index): SearchResult<T> | null => {
            if (isAllSearch) {
                return {
                    path: String(index),
                    value: item,
                    matches: [],
                    score: 0,
                };
            }

            const allHits: SearchMatch[] = [];

            for (const q of effectiveQueries) {
                if (resolvedKeys === null) {
                    const leaves =
                        typeof item === "object"
                            ? getCachedLeaves(item)
                            : collectLeaves(item);

                    for (const [leafPath, leafValue] of leaves) {
                        const score = scoreValueFast(leafValue, q, matchType);
                        if (score > 0) {
                            allHits.push({
                                key: leafPath,
                                value: leafValue,
                                score,
                            });
                        }
                    }
                } else {
                    for (const { path, weight } of resolvedKeys) {
                        const resolved = resolvePath(item, path);
                        if (resolved == null) continue;

                        const leaves =
                            typeof resolved === "object"
                                ? getCachedLeaves(resolved)
                                : collectLeaves({ value: resolved });

                        let best = 0;
                        let bestValue: unknown;

                        for (const [, leafValue] of leaves) {
                            const score = scoreValueFast(
                                leafValue,
                                q,
                                matchType,
                            );
                            if (score > best) {
                                best = score;
                                bestValue = leafValue;
                            }
                        }

                        if (best > 0) {
                            allHits.push({
                                key: path,
                                value: bestValue,
                                score: best * weight,
                            });
                        }
                    }
                }
            }

            if (allHits.length === 0) return null;

            const byKey = new Map<string, SearchMatch>();
            let totalScore = 0;

            for (const hit of allHits) {
                totalScore += hit.score;
                const existing = byKey.get(hit.key);
                if (!existing || hit.score > existing.score) {
                    byKey.set(hit.key, hit);
                }
            }

            return {
                path: String(index),
                value: item,
                matches: Array.from(byKey.values()),
                score: totalScore,
            };
        })
        .filter(isNonNull);

    const sorted =
        isAllSearch || !sortByScore
            ? results
            : results
                  .map((r, i) => ({ r, i }))
                  .sort((a, b) => b.r.score - a.r.score || a.i - b.i)
                  .map(({ r }) => r);

    const start = Math.max(0, offset);
    return limit > 0 ? sorted.slice(start, start + limit) : sorted.slice(start);
}

export { searchJsonAdvanced };

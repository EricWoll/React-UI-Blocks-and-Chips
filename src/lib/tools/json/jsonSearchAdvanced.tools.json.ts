// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * A key definition with an optional relevance weight multiplier.
 * Use a plain string for weight=1, or an object to boost/dampen a key.
 */
export type KeyDefinition<T> =
    | keyof T
    | { key: keyof T; weight: number };

/**
 * Controls how string values are compared against a string query.
 * "partial"            – case-insensitive substring match (default)
 * "exact"              – strict equality
 * "partial-sensitive"  – case-SENSITIVE substring match
 *
 * When the query is a RegExp, matchType is ignored; the regexp is used directly.
 * When the query is a number, matchType is ignored; strict equality is used.
 */
export type MatchType = "partial" | "exact" | "partial-sensitive";

export interface SearchOptions<T> {
    /**
     * Restrict the search to these keys only. Defaults to all own top-level keys.
     * Each entry may be:
     *   - a plain key:                  "name"
     *   - a dot-notation path:          "address.city"
     *   - a weighted key definition:    { key: "name", weight: 2 }
     *   - a weighted path definition:   { key: "address.city", weight: 1.5 }
     */
    keys?: ReadonlyArray<KeyDefinition<T> | string>;
    matchType?: MatchType;
    /**
     * Sort results by relevance score descending before returning.
     * Defaults to true. Set to false to preserve original array order.
     */
    sortByScore?: boolean;
    /**
     * One or more queries. When multiple are supplied, a result must satisfy
     * AT LEAST ONE (OR logic). Scores are summed across all queries that match,
     * so items matching more queries rank higher.
     * When provided, the top-level `query` argument is ignored.
     */
    queries?: ReadonlyArray<string | number | RegExp>;
    /**
     * Maximum number of results to return. Applied after sorting.
     * Omit or set to 0 for no limit.
     */
    limit?: number;
    /**
     * Number of results to skip before returning. Applied after sorting.
     * Use together with `limit` for pagination. Defaults to 0.
     */
    offset?: number;
}

/** A single match: the dot-notation path to the key, the matched value, and its score. */
export interface SearchMatch {
    /** Dot-notation path to the matched key (e.g. "address.city"). */
    key: string;
    value: unknown;
    /** Relevance score for this individual match, after weight is applied. */
    score: number;
}

/** A single search result. */
export interface SearchResult<T> {
    /** Original array index as a string. */
    path: string;
    value: T;
    matches: SearchMatch[];
    /** Aggregate relevance score across all matches and all queries. Higher is better. */
    score: number;
}

// ---------------------------------------------------------------------------
// Scoring constants
// ---------------------------------------------------------------------------

/** A string value is an exact, case-sensitive match for the query. */
const SCORE_EXACT = 100;
/** A string value starts with the query (case-insensitive). */
const SCORE_PREFIX = 60;
/** A string value contains the query somewhere in the middle (case-insensitive). */
const SCORE_SUBSTRING = 30;
/** Case-sensitive substring match (not a prefix, not exact). */
const SCORE_SUBSTRING_SENSITIVE = 40;
/** A RegExp test passed. */
const SCORE_REGEX = 50;
/** A number value matches exactly. */
const SCORE_NUMBER = 100;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function isNonNull<T>(value: T | null): value is T {
    return value !== null;
}

/**
 * Resolve a dot-notation path against an object.
 * Returns `undefined` when any segment along the path is absent.
 */
function resolvePath(obj: unknown, path: string): unknown {
    return path.split(".").reduce<unknown>((current, segment) => {
        if (current === null || typeof current !== "object") return undefined;
        return (current as Record<string, unknown>)[segment];
    }, obj);
}

/**
 * Collect all primitive leaf values (strings, numbers, booleans) from a value,
 * including recursing into plain objects and flattening arrays.
 * Returns an array of [dotPath, primitiveValue] pairs.
 */
function collectLeaves(
    value: unknown,
    prefix: string = "",
): Array<[path: string, value: string | number | boolean]> {
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

/**
 * Score a single primitive value against a single query.
 * Returns 0 when the value does not match.
 */
function scoreValue(
    value: unknown,
    query: string | number | RegExp,
    matchType: MatchType,
): number {
    if (query instanceof RegExp) {
        return typeof value === "string" && query.test(value) ? SCORE_REGEX : 0;
    }

    if (typeof query === "number") {
        return value === query ? SCORE_NUMBER : 0;
    }

    // String query from here on.
    if (typeof value === "number" || typeof value === "boolean") {
        // Allow matching numbers/booleans by their string representation in partial mode.
        if (matchType === "exact") return String(value) === query ? SCORE_EXACT : 0;
        return String(value).toLowerCase().includes(query.toLowerCase())
            ? SCORE_SUBSTRING
            : 0;
    }

    if (typeof value !== "string") return 0;

    if (matchType === "exact") {
        return value === query ? SCORE_EXACT : 0;
    }

    if (matchType === "partial-sensitive") {
        if (value === query) return SCORE_EXACT;
        if (value.startsWith(query)) return SCORE_PREFIX;
        if (value.includes(query)) return SCORE_SUBSTRING_SENSITIVE;
        return 0;
    }

    // partial (default) — case-insensitive, rank by match position.
    const normVal = value.toLowerCase();
    const normQuery = query.toLowerCase();

    if (normVal === normQuery) return SCORE_EXACT;
    if (normVal.startsWith(normQuery)) return SCORE_PREFIX;
    if (normVal.includes(normQuery)) return SCORE_SUBSTRING;

    return 0;
}

interface ResolvedKey {
    path: string;
    weight: number;
}

/**
 * Normalise a raw key definition (plain string, keyof T, or weighted object)
 * into a uniform { path, weight } shape.
 */
function resolveKeyDefinition<T>(def: KeyDefinition<T> | string): ResolvedKey {
    if (typeof def === "object" && def !== null && "key" in def) {
        const d = def as { key: keyof T | string; weight: number };
        return { path: String(d.key), weight: d.weight };
    }
    return { path: String(def), weight: 1 };
}

/**
 * Score an item against a single query across the specified key paths.
 * Returns an array of SearchMatch (may be empty).
 */
function scoreItemAgainstQuery<T extends Record<string, unknown>>(
    item: T,
    query: string | number | RegExp,
    matchType: MatchType,
    resolvedKeys: ResolvedKey[] | null, // null = search all leaves
): SearchMatch[] {
    const hits: SearchMatch[] = [];

    if (resolvedKeys === null) {
        // Deep search: walk every leaf of the item.
        for (const [leafPath, leafValue] of collectLeaves(item)) {
            const raw = scoreValue(leafValue, query, matchType);
            if (raw > 0) hits.push({ key: leafPath, value: leafValue, score: raw });
        }
    } else {
        for (const { path, weight } of resolvedKeys) {
            const resolved = resolvePath(item, path);

            // The resolved value might itself be an array or nested object —
            // flatten to leaves and take the highest-scoring leaf.
            const leaves = collectLeaves(resolved, path);

            if (leaves.length === 0) {
                // Scalar-ish (null, undefined, object with no primitives) — skip.
                continue;
            }

            let best = 0;
            let bestValue: unknown = undefined;

            for (const [, leafValue] of leaves) {
                const raw = scoreValue(leafValue, query, matchType);
                if (raw > best) {
                    best = raw;
                    bestValue = leafValue;
                }
            }

            if (best > 0) {
                hits.push({ key: path, value: bestValue, score: best * weight });
            }
        }
    }

    return hits;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Search through a JSON array for all objects that match one or more queries.
 *
 * Features:
 * - Dot-notation key paths for nested objects  ("address.city")
 * - Per-key score weight                       ({ key: "name", weight: 2 })
 * - Array field support                        (any matching element scores the key)
 * - Multiple queries with OR logic             (options.queries)
 * - Case-sensitive partial matching            (matchType: "partial-sensitive")
 * - Pagination                                 (limit / offset)
 * - Relevance-sorted results (default on)      (sortByScore: false to disable)
 *
 * Pass an empty string as the query to return every object ("all" search).
 * All-search results score 0 and are returned in original order regardless of sortByScore.
 *
 * Scoring heuristics for string queries (before weight is applied):
 *   Exact match (case-sensitive)            100
 *   Prefix match (case-insensitive)          60
 *   Case-sensitive substring match           40
 *   Regex match                              50
 *   Substring match (case-insensitive)       30
 *   Number / boolean coerced substring       30
 *   Number exact match                      100
 *
 * @param data      - Array of objects to search.
 * @param query     - String, number, or RegExp to match against.
 *                    Ignored when options.queries is supplied.
 * @param options   - Optional search configuration.
 * @returns         Array of SearchResult, sorted by score descending by default.
 *
 * @example
 * // Simple partial search
 * searchJsonAdvanced(users, "alice", { keys: ["name"] });
 *
 * @example
 * // Weighted keys + nested path
 * searchJsonAdvanced(users, "london", {
 *   keys: [{ key: "name", weight: 2 }, "address.city"],
 * });
 *
 * @example
 * // OR across multiple queries
 * searchJsonAdvanced(products, "", {
 *   queries: ["shirt", "hoodie"],
 *   keys: ["name", "category"],
 * });
 *
 * @example
 * // Paginated results
 * searchJsonAdvanced(articles, "typescript", { limit: 10, offset: 20 });
 */
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

    // Normalise the effective query list.
    const effectiveQueries: ReadonlyArray<string | number | RegExp> =
        multiQueries && multiQueries.length > 0 ? multiQueries : [query];

    // Pre-resolve key definitions once, outside the per-item loop.
    const resolvedKeys: ResolvedKey[] | null =
        keys && keys.length > 0
            ? (keys as ReadonlyArray<KeyDefinition<T> | string>).map(resolveKeyDefinition)
            : null;

    // Determine whether every effective query is an "all" search.
    const isAllSearch = effectiveQueries.every(
        (q) => typeof q === "string" && q.trim() === "",
    );

    const results = data
        .map((item, index): SearchResult<T> | null => {
            if (isAllSearch) {
                return { path: String(index), value: item, matches: [], score: 0 };
            }

            // Accumulate hits across all queries (OR logic, scores summed).
            const allHits: SearchMatch[] = [];

            for (const q of effectiveQueries) {
                const hits = scoreItemAgainstQuery(item, q, matchType, resolvedKeys);
                allHits.push(...hits);
            }

            if (allHits.length === 0) return null;

            // Merge duplicate key entries (same key hit by multiple queries):
            // keep the entry with the highest score for display, but sum all
            // scores for the aggregate to reward multi-query matches.
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

    // Sort — stable: equal scores preserve original input order.
    const sorted =
        isAllSearch || !sortByScore
            ? results
            : results
                  .map((result, i) => ({ result, i }))
                  .sort((a, b) => b.result.score - a.result.score || a.i - b.i)
                  .map(({ result }) => result);

    // Paginate.
    const start = Math.max(0, offset);
    return limit > 0 ? sorted.slice(start, start + limit) : sorted.slice(start);
}

export { searchJsonAdvanced };
/**
 * Search through JSON for all matches based on query and options.
 * Supports:
 * Return all objects when query is empty (ALL search)
 * Include path as index
 * Wrap original object in "value"
 * Include matches array for matched keys
 *
 * @param data - JSON array of objects
 * @param query - String, number, or RegExp to search for
 * @param options - {
 *   keys?: string[], // Optional: restrict search to these keys
 *   matchType?: "partial" | "exact" | "regex"
 * }
 * @returns Array of { path, value, matches[] }
 */
function searchJsonAdvanced<T extends Record<string, any>>(
    data: T[],
    query: string | number | RegExp,
    options: {
        keys?: string[];
        matchType?: 'partial' | 'exact' | 'regex';
    } = {},
): { path: string; value: T; matches: { key: string; value: any }[] }[] {
    const { keys, matchType = 'partial' } = options;

    const isAllSearch = typeof query === 'string' && query.trim() === '';

    function matchesValue(value: any): boolean {
        if (isAllSearch) return true; // Always match if ALL search
        if (typeof query === 'number') return value === query;
        if (query instanceof RegExp)
            return typeof value === 'string' && query.test(value);
        if (typeof value === 'string') {
            if (matchType === 'exact') return value === query;
            if (matchType === 'partial')
                return value
                    .toLowerCase()
                    .includes(String(query).toLowerCase());
        }
        return false;
    }

    return data
        .map((item, index) => {
            const matches: { key: string; value: any }[] = [];
            const keysToSearch =
                keys && keys.length > 0 ? keys : Object.keys(item);

            for (const key of keysToSearch) {
                if (matchesValue(item[key])) {
                    matches.push({ key, value: item[key] });
                }
            }

            if (isAllSearch || matches.length > 0) {
                return {
                    path: String(index),
                    value: item,
                    matches,
                };
            }
            return null;
        })
        .filter(Boolean) as {
        path: string;
        value: T;
        matches: { key: string; value: any }[];
    }[];
}

export { searchJsonAdvanced };

/**
 * Creates a unique ID for UI components.
 * If an ID is provided, it will be used.
 * Otherwise, it will generate a random ID using crypto.randomUUID() if available,
 * or fall back to a random string.
 *
 * @param {string | undefined} id - The provided ID (optional)
 * @param {string} idType - The type of component (used for fallback ID generation)
 * @returns {string} The generated or provided ID
 *
 * @example
 * // With provided ID
 * const newId = createId('custom-id', 'Button');
 *
 * @example
 * // Without provided ID (generates random ID)
 * const newId = createId(undefined, 'Button');
 */
function createId(id: string | undefined, idType: string): string {
  if (id) return id;
  if (
    typeof window !== "undefined" &&
    "crypto" in window &&
    "randomUUID" in crypto
  ) {
    return crypto.randomUUID();
  }
  return `${idType}-${Math.random().toString(36).slice(2)}`;
}
createId.displayName = "createId";
export default createId;

/** Returns all enabled, keyboard-navigable item elements inside a container. */
export function getItems(container: HTMLElement | null): HTMLElement[] {
  if (!container) return [];
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      "[data-item-id]:not([data-disabled='true'])",
    ),
  );
}

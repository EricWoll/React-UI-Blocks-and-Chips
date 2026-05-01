import { Ref } from "react";
/**
 * Merges multiple refs onto one callback ref.
 * Avoids losing the child's own ref when we clone it inside asChild.
 */
export function mergeRefs<T>(...refs: Array<Ref<T> | null | undefined>) {
  return (node: T) => {
    for (const ref of refs) {
      if (!ref) continue;
      if (typeof ref === "function") ref(node);
      else (ref as React.RefObject<T>).current = node;
    }
  };
}

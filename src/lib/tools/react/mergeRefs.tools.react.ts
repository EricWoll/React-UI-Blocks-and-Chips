import { type Ref, type RefCallback } from "react";

/** Merges callback and object refs into one stable-compatible callback ref. */
export function mergeRefs<T>(
  ...refs: readonly (Ref<T> | null | undefined)[]
): RefCallback<T> {
  return (node) => {
    for (const ref of refs) {
      if (ref == null) continue;
      if (typeof ref === "function") {
        ref(node);
      } else {
        ref.current = node;
      }
    }
  };
}

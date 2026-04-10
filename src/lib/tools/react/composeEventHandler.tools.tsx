export function composeEventHandlers<E>(
  ...handlers: Array<((event: E) => void) | undefined>
) {
  return (event: E) => {
    for (const handler of handlers) {
      handler?.(event);
    }
  };
}

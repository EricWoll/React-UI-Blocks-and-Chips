import { KeyboardEvent, MouseEvent, createContext, useContext } from "react";

type SelectContextValue = {
  multiple: boolean;
  value: string | string[];
  isSelected: (v: string) => boolean;
  select: (
    v: string,
    e: MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>,
  ) => void;
  registerLabel: (value: string, label: string) => void;
  unregisterLabel: (value: string) => void;
  labels: string[];
  isOpen: boolean;
};

const SelectContext = createContext<SelectContextValue | null>(null);

function useSelect() {
  const ctx = useContext(SelectContext);
  if (!ctx) throw new Error("<Select.*> must be used inside <Select>");
  return ctx;
}

export { SelectContext, useSelect };

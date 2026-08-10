"use client";

import {
  createContext,
  useContext,
  type KeyboardEvent,
  type MouseEvent,
} from "react";

export type SelectOption = {
  value: string;
  label: string;
  disabled?: boolean;
};

export type SelectValue = string | string[];

export type SelectEvent = MouseEvent<HTMLElement> | KeyboardEvent<HTMLElement>;

export type SelectContextValue = {
  multiple: boolean;
  value: SelectValue;
  selectedValues: readonly string[];
  labels: readonly string[];
  isOpen: boolean;
  getOption: (value: string) => SelectOption | undefined;
  isSelected: (value: string) => boolean;
  select: (value: string) => void;
};

export const SelectContext = createContext<SelectContextValue | null>(null);

export function useSelect(): SelectContextValue {
  const context = useContext(SelectContext);

  if (!context) {
    throw new Error("<Select.*> must be used inside <Select>.");
  }

  return context;
}

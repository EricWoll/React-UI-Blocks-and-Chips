import { createContext, useContext } from "react";

type DropdownContextValue = {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
  triggerId: string;
  contentId: string;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLDivElement | null>;
  contentSize: number;
  updateContentSize: (amount: number) => void;
  registerItem: (id: string, el: HTMLElement) => void;
  unregisterItem: (id: string) => void;
  highlightedId: string | null;
  setHighlightedId: (id: string | null) => void;
  disabled: boolean;
  usePortal: boolean;
  portalLayerName: string;
  portalZIndex: number;
};

const DropdownContext = createContext<DropdownContextValue | null>(null);

function useDropdown() {
  const ctx = useContext(DropdownContext);
  if (!ctx) throw new Error("<Dropdown.*> must be used inside <Dropdown>");
  return ctx;
}
/** Context for RadioGroup — tracks the checked value within the group. */
type RadioGroupContextValue = {
  value: string | null;
  onValueChange: (value: string) => void;
};

const RadioGroupContext = createContext<RadioGroupContextValue | null>(null);

function useRadioGroup() {
  return useContext(RadioGroupContext);
}

export { useDropdown, useRadioGroup, DropdownContext, RadioGroupContext };

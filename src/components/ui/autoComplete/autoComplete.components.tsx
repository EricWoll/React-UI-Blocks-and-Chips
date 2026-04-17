"use client";

import { useKeyboardScoped } from "@/hooks/useKeyboardScoped.hooks";
import clsx from "clsx";
import { useEffect, useRef, useState } from "react";

export interface AutoCompleteProps {
  onSelect: (result: any) => void;
  resultChip: (result: any, indx: number) => React.ReactNode;
  options?: AutoCompleteOptions;
  onInputClick?: (value: string) => void;
  onInputChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
  searchFunc?: (query: string) => any[];
  value?: string;
}

interface AutoCompleteOptions {
  placeholder?: string;
  blurOnClick?: boolean;
  containerClass?: string;
  dropdownContainerClass?: string;
  dropdownItemClass?: string;
  inputClass?: string;
}

export default function AutoComplete({
  onSelect,
  resultChip,
  onInputClick,
  onInputChange,
  searchFunc,
  value,
  options = {
    placeholder: "Search...",
    blurOnClick: true,
  },
}: AutoCompleteProps) {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [inputValueState, setInputValueState] = useState<string>(value ?? "");
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    if (value !== undefined) {
      setInputValueState(value);
    }
  }, [value]);

  useKeyboardScoped(
    [
      {
        keys: ["Escape"],
        handler: () => {
          setIsOpen(false);
          inputRef.current?.blur();
        },
        includeInputs: true,
      },
    ],
    {
      target: document.body,
      when: isOpen,
    },
  );

  const handleSelection = (
    evnt: React.MouseEvent<HTMLButtonElement>,
    result: any,
  ) => {
    evnt.stopPropagation();
    onSelect(result);
    setIsOpen(false);
    setInputValueState("");

    if (!options.blurOnClick) {
      inputRef.current?.focus();
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setIsOpen(e.target.value.length > 0);
    setInputValueState(e.target.value);
    onInputChange?.(e);
    setSearchResults(searchFunc?.(e.target.value) || []);
  };

  const handleFocus = () => {
    if (searchResults.length > 0) {
      setIsOpen(true);
    }
  };

  return (
    <div
      ref={containerRef}
      className={clsx("relative", options.containerClass)}
    >
      <input
        ref={inputRef}
        type="text"
        placeholder={options.placeholder}
        className={clsx("w-full", options.inputClass)}
        onFocus={handleFocus}
        onChange={handleChange}
        value={inputValueState}
        onClick={() => onInputClick?.(inputValueState)}
      />

      {isOpen && searchResults.length > 0 && (
        <div
          className={clsx(
            "absolute mt-1 w-full overflow-auto z-50 bg-white",
            options.dropdownContainerClass,
          )}
          role="listbox"
        >
          {searchResults.map((result, index) => (
            <button
              key={index}
              type="button"
              className={clsx("w-full", options.dropdownItemClass)}
              onClick={(e) => handleSelection(e, result)}
              role="option"
            >
              {resultChip(result, index)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
AutoComplete.displayName = "AutoComplete";

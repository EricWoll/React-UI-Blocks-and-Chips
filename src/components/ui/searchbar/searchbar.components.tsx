"use client";

import { Search, X } from "lucide-react";
import { useRef, forwardRef } from "react";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  searchTerm: string | null;
  setSearchTerm: React.Dispatch<React.SetStateAction<string | null>>;
  onSearch: (value: string) => void;
  onClear?: () => void;
  autoSearch?: {
    isAutoSearch?: boolean;
    allowKeyPress?: boolean;
    allowEmptySearch?: boolean;
  };
  keyPressSearch?: {
    allowEmptySearch?: boolean;
  };
  debounceMs?: {
    autoSearch?: number;
    manualSearch?: number;
  };
}

const DEFAULT_DEBOUNCE = {
  autoSearch: 300,
  manualSearch: 100,
};

const DEFAULT_AUTO_SEARCH = {
  isAutoSearch: false,
  allowKeyPress: false,
  allowEmptySearch: false,
};

const DEFAULT_KEY_PRESS_SEARCH = {
  allowEmptySearch: false,
};

const SearchBar = forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      searchTerm,
      setSearchTerm,
      onSearch,
      onClear,
      autoSearch = DEFAULT_AUTO_SEARCH,
      keyPressSearch = DEFAULT_KEY_PRESS_SEARCH,
      debounceMs = DEFAULT_DEBOUNCE,
      placeholder = "Search...",
      ...rest
    },
    ref,
  ) => {
    const debounceTimeout = useRef<number | null>(null);
    const isEmpty = useRef(
      (searchTerm ?? "").trim() === "" || searchTerm === null,
    );

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);
      isEmpty.current = value.trim() === "";

      if (!autoSearch.isAutoSearch) return;
      if (!autoSearch.allowEmptySearch && value.trim() === "") return;

      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }

      debounceTimeout.current = setTimeout(() => {
        onSearch(value);
      }, debounceMs.autoSearch);
    };

    const manualSearch = (value: string) => {
      setSearchTerm(value);

      if (
        ((!autoSearch.allowKeyPress && !keyPressSearch.allowEmptySearch) ||
          (autoSearch.allowKeyPress && !autoSearch.allowEmptySearch)) &&
        isEmpty.current
      ) {
        return;
      }

      if (debounceTimeout.current) {
        clearTimeout(debounceTimeout.current);
      }
      debounceTimeout.current = setTimeout(() => {
        onSearch(value ?? "");
      }, debounceMs.manualSearch);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        manualSearch(e.currentTarget.value);
      }
    };

    return (
      <div className="flex items-center w-full bg-white rounded-md px-4 border border-gray-200 focus-within:ring-1 focus-within:ring-gray-400 ring-transparent">
        <Search
          size={15}
          onClick={() => manualSearch(searchTerm ?? "")}
          className="text-gray-400 mr-2 cursor-pointer hover:text-gray-600"
        />

        <input
          type="text"
          autoComplete="off"
          id="searchBar"
          ref={ref}
          value={searchTerm ?? ""}
          onChange={handleSearchChange}
          onKeyDown={
            autoSearch.isAutoSearch || autoSearch.allowKeyPress
              ? handleKeyPress
              : undefined
          }
          className="flex-1 outline-none text-gray-700 placeholder-gray-400 placeholder:select-none"
          placeholder={placeholder}
          {...rest}
        />
        <button
          onClick={() => {
            setSearchTerm("");
            isEmpty.current = true;
            onClear?.();
            (ref as React.RefObject<HTMLInputElement>)?.current?.focus();
          }}
          className={`cursor-pointer text-red-400 hover:text-red-600 font-semibold ${
            isEmpty.current && "hidden"
          }`}
        >
          <X size={18} />
        </button>
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";
export default SearchBar;

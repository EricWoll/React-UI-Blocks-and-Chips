"use client";

import { Search, X } from "lucide-react";
import { forwardRef } from "react";

interface SearchBarProps extends React.InputHTMLAttributes<HTMLInputElement> {
  searchTerm: string;
  setSearchTerm: React.Dispatch<React.SetStateAction<string>>;
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
}

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
      placeholder = "Search...",
      ...rest
    },
    ref,
  ) => {
    const isEmpty = !searchTerm || searchTerm.trim() === "";

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSearchTerm(value);

      if (!autoSearch.isAutoSearch) return;

      const empty = value.trim() === "";
      if (!autoSearch.allowEmptySearch && empty) return;

      onSearch(value);
    };

    const manualSearch = (value: string) => {
      setSearchTerm(value);

      const empty = value.trim() === "";

      const shouldBlock =
        ((!autoSearch.allowKeyPress && !keyPressSearch.allowEmptySearch) ||
          (autoSearch.allowKeyPress && !autoSearch.allowEmptySearch)) &&
        empty;

      if (shouldBlock) return;

      onSearch(value);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        manualSearch(searchTerm);
      }
    };

    const handleClear = () => {
      setSearchTerm("");
      onClear?.();
    };

    return (
      <div className="flex items-center w-full bg-white rounded-md px-4 border border-gray-200 focus-within:ring-1 focus-within:ring-gray-400 ring-transparent">
        <Search
          size={15}
          onClick={() => manualSearch(searchTerm)}
          className="text-gray-400 mr-2 cursor-pointer hover:text-gray-600"
          aria-label="search icon"
        />

        <input
          aria-label="search input"
          ref={ref}
          type="text"
          value={searchTerm}
          autoComplete="off"
          onChange={handleSearchChange}
          onKeyDown={
            autoSearch.isAutoSearch || autoSearch.allowKeyPress
              ? handleKeyPress
              : undefined
          }
          placeholder={placeholder}
          className="flex-1 outline-none text-gray-700 placeholder-gray-400 placeholder:select-none"
          {...rest}
        />

        {!isEmpty && (
          <button
            aria-label="search clear button"
            onClick={() => {
              handleClear();
              (ref as React.RefObject<HTMLInputElement>)?.current?.focus();
            }}
            className="cursor-pointer text-red-400 hover:text-red-600 font-semibold"
          >
            <X size={18} />
          </button>
        )}
      </div>
    );
  },
);

SearchBar.displayName = "SearchBar";
export default SearchBar;

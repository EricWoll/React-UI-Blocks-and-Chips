import clsx from "clsx";
import { Search, X } from "lucide-react";
import React from "react";

interface SearchBarProps extends React.HTMLAttributes<HTMLInputElement> {
  searchTerm: string | null;
  setSearchTerm: React.Dispatch<React.SetStateAction<string | null>>;
  onSearch?: () => void;
  allowEmptySearch?: boolean;
}

const SearchBar = React.forwardRef<HTMLInputElement, SearchBarProps>(
  (
    {
      searchTerm,
      setSearchTerm,
      onSearch,
      className,
      allowEmptySearch = false,
      ...rest
    },
    ref,
  ) => {
    const isEmpty = (searchTerm ?? "").trim() === "" || searchTerm === null;

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        if (!allowEmptySearch && isEmpty) {
          console.log("Empty search not allowed");
          return;
        }
        onSearch?.();
      }
    };

    return (
      <div
        className={clsx(
          "flex items-center w-full bg-white rounded-md px-4 border border-gray-200 focus-within:ring-1 focus-within:ring-gray-400 ring-transparent",
          className,
        )}
      >
        {/* Search Icon */}
        <Search
          size={15}
          onClick={onSearch}
          className="text-gray-400 mr-2 cursor-pointer hover:text-gray-600"
        />

        {/* Input Field */}
        <input
          type="text"
          autoComplete="off"
          id="searchBar"
          ref={ref}
          value={searchTerm ?? ""}
          onChange={handleSearchChange}
          onKeyDown={handleKeyPress}
          className="flex-1 outline-none text-gray-700 placeholder-gray-400 placeholder:select-none"
          placeholder="Search The Excel File"
          {...rest}
        />

        {/* Clear Button */}
        <button
          onClick={() => {
            setSearchTerm("");
            (ref as React.RefObject<HTMLInputElement>)?.current?.focus();
          }}
          className={`cursor-pointer border-2 border-transparent rounded-full p-1 hover:border-red-400 text-red-400 transition ${
            isEmpty && "invisible"
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

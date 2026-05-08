'use client';

import { createContext, useContext } from 'react';

type AutocompleteContextValue = {
    query: string;
    setQuery: (q: string) => void;
    selectedLabel: string | null;
    selectItem: (value: string, label: string) => void;
    clearSelection: () => void;
    inputRef: React.RefObject<HTMLInputElement | null>;
};

export const AutocompleteContext =
    createContext<AutocompleteContextValue | null>(null);

export function useAutocomplete() {
    const ctx = useContext(AutocompleteContext);
    if (!ctx)
        throw new Error('useAutocomplete must be used inside <Autocomplete>');
    return ctx;
}

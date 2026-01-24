import React, {
    createContext,
    useContext,
    useEffect,
    useCallback,
    useState,
    useRef,
    ReactNode,
} from 'react';

import { readFileAsText } from './jsonTools.jsonContexts';

type SimpleFileDataContextType<T> = {
    data: T | null;
    setData: React.Dispatch<React.SetStateAction<T | null>>;
    file: File | null;
    setFile: React.Dispatch<React.SetStateAction<File | null>>;
    clearFile: () => void;
    reset: () => void;
    loadFromText: (text: string) => void;
    isLoading: boolean;
    error: Error | null;
};

type CreateSimpleFileJsonContextOptions<T> = {
    displayName?: string;
    parse?: (text: string) => T;
    validate?: (value: unknown) => value is T;
    initialData?: T | null;
};

/**
 * Creates a simple context for loading and parsing JSON files.
 *
 * Features:
 * - File loading and parsing
 * - Validation
 * - Error handling
 * - Reset functionality
 *
 * @template T - The type of the parsed data
 *
 * @param options - Configuration options
 * @param options.displayName - Name for context (used in errors, default: 'FileJson')
 * @param options.parse - Custom parse function (default: JSON.parse)
 * @param options.validate - Validation function to verify parsed data
 * @param options.initialData - Initial data value (default: null)
 *
 * @returns Object containing provider and hook
 * @returns JsonProvider - Context provider component to wrap your app
 * @returns useFileJsonContext - Hook to access context values
 *
 * @example
 * interface UserData {
 *   name: string;
 *   age: number;
 * }
 *
 * const { JsonProvider, useFileJsonContext } = createSimpleFileJsonContext<UserData>({
 *   displayName: 'UserData',
 *   validate: (data): data is UserData => {
 *     return typeof data === 'object' &&
 *            data !== null &&
 *            'name' in data &&
 *            'age' in data;
 *   }
 * });
 */
function createSimpleFileJsonContext<T>(
    options: CreateSimpleFileJsonContextOptions<T> = {},
) {
    const {
        displayName = 'FileJson',
        parse,
        validate,
        initialData = null,
    } = options;

    const Context = createContext<SimpleFileDataContextType<T> | undefined>(
        undefined,
    );
    Context.displayName = `${displayName}Context`;

    function JsonProvider({ children }: { children: ReactNode }) {
        const [file, setFile] = useState<File | null>(null);
        const [data, setData] = useState<T | null>(initialData);
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState<Error | null>(null);

        const loadFromText = useCallback(
            (text: string) => {
                try {
                    setIsLoading(true);
                    setError(null);

                    const parsed = parse ? parse(text) : JSON.parse(text);

                    if (validate && !validate(parsed)) {
                        const validationError = new Error(
                            `${displayName}: parsed data failed validation.`,
                        );
                        setError(validationError);
                        setData(null);
                        return;
                    }

                    setData(parsed);
                } catch (err) {
                    const parseError = new Error(
                        `${displayName}: failed to parse content: ${
                            err instanceof Error ? err.message : String(err)
                        }`,
                    );
                    setError(parseError);
                    console.error(`${displayName}: invalid content`, err);
                    setData(null);
                } finally {
                    setIsLoading(false);
                }
            },
            [parse, validate, displayName],
        );

        useEffect(() => {
            if (!file) return;

            let cancelled = false;
            setIsLoading(true);
            setError(null);

            readFileAsText(file)
                .then((text) => {
                    if (cancelled) return;
                    loadFromText(text);
                })
                .catch((err) => {
                    if (cancelled) return;
                    const readError = new Error(
                        `${displayName}: failed to read file: ${
                            err instanceof Error ? err.message : String(err)
                        }`,
                    );
                    setError(readError);
                    console.error(`${displayName}: failed to read file`, err);
                    setData(null);
                    setIsLoading(false);
                });

            return () => {
                cancelled = true;
            };
        }, [file, loadFromText, displayName]);

        const clearFile = useCallback(() => {
            setFile(null);
            setData(null);
            setError(null);
        }, []);

        const reset = useCallback(() => {
            setFile(null);
            setData(initialData);
            setError(null);
            setIsLoading(false);
        }, [initialData]);

        const value: SimpleFileDataContextType<T> = {
            data,
            setData,
            file,
            setFile,
            clearFile,
            reset,
            loadFromText,
            isLoading,
            error,
        };

        return <Context.Provider value={value}>{children}</Context.Provider>;
    }
    JsonProvider.displayName = `${displayName}Provider`;

    function useFileJsonContext() {
        const context = useContext(Context);
        if (!context) {
            throw new Error(
                `use${displayName}Context must be used within a ${displayName}Provider`,
            );
        }
        return context;
    }

    return {
        JsonProvider,
        useFileJsonContext,
    };
}

createSimpleFileJsonContext.displayName = 'createSimpleFileJsonContext';

export {
    createSimpleFileJsonContext,
    type SimpleFileDataContextType,
    type CreateSimpleFileJsonContextOptions,
};

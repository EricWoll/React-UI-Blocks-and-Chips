import {
    createContext,
    ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from 'react';

import { readFileAsText } from './jsonTools.json';

type AdvancedFileDataContextType<T> = {
    data: T | null;
    setData: React.Dispatch<React.SetStateAction<T | null>>;
    file: File | null;
    setFile: React.Dispatch<React.SetStateAction<File | null>>;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    dataArray: T[];
    clearFile: () => void;
    reset: () => void;
    retry: () => void;
    saveToFile: (filename?: string) => void;
    loadFromText: (text: string) => void;
    isLoading: boolean;
    progress: number;
    error: Error | null;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
};

type CreateAdvancedFileJsonContextOptions<T> = {
    displayName?: string;
    parse?: (text: string) => T;
    validate?: (value: unknown) => value is T;
    transform?: (data: T) => T;
    initialData?: T | null;
    onSuccess?: (data: T) => void;
    onError?: (error: Error) => void;
    allowedExtensions?: string[];
    maxFileSize?: number;
    autoSaveDelay?: number;
    enableHistory?: boolean;
    maxHistorySize?: number;
};

/**
 * Creates an advanced context for managing JSON file data with full features.
 *
 * Features:
 * - File loading, parsing, and validation
 * - File type and size validation
 * - Transform function for data normalization
 * - Success/error callbacks
 * - Retry mechanism
 * - Save to file
 * - Loading progress tracking
 * - Multiple file batch processing
 * - Undo/redo with history
 * - Auto-save functionality
 *
 * @template T - The type of the parsed data
 *
 * @param options - Configuration options
 * @param options.displayName - Name for context (used in errors, default: 'FileJson')
 * @param options.parse - Custom parse function (default: JSON.parse)
 * @param options.validate - Validation function to verify parsed data
 * @param options.transform - Transform data after parsing and validation
 * @param options.initialData - Initial data value (default: null)
 * @param options.onSuccess - Callback when data successfully loads
 * @param options.onError - Callback when error occurs
 * @param options.allowedExtensions - Allowed file types (e.g., ['.json'])
 * @param options.maxFileSize - Maximum file size in bytes
 * @param options.autoSaveDelay - Auto-save delay in ms (0 = disabled, default: 0)
 * @param options.enableHistory - Enable undo/redo (default: false)
 * @param options.maxHistorySize - Max undo/redo history (default: 50)
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
 * const { JsonProvider, useFileJsonContext } = createAdvancedFileJsonContext<UserData>({
 *   displayName: 'UserData',
 *   validate: (data): data is UserData => {
 *     return typeof data === 'object' &&
 *            data !== null &&
 *            'name' in data &&
 *            'age' in data;
 *   },
 *   allowedExtensions: ['.json'],
 *   maxFileSize: 1024 * 1024, // 1MB
 *   enableHistory: true,
 *   autoSaveDelay: 3000,
 *   onSuccess: (data) => console.log('Loaded:', data),
 *   onError: (error) => console.error('Error:', error),
 * });
 */
function createAdvancedFileJsonContext<T>(
    options: CreateAdvancedFileJsonContextOptions<T> = {},
) {
    const {
        displayName = 'FileJson',
        parse,
        validate,
        transform,
        initialData = null,
        onSuccess,
        onError,
        allowedExtensions,
        maxFileSize,
        autoSaveDelay = 0,
        enableHistory = false,
        maxHistorySize = 50,
    } = options;

    const Context = createContext<AdvancedFileDataContextType<T> | undefined>(
        undefined,
    );
    Context.displayName = `${displayName}Context`;

    function JsonProvider({ children }: { children: ReactNode }) {
        const [file, setFile] = useState<File | null>(null);
        const [files, setFiles] = useState<File[]>([]);
        const [data, setData] = useState<T | null>(initialData);
        const [dataArray, setDataArray] = useState<T[]>([]);
        const [isLoading, setIsLoading] = useState(false);
        const [progress, setProgress] = useState(0);
        const [error, setError] = useState<Error | null>(null);

        const [history, setHistory] = useState<T[]>(
            initialData ? [initialData] : [],
        );
        const [historyIndex, setHistoryIndex] = useState(initialData ? 0 : -1);

        const autoSaveTimerRef = useRef<number | null>(null);

        const undo = useCallback(() => {
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setData(history[newIndex]);
            }
        }, [history, historyIndex]);

        const redo = useCallback(() => {
            if (historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setData(history[newIndex]);
            }
        }, [history, historyIndex]);

        const canUndo = enableHistory && historyIndex > 0;
        const canRedo = enableHistory && historyIndex < history.length - 1;

        // Add to history when data changes (if history enabled)
        useEffect(() => {
            if (!enableHistory || data === null) return;

            const isNavigatingHistory = history[historyIndex] === data;
            if (isNavigatingHistory) return;

            setHistory((prev) => {
                // Remove any future history if we're not at the end
                const newHistory = prev.slice(0, historyIndex + 1);
                newHistory.push(data);
                // Limit history size
                if (newHistory.length > maxHistorySize) {
                    newHistory.shift();
                    setHistoryIndex(newHistory.length - 1);
                    return newHistory;
                }
                setHistoryIndex(newHistory.length - 1);
                return newHistory;
            });
        }, [data, enableHistory, maxHistorySize, history, historyIndex]);

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
                        onError?.(validationError);
                        return;
                    }

                    const finalData = transform ? transform(parsed) : parsed;
                    setData(finalData);
                    onSuccess?.(finalData);
                } catch (err) {
                    const parseError = new Error(
                        `${displayName}: failed to parse content: ${
                            err instanceof Error ? err.message : String(err)
                        }`,
                    );
                    setError(parseError);
                    console.error(`${displayName}: invalid content`, err);
                    setData(null);
                    onError?.(parseError);
                } finally {
                    setIsLoading(false);
                }
            },
            [parse, validate, transform, displayName, onSuccess, onError],
        );

        const validateFile = useCallback(
            (fileToValidate: File): Error | null => {
                if (allowedExtensions && allowedExtensions.length > 0) {
                    const ext =
                        '.' +
                        fileToValidate.name.split('.').pop()?.toLowerCase();
                    if (!allowedExtensions.includes(ext)) {
                        return new Error(
                            `${displayName}: Invalid file type. Expected ${allowedExtensions.join(', ')}`,
                        );
                    }
                }

                if (maxFileSize && fileToValidate.size > maxFileSize) {
                    const sizeMB = (maxFileSize / (1024 * 1024)).toFixed(2);
                    return new Error(
                        `${displayName}: File too large. Max size: ${sizeMB}MB`,
                    );
                }

                return null;
            },
            [allowedExtensions, maxFileSize, displayName],
        );

        // Handle single file loading
        useEffect(() => {
            if (!file) return;

            const validationError = validateFile(file);
            if (validationError) {
                setError(validationError);
                setData(null);
                onError?.(validationError);
                return;
            }

            let cancelled = false;
            setIsLoading(true);
            setError(null);
            setProgress(0);

            readFileAsText(file, setProgress)
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
                    onError?.(readError);
                })
                .finally(() => {
                    if (!cancelled) {
                        setProgress(100);
                    }
                });

            return () => {
                cancelled = true;
            };
        }, [file, loadFromText, displayName, validateFile, onError]);

        // Handle multiple files loading
        useEffect(() => {
            if (files.length === 0) {
                setDataArray([]);
                return;
            }

            let cancelled = false;
            setIsLoading(true);
            setError(null);

            const loadPromises = files.map(async (f) => {
                const validationError = validateFile(f);
                if (validationError) {
                    throw validationError;
                }

                const text = await readFileAsText(f);
                const parsed = parse ? parse(text) : JSON.parse(text);

                if (validate && !validate(parsed)) {
                    throw new Error(
                        `${displayName}: File ${f.name} failed validation.`,
                    );
                }

                return transform ? transform(parsed) : parsed;
            });

            Promise.all(loadPromises)
                .then((results) => {
                    if (cancelled) return;
                    setDataArray(results);
                    setIsLoading(false);
                })
                .catch((err) => {
                    if (cancelled) return;
                    const batchError = new Error(
                        `${displayName}: batch load failed: ${
                            err instanceof Error ? err.message : String(err)
                        }`,
                    );
                    setError(batchError);
                    setDataArray([]);
                    setIsLoading(false);
                    onError?.(batchError);
                });

            return () => {
                cancelled = true;
            };
        }, [
            files,
            parse,
            validate,
            transform,
            displayName,
            validateFile,
            onError,
        ]);

        const clearFile = useCallback(() => {
            setFile(null);
            setFiles([]);
            setData(null);
            setDataArray([]);
            setError(null);
            setProgress(0);
        }, []);

        const reset = useCallback(() => {
            setFile(null);
            setFiles([]);
            setData(initialData);
            setDataArray([]);
            setError(null);
            setIsLoading(false);
            setProgress(0);
            setHistory(initialData ? [initialData] : []);
            setHistoryIndex(initialData ? 0 : -1);
        }, [initialData]);

        const retry = useCallback(() => {
            if (file) {
                setError(null);
                setProgress(0);
                const tempFile = file;
                setFile(null);
                setTimeout(() => setFile(tempFile), 0);
            }
        }, [file]);

        const saveToFile = useCallback(
            (filename?: string) => {
                if (!data) return;

                const json = JSON.stringify(data, null, 2);
                const blob = new Blob([json], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename || file?.name || 'data.json';
                link.click();
                URL.revokeObjectURL(url);
            },
            [data, file],
        );

        // Auto-save functionality
        useEffect(() => {
            if (!autoSaveDelay || autoSaveDelay <= 0 || !data) return;

            if (autoSaveTimerRef.current !== null) {
                clearTimeout(autoSaveTimerRef.current);
            }

            autoSaveTimerRef.current = window.setTimeout(() => {
                saveToFile();
            }, autoSaveDelay);

            return () => {
                if (autoSaveTimerRef.current !== null) {
                    clearTimeout(autoSaveTimerRef.current);
                }
            };
        }, [data, autoSaveDelay, saveToFile]);

        const value: AdvancedFileDataContextType<T> = {
            data,
            setData,
            file,
            setFile,
            files,
            setFiles,
            dataArray,
            clearFile,
            reset,
            retry,
            saveToFile,
            loadFromText,
            isLoading,
            progress,
            error,
            undo,
            redo,
            canUndo,
            canRedo,
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
createAdvancedFileJsonContext.displayName = 'createAdvancedFileJsonContext';

export {
    createAdvancedFileJsonContext,
    type AdvancedFileDataContextType,
    type CreateAdvancedFileJsonContextOptions,
};

"use client";

/**
 * createSimpleFileJsonContext
 *
 * A factory for creating React contexts that load, parse, and validate JSON
 * files. Supports optional persistence via a pluggable adapter.
 *
 * Kept intentionally minimal — no history, no multi-file, no transform, no
 * callbacks. Use createAdvancedFileJsonContext for those.
 */

import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
    type ReactNode,
} from "react";

import {
    readFileAsText,
    FileReadError,
} from "@/lib/tools/json/readJsonFile.tools.json";
import {
    PersistenceError,
    type PersistenceAdapter,
} from "@/lib/tools/adapters/persistence.types";
import { FileJsonError } from "./jsonFileError.error";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

type SimpleFileDataContextType<T> = {
    data: T | null;
    /**
     * Use this instead of a raw state setter to update data.
     * Keeps the API intentional and consistent with the advanced context.
     */
    updateData: (data: T | null) => void;
    file: File | null;
    setFile: React.Dispatch<React.SetStateAction<File | null>>;
    /** Clears the file and resets data/error to null. */
    clearFile: () => void;
    /** Clears everything, restores initialData, and calls adapter.clear(). */
    reset: () => void;
    /** Parses and validates a raw JSON string without touching `file`. */
    loadFromText: (text: string) => void;
    /** Manually triggers adapter.save(data). No-op if no adapter or data is null. */
    save: () => Promise<void>;
    isLoading: boolean;
    isSaving: boolean;
    lastSavedAt: Date | null;
    error: FileJsonError | FileReadError | null;
    /** Separate from parse/read errors so consumers can handle them independently. */
    saveError: PersistenceError | null;
};

// ---------------------------------------------------------------------------
// Factory options
// ---------------------------------------------------------------------------

type CreateSimpleFileJsonContextOptions<T> = {
    /** Name used in error messages and React DevTools. Default: "FileJson". */
    displayName?: string;
    /**
     * Custom parse function. Defaults to `JSON.parse`.
     *
     * ⚠️  Must be stable (defined outside the component or wrapped in useMemo /
     * useCallback) — or the context factory stabilises it internally via a ref.
     * Either way is fine; just don't expect a new function reference to trigger
     * a re-parse.
     */
    parse?: (text: string) => T;
    /**
     * Type-guard that validates the parsed value.
     * Same stability note as `parse` above.
     */
    validate?: (value: unknown) => value is T;
    /** Value returned by `data` before any file is loaded and after `reset()`. */
    initialData?: T | null;
    /** Persistence adapter for save/load/clear. */
    persistenceAdapter?: PersistenceAdapter<T>;
    /**
     * If true and a persistenceAdapter is provided, calls adapter.load() on
     * mount and populates data if a non-null value is returned.
     * @default true
     */
    rehydrateOnMount?: boolean;
};

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createSimpleFileJsonContext<T>(
    options: CreateSimpleFileJsonContextOptions<T> = {},
) {
    const {
        displayName = "FileJson",
        parse,
        validate,
        initialData = null,
        persistenceAdapter,
        rehydrateOnMount = true,
    } = options;

    const Context = createContext<SimpleFileDataContextType<T> | undefined>(
        undefined,
    );
    Context.displayName = `${displayName}Context`;

    // -----------------------------------------------------------------------
    // Provider
    // -----------------------------------------------------------------------

    function JsonProvider({ children }: { children: ReactNode }) {
        const [file, setFile] = useState<File | null>(null);
        const [data, setData] = useState<T | null>(initialData);
        const [isLoading, setIsLoading] = useState(false);
        const [isSaving, setIsSaving] = useState(false);
        const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
        const [error, setError] = useState<
            FileJsonError | FileReadError | null
        >(null);
        const [saveError, setSaveError] = useState<PersistenceError | null>(
            null,
        );

        // Store caller-supplied values in refs so unstable references at the
        // call site don't cause dependency changes inside useCallback/useEffect.
        const parseRef = useRef(parse);
        const validateRef = useRef(validate);
        const initialDataRef = useRef(initialData);
        const adapterRef = useRef(persistenceAdapter);

        useEffect(() => {
            parseRef.current = parse;
        }, [parse]);
        useEffect(() => {
            validateRef.current = validate;
        }, [validate]);
        useEffect(() => {
            initialDataRef.current = initialData;
        }, [initialData]);
        useEffect(() => {
            adapterRef.current = persistenceAdapter;
        }, [persistenceAdapter]);

        // -------------------------------------------------------------------
        // updateData — public replacement for raw setData
        // -------------------------------------------------------------------

        const updateData = useCallback((next: T | null) => {
            setData(next);
        }, []);

        // -------------------------------------------------------------------
        // loadFromText — synchronous parse + validate path, loading-state-agnostic
        // -------------------------------------------------------------------

        const loadFromText = useCallback(
            (text: string) => {
                setError(null);
                setData(null);

                try {
                    const parsed: T = parseRef.current
                        ? parseRef.current(text)
                        : JSON.parse(text);

                    if (validateRef.current && !validateRef.current(parsed)) {
                        throw new FileJsonError(
                            "validation",
                            `${displayName}: parsed data failed validation.`,
                        );
                    }

                    setData(parsed);
                } catch (err) {
                    const wrapped =
                        err instanceof FileJsonError
                            ? err
                            : new FileJsonError(
                                  "parse",
                                  `${displayName}: failed to parse content: ${
                                      err instanceof Error
                                          ? err.message
                                          : String(err)
                                  }`,
                                  err,
                              );
                    setError(wrapped);
                    console.error(`${displayName}: invalid content`, wrapped);
                }
            },
            [displayName],
        );

        // -------------------------------------------------------------------
        // File-reading effect
        // -------------------------------------------------------------------

        useEffect(() => {
            if (!file) return;

            const abortController = new AbortController();
            setIsLoading(true);
            setError(null);

            readFileAsText(file, { signal: abortController.signal })
                .then((text) => {
                    loadFromText(text);
                })
                .catch((err) => {
                    if (err instanceof FileReadError && err.kind === "abort")
                        return;

                    const wrapped =
                        err instanceof FileReadError
                            ? err
                            : new FileJsonError(
                                  "read",
                                  `${displayName}: failed to read file: ${
                                      err instanceof Error
                                          ? err.message
                                          : String(err)
                                  }`,
                                  err,
                              );
                    setError(wrapped as FileJsonError | FileReadError);
                    setData(null);
                    console.error(
                        `${displayName}: failed to read file`,
                        wrapped,
                    );
                })
                .finally(() => {
                    if (!abortController.signal.aborted) setIsLoading(false);
                });

            return () => {
                abortController.abort();
                setIsLoading(false);
            };
        }, [file, loadFromText, displayName]);

        // -------------------------------------------------------------------
        // Persistence: rehydrate on mount
        // -------------------------------------------------------------------

        useEffect(() => {
            if (!persistenceAdapter || !rehydrateOnMount) return;

            let cancelled = false;

            persistenceAdapter
                .load()
                .then((loaded) => {
                    if (cancelled || loaded === null) return;
                    setData(loaded);
                })
                .catch((err) => {
                    if (cancelled) return;
                    const wrapped =
                        err instanceof PersistenceError
                            ? err
                            : new PersistenceError(
                                  "load_failed",
                                  "unknown",
                                  `${displayName}: rehydration failed: ${
                                      err instanceof Error
                                          ? err.message
                                          : String(err)
                                  }`,
                                  err,
                              );
                    setSaveError(wrapped);
                    console.error(
                        `${displayName}: rehydration failed`,
                        wrapped,
                    );
                });

            return () => {
                cancelled = true;
            };
            // Run once on mount — adapter identity intentionally excluded from deps.
            // The ref handles updates; re-rehydrating on re-renders would be wrong.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        // -------------------------------------------------------------------
        // Persistence: save
        // -------------------------------------------------------------------

        const save = useCallback(async () => {
            const adapter = adapterRef.current;
            if (!adapter || data === null) return;

            setSaveError(null);
            setIsSaving(true);

            try {
                await adapter.save(data);
                setLastSavedAt(new Date());
            } catch (err) {
                const wrapped =
                    err instanceof PersistenceError
                        ? err
                        : new PersistenceError(
                              "save_failed",
                              "unknown",
                              `${displayName}: save failed: ${
                                  err instanceof Error
                                      ? err.message
                                      : String(err)
                              }`,
                              err,
                          );
                setSaveError(wrapped);
                console.error(`${displayName}: save failed`, wrapped);
            } finally {
                setIsSaving(false);
            }
        }, [data, displayName]);

        // -------------------------------------------------------------------
        // Helpers
        // -------------------------------------------------------------------

        const clearFile = useCallback(() => {
            setFile(null);
            setData(null);
            setError(null);
            setIsLoading(false);
        }, []);

        const reset = useCallback(() => {
            setFile(null);
            setData(initialDataRef.current ?? null);
            setError(null);
            setSaveError(null);
            setIsLoading(false);
            setIsSaving(false);
            setLastSavedAt(null);
            // Best-effort clear — don't let a clear failure block the reset
            adapterRef.current?.clear().catch((err) => {
                console.error(
                    `${displayName}: adapter clear failed during reset`,
                    err,
                );
            });
        }, [displayName]);

        // -------------------------------------------------------------------
        // Context value
        // -------------------------------------------------------------------

        const value: SimpleFileDataContextType<T> = useMemo(
            () => ({
                data,
                updateData,
                file,
                setFile,
                clearFile,
                reset,
                loadFromText,
                save,
                isLoading,
                isSaving,
                lastSavedAt,
                error,
                saveError,
            }),
            [
                data,
                updateData,
                file,
                clearFile,
                reset,
                loadFromText,
                save,
                isLoading,
                isSaving,
                lastSavedAt,
                error,
                saveError,
            ],
        );

        return <Context.Provider value={value}>{children}</Context.Provider>;
    }
    JsonProvider.displayName = `${displayName}Provider`;

    // -----------------------------------------------------------------------
    // Hook
    // -----------------------------------------------------------------------

    function useFileJsonContext() {
        const context = useContext(Context);
        if (!context) {
            throw new Error(
                `use${displayName}Context must be used within a ${displayName}Provider`,
            );
        }
        return context;
    }

    return { JsonProvider, useFileJsonContext };
}

createSimpleFileJsonContext.displayName = "createSimpleFileJsonContext";

export {
    createSimpleFileJsonContext,
    type SimpleFileDataContextType,
    type CreateSimpleFileJsonContextOptions,
};

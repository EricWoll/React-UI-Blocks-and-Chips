"use client";

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
import { FileJsonError } from "./jsonFileError.error";
import {
    PersistenceError,
    type PersistenceAdapter,
} from "@/lib/tools/adapters/persistence.types";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

type AdvancedFileDataContextType<T> = {
    data: T | null;
    /**
     * Use this instead of the raw setData to ensure history is tracked.
     * Raw setData is intentionally not exposed.
     */
    updateData: (data: T | null) => void;
    file: File | null;
    setFile: React.Dispatch<React.SetStateAction<File | null>>;
    files: File[];
    setFiles: React.Dispatch<React.SetStateAction<File[]>>;
    dataArray: T[];
    clearFile: () => void;
    reset: () => void;
    retry: () => void;
    /** Manually trigger a save via the configured persistence adapter. No-op if none. */
    save: () => Promise<void>;
    loadFromText: (text: string) => void;
    isLoading: boolean;
    isSaving: boolean;
    lastSavedAt: Date | null;
    progress: number;
    error: FileJsonError | FileReadError | null;
    saveError: PersistenceError | null;
    undo: () => void;
    redo: () => void;
    canUndo: boolean;
    canRedo: boolean;
};

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

type CreateAdvancedFileJsonContextOptions<T> = {
    displayName?: string;
    parse?: (text: string) => T;
    validate?: (value: unknown) => value is T;
    transform?: (data: T) => T;
    initialData?: T | null;
    onSuccess?: (data: T) => void;
    onError?: (error: FileJsonError | FileReadError) => void;
    allowedExtensions?: string[];
    maxFileSize?: number;
    autoSaveDelay?: number;
    enableHistory?: boolean;
    maxHistorySize?: number;
    /** Persistence adapter for save/load/clear. */
    persistenceAdapter?: PersistenceAdapter<T>;
    /**
     * If true and persistenceAdapter is provided, calls adapter.load() on
     * mount and populates data if a non-null value is returned.
     * @default true
     */
    rehydrateOnMount?: boolean;
};

// ---------------------------------------------------------------------------
// History helpers
// ---------------------------------------------------------------------------

type HistoryState<T> = {
    entries: T[];
    index: number;
};

function historyPush<T>(
    prev: HistoryState<T>,
    next: T,
    maxSize: number,
): HistoryState<T> {
    const entries = [...prev.entries.slice(0, prev.index + 1), next];
    if (entries.length > maxSize) entries.shift();
    return { entries, index: entries.length - 1 };
}

// ---------------------------------------------------------------------------
// Factory
// ---------------------------------------------------------------------------

function createAdvancedFileJsonContext<T>(
    options: CreateAdvancedFileJsonContextOptions<T> = {},
) {
    const {
        displayName = "FileJson",
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
        persistenceAdapter,
        rehydrateOnMount = true,
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
        const [isSaving, setIsSaving] = useState(false);
        const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
        const [progress, setProgress] = useState(0);
        const [error, setError] = useState<
            FileJsonError | FileReadError | null
        >(null);
        const [saveError, setSaveError] = useState<PersistenceError | null>(
            null,
        );
        const [retryCount, setRetryCount] = useState(0);

        const [historyState, setHistoryState] = useState<HistoryState<T>>(
            () => ({
                entries: initialData !== null ? [initialData] : [],
                index: initialData !== null ? 0 : -1,
            }),
        );

        // ------------------------------------------------------------------
        // Ref-stabilise all option callbacks
        // ------------------------------------------------------------------
        const parseRef = useRef(parse);
        const validateRef = useRef(validate);
        const transformRef = useRef(transform);
        const onSuccessRef = useRef(onSuccess);
        const onErrorRef = useRef(onError);
        const initialDataRef = useRef(initialData);
        const adapterRef = useRef(persistenceAdapter);

        useEffect(() => {
            parseRef.current = parse;
        }, [parse]);
        useEffect(() => {
            validateRef.current = validate;
        }, [validate]);
        useEffect(() => {
            transformRef.current = transform;
        }, [transform]);
        useEffect(() => {
            onSuccessRef.current = onSuccess;
        }, [onSuccess]);
        useEffect(() => {
            onErrorRef.current = onError;
        }, [onError]);
        useEffect(() => {
            initialDataRef.current = initialData;
        }, [initialData]);
        useEffect(() => {
            adapterRef.current = persistenceAdapter;
        }, [persistenceAdapter]);

        // ------------------------------------------------------------------
        // History
        // ------------------------------------------------------------------

        const pushToHistory = useCallback(
            (next: T) => {
                if (!enableHistory) return;
                setHistoryState((prev) =>
                    historyPush(prev, next, maxHistorySize),
                );
            },
            [enableHistory, maxHistorySize],
        );

        const undo = useCallback(() => {
            setHistoryState((prev) => {
                if (prev.index <= 0) return prev;
                const newIndex = prev.index - 1;
                setData(prev.entries[newIndex]);
                return { ...prev, index: newIndex };
            });
        }, []);

        const redo = useCallback(() => {
            setHistoryState((prev) => {
                if (prev.index >= prev.entries.length - 1) return prev;
                const newIndex = prev.index + 1;
                setData(prev.entries[newIndex]);
                return { ...prev, index: newIndex };
            });
        }, []);

        const canUndo = enableHistory && historyState.index > 0;
        const canRedo =
            enableHistory &&
            historyState.index < historyState.entries.length - 1;

        // ------------------------------------------------------------------
        // updateData — public replacement for raw setData.
        // Ensures history is always tracked for external edits.
        // ------------------------------------------------------------------

        const updateData = useCallback(
            (next: T | null) => {
                setData(next);
                if (next !== null) pushToHistory(next);
            },
            [pushToHistory],
        );

        // ------------------------------------------------------------------
        // Core parse pipeline — single source of truth
        // ------------------------------------------------------------------

        const parsePipeline = useCallback(
            (text: string): T => {
                let parsed: unknown;
                try {
                    parsed = parseRef.current
                        ? parseRef.current(text)
                        : JSON.parse(text);
                } catch (err) {
                    throw new FileJsonError(
                        "parse",
                        `${displayName}: failed to parse content: ${err instanceof Error ? err.message : String(err)}`,
                        err,
                    );
                }

                if (validateRef.current && !validateRef.current(parsed)) {
                    throw new FileJsonError(
                        "validation",
                        `${displayName}: parsed data failed validation.`,
                    );
                }

                return transformRef.current
                    ? transformRef.current(parsed as T)
                    : (parsed as T);
            },
            [displayName],
        );

        // ------------------------------------------------------------------
        // loadFromText — loading-state-agnostic, usable standalone
        // ------------------------------------------------------------------

        const loadFromText = useCallback(
            (text: string) => {
                setError(null);
                try {
                    const result = parsePipeline(text);
                    setData(result);
                    pushToHistory(result);
                    onSuccessRef.current?.(result);
                } catch (err) {
                    const wrapped =
                        err instanceof FileJsonError
                            ? err
                            : new FileJsonError("parse", String(err), err);
                    setError(wrapped);
                    setData(null);
                    console.error(
                        `${displayName}: loadFromText failed`,
                        wrapped,
                    );
                    onErrorRef.current?.(wrapped);
                }
            },
            [parsePipeline, pushToHistory, displayName],
        );

        // ------------------------------------------------------------------
        // File validation
        // ------------------------------------------------------------------

        const validateFile = useCallback(
            (f: File): FileJsonError | null => {
                if (allowedExtensions && allowedExtensions.length > 0) {
                    const ext =
                        "." + (f.name.split(".").pop()?.toLowerCase() ?? "");
                    if (!allowedExtensions.includes(ext)) {
                        return new FileJsonError(
                            "validation",
                            `${displayName}: invalid file type "${ext}". Expected: ${allowedExtensions.join(", ")}`,
                        );
                    }
                }
                if (maxFileSize !== undefined && f.size > maxFileSize) {
                    const sizeMB = (maxFileSize / (1024 * 1024)).toFixed(2);
                    return new FileJsonError(
                        "validation",
                        `${displayName}: "${f.name}" is too large. Max: ${sizeMB} MB`,
                    );
                }
                return null;
            },
            [allowedExtensions, maxFileSize, displayName],
        );

        // ------------------------------------------------------------------
        // Persistence: save
        // ------------------------------------------------------------------

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
                              `${displayName}: save failed: ${err instanceof Error ? err.message : String(err)}`,
                              err,
                          );
                setSaveError(wrapped);
                console.error(`${displayName}: save failed`, wrapped);
            } finally {
                setIsSaving(false);
            }
        }, [data, displayName]);

        // ------------------------------------------------------------------
        // Persistence: rehydrate on mount
        // ------------------------------------------------------------------

        useEffect(() => {
            if (!persistenceAdapter || !rehydrateOnMount) return;

            let cancelled = false;

            persistenceAdapter
                .load()
                .then((loaded) => {
                    if (cancelled || loaded === null) return;
                    setData(loaded);
                    pushToHistory(loaded);
                })
                .catch((err) => {
                    if (cancelled) return;
                    const wrapped =
                        err instanceof PersistenceError
                            ? err
                            : new PersistenceError(
                                  "load_failed",
                                  "unknown",
                                  `${displayName}: rehydration failed: ${err instanceof Error ? err.message : String(err)}`,
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
            // Run once on mount — adapter identity is intentionally not in deps.
            // The ref handles updates; we don't want to re-rehydrate on re-renders.
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, []);

        // ------------------------------------------------------------------
        // Single-file loading effect
        // ------------------------------------------------------------------

        useEffect(() => {
            if (!file) return;

            const fileError = validateFile(file);
            if (fileError) {
                setError(fileError);
                setData(null);
                onErrorRef.current?.(fileError);
                return;
            }

            const abortController = new AbortController();
            setIsLoading(true);
            setError(null);
            setProgress(0);

            readFileAsText(file, {
                signal: abortController.signal,
                onProgress: setProgress,
            })
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
                                  `${displayName}: failed to read "${file.name}": ${err instanceof Error ? err.message : String(err)}`,
                                  err,
                              );
                    setError(wrapped as FileJsonError | FileReadError);
                    setData(null);
                    console.error(`${displayName}: file read failed`, wrapped);
                    onErrorRef.current?.(
                        wrapped as FileJsonError | FileReadError,
                    );
                })
                .finally(() => {
                    if (!abortController.signal.aborted) {
                        setIsLoading(false);
                        setProgress(100);
                    }
                });

            return () => {
                abortController.abort();
                setIsLoading(false);
            };
            // retryCount intentionally triggers re-runs for the retry() action
            // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [file, retryCount, loadFromText, validateFile]);

        // ------------------------------------------------------------------
        // Multi-file batch loading effect
        // ------------------------------------------------------------------

        useEffect(() => {
            if (files.length === 0) {
                setDataArray([]);
                return;
            }

            const abortController = new AbortController();
            setIsLoading(true);
            setError(null);

            const loadAll = async (): Promise<T[]> => {
                const results: T[] = [];
                for (const f of files) {
                    if (abortController.signal.aborted) return results;
                    const fileError = validateFile(f);
                    if (fileError) throw fileError;
                    const text = await readFileAsText(f, {
                        signal: abortController.signal,
                    });
                    results.push(parsePipeline(text));
                }
                return results;
            };

            loadAll()
                .then((results) => {
                    setDataArray(results);
                })
                .catch((err) => {
                    if (err instanceof FileReadError && err.kind === "abort")
                        return;
                    const wrapped =
                        err instanceof FileJsonError ||
                        err instanceof FileReadError
                            ? err
                            : new FileJsonError(
                                  "parse",
                                  `${displayName}: batch load failed: ${err instanceof Error ? err.message : String(err)}`,
                                  err,
                              );
                    setError(wrapped as FileJsonError | FileReadError);
                    setDataArray([]);
                    console.error(`${displayName}: batch load failed`, wrapped);
                    onErrorRef.current?.(
                        wrapped as FileJsonError | FileReadError,
                    );
                })
                .finally(() => {
                    if (!abortController.signal.aborted) setIsLoading(false);
                });

            return () => {
                abortController.abort();
                setIsLoading(false);
            };
        }, [files, validateFile, parsePipeline, displayName]);

        // ------------------------------------------------------------------
        // Auto-save via adapter
        // ------------------------------------------------------------------

        useEffect(() => {
            if (!autoSaveDelay || autoSaveDelay <= 0 || data === null) return;
            if (!adapterRef.current) return;

            const timer = window.setTimeout(() => save(), autoSaveDelay);
            return () => clearTimeout(timer);
        }, [data, autoSaveDelay, save]);

        // ------------------------------------------------------------------
        // Helpers
        // ------------------------------------------------------------------

        const clearFile = useCallback(() => {
            setFile(null);
            setFiles([]);
            setData(null);
            setDataArray([]);
            setError(null);
            setProgress(0);
            setIsLoading(false);
        }, []);

        const reset = useCallback(() => {
            const initial = initialDataRef.current ?? null;
            setFile(null);
            setFiles([]);
            setData(initial);
            setDataArray([]);
            setError(null);
            setSaveError(null);
            setIsLoading(false);
            setIsSaving(false);
            setProgress(0);
            setRetryCount(0);
            setLastSavedAt(null);
            setHistoryState({
                entries: initial !== null ? [initial] : [],
                index: initial !== null ? 0 : -1,
            });
            // Best-effort clear — don't let a clear failure block the reset
            adapterRef.current?.clear().catch((err) => {
                console.error(
                    `${displayName}: adapter clear failed during reset`,
                    err,
                );
            });
        }, [displayName]);

        const retry = useCallback(() => {
            if (!file) return;
            setError(null);
            setProgress(0);
            setRetryCount((n) => n + 1);
        }, [file]);

        // ------------------------------------------------------------------
        // Context value
        // ------------------------------------------------------------------

        const value: AdvancedFileDataContextType<T> = useMemo(
            () => ({
                data,
                updateData,
                file,
                setFile,
                files,
                setFiles,
                dataArray,
                clearFile,
                reset,
                retry,
                save,
                loadFromText,
                isLoading,
                isSaving,
                lastSavedAt,
                progress,
                error,
                saveError,
                undo,
                redo,
                canUndo,
                canRedo,
            }),
            [
                data,
                updateData,
                file,
                files,
                dataArray,
                clearFile,
                reset,
                retry,
                save,
                loadFromText,
                isLoading,
                isSaving,
                lastSavedAt,
                progress,
                error,
                saveError,
                undo,
                redo,
                canUndo,
                canRedo,
            ],
        );

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

    return { JsonProvider, useFileJsonContext };
}

createAdvancedFileJsonContext.displayName = "createAdvancedFileJsonContext";

export {
    createAdvancedFileJsonContext,
    type AdvancedFileDataContextType,
    type CreateAdvancedFileJsonContextOptions,
};

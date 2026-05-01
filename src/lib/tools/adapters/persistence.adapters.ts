/**
 * persistence.adapters.ts
 *
 * Three built-in persistence adapter factories:
 *  - createFilePersistenceAdapter    — triggers a browser file download
 *  - createIndexedDBPersistenceAdapter — reads/writes to IndexedDB
 *  - createApiPersistenceAdapter     — reads/writes to a REST API
 *
 * No React dependency. All adapters conform to PersistenceAdapter<T>.
 */

import {
    PersistenceError,
    type PersistenceAdapter,
    type FileAdapterOptions,
    type IndexedDBAdapterOptions,
    type ApiAdapterOptions,
} from "./persistence.types";

// ---------------------------------------------------------------------------
// Shared serialization helpers
// ---------------------------------------------------------------------------

function defaultSerialize<T>(data: T): string {
    return JSON.stringify(data, null, 2);
}

function defaultDeserialize<T>(raw: string): T {
    return JSON.parse(raw) as T;
}

// ---------------------------------------------------------------------------
// 1. File adapter
// ---------------------------------------------------------------------------

/**
 * Triggers a browser file-download on save(). load() always returns null
 * because reading an arbitrary local file requires user interaction.
 * clear() is a no-op.
 *
 * @example
 * const adapter = createFilePersistenceAdapter<MyData>({ filename: "export.json" });
 */
function createFilePersistenceAdapter<T>(
    options: FileAdapterOptions<T> = {},
): PersistenceAdapter<T> {
    const {
        filename = "data.json",
        serialize = defaultSerialize,
        // deserialize intentionally unused — load() returns null
    } = options;

    return {
        async save(data) {
            let serialized: string;
            try {
                serialized = serialize(data);
            } catch (err) {
                throw new PersistenceError(
                    "serialization_failed",
                    "file",
                    `File adapter: serialization failed: ${err instanceof Error ? err.message : String(err)}`,
                    err,
                );
            }

            try {
                const blob = new Blob([serialized], { type: "application/json" });
                const url = URL.createObjectURL(blob);
                const link = document.createElement("a");
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                // Revoke after a tick so the browser has time to initiate the download
                setTimeout(() => URL.revokeObjectURL(url), 100);
            } catch (err) {
                throw new PersistenceError(
                    "save_failed",
                    "file",
                    `File adapter: download failed: ${err instanceof Error ? err.message : String(err)}`,
                    err,
                );
            }
        },

        async load() {
            // Cannot read arbitrary files without user interaction
            return null;
        },

        async clear() {
            // No-op — there is nothing to clear from a file download
        },
    };
}

// ---------------------------------------------------------------------------
// 2. IndexedDB adapter
// ---------------------------------------------------------------------------

/**
 * Opens (or creates) an IndexedDB database and stores a single serialized
 * record. All three operations (save, load, clear) are fully supported.
 *
 * @example
 * const adapter = createIndexedDBPersistenceAdapter<MyData>({
 *   dbName: "my-app",
 *   storeName: "user-data",
 * });
 */
function createIndexedDBPersistenceAdapter<T>(
    options: IndexedDBAdapterOptions<T>,
): PersistenceAdapter<T> {
    const {
        dbName,
        storeName = "data",
        key = "current",
        version = 1,
        serialize = defaultSerialize,
        deserialize = defaultDeserialize,
    } = options;

    // Lazily opened — one shared promise so concurrent calls don't race
    let dbPromise: Promise<IDBDatabase> | null = null;

    function openDB(): Promise<IDBDatabase> {
        if (dbPromise) return dbPromise;

        dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
            const request = indexedDB.open(dbName, version);

            request.onupgradeneeded = () => {
                const db = request.result;
                if (!db.objectStoreNames.contains(storeName)) {
                    db.createObjectStore(storeName);
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => {
                dbPromise = null; // allow retry on next call
                reject(
                    new PersistenceError(
                        "load_failed",
                        "indexeddb",
                        `IndexedDB adapter: failed to open database "${dbName}": ${request.error?.message ?? "unknown"}`,
                        request.error,
                    ),
                );
            };
        });

        return dbPromise;
    }

    function idbRequest<V>(
        getRequest: (store: IDBObjectStore) => IDBRequest<V>,
        mode: IDBTransactionMode,
        errorKind: PersistenceError["kind"],
        errorMessage: string,
    ): Promise<V> {
        return openDB().then(
            (db) =>
                new Promise<V>((resolve, reject) => {
                    const tx = db.transaction(storeName, mode);
                    const store = tx.objectStore(storeName);
                    const req = getRequest(store);

                    req.onsuccess = () => resolve(req.result);
                    req.onerror = () =>
                        reject(
                            new PersistenceError(
                                errorKind,
                                "indexeddb",
                                errorMessage + `: ${req.error?.message ?? "unknown"}`,
                                req.error,
                            ),
                        );
                }),
        );
    }

    return {
        async save(data) {
            let serialized: string;
            try {
                serialized = serialize(data);
            } catch (err) {
                throw new PersistenceError(
                    "serialization_failed",
                    "indexeddb",
                    `IndexedDB adapter: serialization failed: ${err instanceof Error ? err.message : String(err)}`,
                    err,
                );
            }

            try {
                await idbRequest(
                    (store) => store.put(serialized, key),
                    "readwrite",
                    "save_failed",
                    `IndexedDB adapter: failed to save to "${dbName}/${storeName}"`,
                );
            } catch (err) {
                // Re-throw PersistenceErrors as-is; wrap anything else
                if (err instanceof PersistenceError) throw err;
                // Check for QuotaExceededError
                if (
                    err instanceof DOMException &&
                    (err.name === "QuotaExceededError" ||
                        err.name === "NS_ERROR_DOM_QUOTA_REACHED")
                ) {
                    throw new PersistenceError(
                        "quota_exceeded",
                        "indexeddb",
                        `IndexedDB adapter: storage quota exceeded for "${dbName}"`,
                        err,
                    );
                }
                throw err;
            }
        },

        async load() {
            const raw = await idbRequest<string | undefined>(
                (store) => store.get(key),
                "readonly",
                "load_failed",
                `IndexedDB adapter: failed to load from "${dbName}/${storeName}"`,
            );

            if (raw === undefined) return null;

            try {
                return deserialize(raw);
            } catch (err) {
                throw new PersistenceError(
                    "deserialization_failed",
                    "indexeddb",
                    `IndexedDB adapter: deserialization failed: ${err instanceof Error ? err.message : String(err)}`,
                    err,
                );
            }
        },

        async clear() {
            await idbRequest(
                (store) => store.delete(key),
                "readwrite",
                "clear_failed",
                `IndexedDB adapter: failed to clear "${dbName}/${storeName}"`,
            );
        },
    };
}

// ---------------------------------------------------------------------------
// 3. API adapter
// ---------------------------------------------------------------------------

/**
 * Persists data to a REST API. Fully configurable headers, serialization,
 * and deserialization. Handles 401 via `onUnauthorized` callback.
 *
 * @example
 * const adapter = createApiPersistenceAdapter<MyData>({
 *   saveUrl: "/api/user-data",
 *   loadUrl: "/api/user-data",
 *   clearUrl: "/api/user-data",
 *   headers: { Authorization: `Bearer ${token}` },
 * });
 */
function createApiPersistenceAdapter<T>(
    options: ApiAdapterOptions<T>,
): PersistenceAdapter<T> {
    const {
        saveUrl,
        loadUrl,
        clearUrl,
        method = "POST",
        headers = {},
        serialize,
        deserialize,
        onUnauthorized,
    } = options;

    async function request(
        url: string,
        fetchOptions: RequestInit,
        errorKind: PersistenceError["kind"],
    ): Promise<Response> {
        let response: Response;

        try {
            response = await fetch(url, {
                ...fetchOptions,
                headers: {
                    ...fetchOptions.headers,
                    ...headers,
                },
            });
        } catch (err) {
            throw new PersistenceError(
                errorKind,
                "api",
                `API adapter: network error for ${url}: ${err instanceof Error ? err.message : String(err)}`,
                err,
            );
        }

        if (response.status === 401) {
            onUnauthorized?.();
            throw new PersistenceError(
                "unauthorized",
                "api",
                `API adapter: unauthorized (401) for ${url}`,
            );
        }

        if (response.status === 404) {
            throw new PersistenceError(
                "not_found",
                "api",
                `API adapter: not found (404) for ${url}`,
            );
        }

        if (!response.ok) {
            throw new PersistenceError(
                errorKind,
                "api",
                `API adapter: request to ${url} failed with status ${response.status}`,
            );
        }

        return response;
    }

    return {
        async save(data) {
            let body: BodyInit;
            const saveHeaders: Record<string, string> = {};

            if (serialize) {
                try {
                    body = serialize(data);
                } catch (err) {
                    throw new PersistenceError(
                        "serialization_failed",
                        "api",
                        `API adapter: serialization failed: ${err instanceof Error ? err.message : String(err)}`,
                        err,
                    );
                }
            } else {
                try {
                    body = JSON.stringify(data);
                    saveHeaders["Content-Type"] = "application/json";
                } catch (err) {
                    throw new PersistenceError(
                        "serialization_failed",
                        "api",
                        `API adapter: JSON serialization failed: ${err instanceof Error ? err.message : String(err)}`,
                        err,
                    );
                }
            }

            await request(
                saveUrl,
                { method, body, headers: saveHeaders },
                "save_failed",
            );
        },

        async load() {
            if (!loadUrl) return null;

            let response: Response;
            try {
                response = await request(loadUrl, { method: "GET" }, "load_failed");
            } catch (err) {
                // 404 means nothing is saved yet — not an error worth surfacing
                if (
                    err instanceof PersistenceError &&
                    err.kind === "not_found"
                ) {
                    return null;
                }
                throw err;
            }

            try {
                return deserialize
                    ? await deserialize(response)
                    : ((await response.json()) as T);
            } catch (err) {
                throw new PersistenceError(
                    "deserialization_failed",
                    "api",
                    `API adapter: deserialization failed: ${err instanceof Error ? err.message : String(err)}`,
                    err,
                );
            }
        },

        async clear() {
            if (!clearUrl) return;
            await request(clearUrl, { method: "DELETE" }, "clear_failed");
        },
    };
}

export {
    createFilePersistenceAdapter,
    createIndexedDBPersistenceAdapter,
    createApiPersistenceAdapter,
};
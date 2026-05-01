/**
 * persistence.types.ts
 *
 * Shared interface and option types for all persistence adapters.
 * No React dependency — fully testable in isolation.
 */

// ---------------------------------------------------------------------------
// Core adapter interface
// ---------------------------------------------------------------------------

/**
 * A persistence adapter abstracts where and how data is saved and loaded.
 * Implement this interface to create custom adapters (e.g. Firebase, SQLite,
 * localStorage, S3 presigned URLs, etc.).
 *
 * All methods are async to accommodate both synchronous and network-bound
 * storage backends behind a uniform interface.
 */
type PersistenceAdapter<T> = {
    /**
     * Persist the current data.
     * Should throw a `PersistenceError` on failure.
     */
    save: (data: T) => Promise<void>;

    /**
     * Load previously persisted data.
     * Returns `null` if nothing is stored or the backend is write-only
     * (e.g. file download). Should throw a `PersistenceError` on failure.
     */
    load: () => Promise<T | null>;

    /**
     * Remove persisted data.
     * Should be a no-op (not throw) for write-only backends.
     */
    clear: () => Promise<void>;
};

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

type PersistenceErrorKind =
    | "save_failed"
    | "load_failed"
    | "clear_failed"
    | "serialization_failed"
    | "deserialization_failed"
    | "unauthorized"
    | "not_found"
    | "quota_exceeded";

class PersistenceError extends Error {
    readonly kind: PersistenceErrorKind;
    readonly adapter: string;

    constructor(
        kind: PersistenceErrorKind,
        adapter: string,
        message: string,
        cause?: unknown,
    ) {
        super(message, { cause });
        this.name = "PersistenceError";
        this.kind = kind;
        this.adapter = adapter;
    }
}

// ---------------------------------------------------------------------------
// Shared serialization options (reused across adapter option types)
// ---------------------------------------------------------------------------

type SerializationOptions<T> = {
    /**
     * Converts data to a string for storage.
     * @default JSON.stringify(data, null, 2)
     */
    serialize?: (data: T) => string;

    /**
     * Converts a stored string back to data.
     * @default JSON.parse(raw)
     */
    deserialize?: (raw: string) => T;
};

// ---------------------------------------------------------------------------
// Per-adapter option types (exported so consumers can type their config)
// ---------------------------------------------------------------------------

type FileAdapterOptions<T> = SerializationOptions<T> & {
    /** Default filename for the download. Can be overridden at save() call time. */
    filename?: string;
};

type IndexedDBAdapterOptions<T> = SerializationOptions<T> & {
    /** IDBDatabase name. Required. */
    dbName: string;
    /** Object store name. Default: "data" */
    storeName?: string;
    /** Key used to store the single record. Default: "current" */
    key?: IDBValidKey;
    /** Schema version. Increment when changing storeName. Default: 1 */
    version?: number;
};

type ApiAdapterOptions<T> = {
    /**
     * Endpoint for saving. Required.
     * Receives a POST (or `method`) request with the serialized body.
     */
    saveUrl: string;
    /**
     * Endpoint for loading. If omitted, load() returns null.
     * Receives a GET request.
     */
    loadUrl?: string;
    /**
     * Endpoint for clearing. If omitted, clear() is a no-op.
     * Receives a DELETE request.
     */
    clearUrl?: string;

    /** HTTP method for save requests. Default: "POST" */
    method?: string;

    /** Static headers merged into every request. */
    headers?: Record<string, string>;

    /**
     * Converts data to a fetch BodyInit for the save request.
     * @default (data) => JSON.stringify(data)  with Content-Type: application/json
     */
    serialize?: (data: T) => BodyInit;

    /**
     * Converts the load Response to data.
     * @default (res) => res.json()
     */
    deserialize?: (response: Response) => Promise<T>;

    /**
     * Called when the server returns a 401. Use to redirect to login,
     * refresh a token, etc.
     */
    onUnauthorized?: () => void;
};

export {
    PersistenceError,
    type PersistenceAdapter,
    type PersistenceErrorKind,
    type SerializationOptions,
    type FileAdapterOptions,
    type IndexedDBAdapterOptions,
    type ApiAdapterOptions,
};
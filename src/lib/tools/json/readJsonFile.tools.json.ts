/**
 * Reads a File object as text with optional encoding and progress tracking.
 *
 * Fixed / added vs. previous version:
 * 1. `reader.onload` blindly cast `event.target.result` to string — if
 *    `readAsText` somehow yields a null result (e.g. empty file edge cases on
 *    some browsers) or the target is null, you'd silently resolve with "".
 *    Now rejects with a typed error instead of swallowing it.
 * 2. `reader.onerror` passed the raw ProgressEvent to reject — that is NOT an
 *    Error. Consumers catching `err instanceof Error` would always get false.
 *    Now rejects with a real `FileReadError`.
 * 3. No abort support — if the caller no longer cares (component unmounted,
 *    user cancelled), there was no way to stop the read. Added `signal` option.
 * 4. No encoding support — FileReader.readAsText accepts an optional encoding
 *    argument. Hardcoding UTF-8 implicitly is fine for 99 % of cases, but the
 *    option should at least exist.
 * 5. No file-size guard — trying to read a 2 GB file into a string is a great
 *    way to crash a tab. Added `maxBytes` option.
 * 6. `onProgress` was only wired if provided but never cleaned up — fine since
 *    FileReader doesn't accumulate listeners, but the pattern was inconsistent.
 * 7. `displayName` on a plain function is a React-ism that makes no sense here.
 *    Removed.
 */

// ---------------------------------------------------------------------------
// Error type
// ---------------------------------------------------------------------------

type FileReadErrorKind = "abort" | "size_exceeded" | "read_failed" | "no_result";

class FileReadError extends Error {
    readonly kind: FileReadErrorKind;
    readonly file: File;

    constructor(kind: FileReadErrorKind, message: string, file: File, cause?: unknown) {
        super(message, { cause });
        this.name = "FileReadError";
        this.kind = kind;
        this.file = file;
    }
}

// ---------------------------------------------------------------------------
// Options
// ---------------------------------------------------------------------------

type ReadFileAsTextOptions = {
    /**
     * Character encoding passed to `FileReader.readAsText`.
     * @default "utf-8"
     */
    encoding?: string;
    /**
     * Maximum allowed file size in bytes. Rejects with `FileReadError` of kind
     * `"size_exceeded"` before even starting the read.
     * @default undefined (no limit)
     */
    maxBytes?: number;
    /**
     * Progress callback. Receives a value between 0–100.
     * Only fires when the browser reports a computable length.
     */
    onProgress?: (percent: number) => void;
    /**
     * Abort signal. When aborted, the FileReader is aborted and the promise
     * rejects with a `FileReadError` of kind `"abort"`.
     */
    signal?: AbortSignal;
};

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

function readFileAsText(
    file: File,
    options: ReadFileAsTextOptions = {},
): Promise<string> {
    const {
        encoding = "utf-8",
        maxBytes,
        onProgress,
        signal,
    } = options;

    return new Promise<string>((resolve, reject) => {
        // -- Size guard -------------------------------------------------------
        if (maxBytes !== undefined && file.size > maxBytes) {
            reject(
                new FileReadError(
                    "size_exceeded",
                    `File "${file.name}" is ${file.size} bytes, which exceeds the ${maxBytes}-byte limit.`,
                    file,
                ),
            );
            return;
        }

        // -- Early abort check ------------------------------------------------
        if (signal?.aborted) {
            reject(
                new FileReadError(
                    "abort",
                    `Read of "${file.name}" was aborted before it started.`,
                    file,
                ),
            );
            return;
        }

        const reader = new FileReader();

        // -- Abort wiring -----------------------------------------------------
        const onAbort = () => {
            reader.abort();
            reject(
                new FileReadError(
                    "abort",
                    `Read of "${file.name}" was aborted.`,
                    file,
                ),
            );
        };

        signal?.addEventListener("abort", onAbort, { once: true });

        const cleanup = () => {
            signal?.removeEventListener("abort", onAbort);
        };

        // -- Handlers ---------------------------------------------------------
        reader.onprogress = (event) => {
            if (onProgress && event.lengthComputable) {
                onProgress((event.loaded / event.total) * 100);
            }
        };

        reader.onload = (event) => {
            cleanup();

            const result = event.target?.result;

            if (typeof result !== "string") {
                reject(
                    new FileReadError(
                        "no_result",
                        `Reading "${file.name}" produced no result. The file may be unreadable.`,
                        file,
                    ),
                );
                return;
            }

            resolve(result);
        };

        reader.onabort = () => {
            // Covered by the signal handler above; this guards manual .abort()
            // calls if the consumer holds a ref to the reader in future.
            cleanup();
        };

        reader.onerror = () => {
            cleanup();
            reject(
                new FileReadError(
                    "read_failed",
                    `FileReader failed to read "${file.name}": ${reader.error?.message ?? "unknown error"}`,
                    file,
                    reader.error ?? undefined,
                ),
            );
        };

        // -- Start ------------------------------------------------------------
        reader.readAsText(file, encoding);
    });
}

export { readFileAsText, FileReadError };
export type { ReadFileAsTextOptions, FileReadErrorKind };
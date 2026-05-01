/**
 * useFileInput
 *
 * Companion hook for createAdvancedFileJsonContext (and createSimpleFileJsonContext).
 * Handles the file input and drag-and-drop surface so every project doesn't
 * reimplement the same broken <input type="file"> boilerplate.
 *
 * Features:
 *  - Returns inputProps to spread onto <input type="file">
 *  - Resets the input value so selecting the same file twice re-triggers onChange
 *  - Drag-and-drop with isDragging state
 *  - Extension and size validation at the drag-over stage (visual feedback before drop)
 *  - Multiple file support
 *  - Enforces allowedExtensions and maxFileSize before calling back
 *  - Returns dropZoneProps to spread onto any container element
 */

import { useCallback, useRef, useState } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FileInputError = {
    kind: "invalid_type" | "too_large" | "no_files";
    message: string;
    file?: File;
};

type UseFileInputOptions = {
    /** Called with a single file when multiple is false (default). */
    onFile?: (file: File) => void;
    /** Called with all files when multiple is true. */
    onFiles?: (files: File[]) => void;
    /** Lowercase extensions including the dot, e.g. [".json"]. */
    allowedExtensions?: string[];
    /** Maximum file size in bytes. */
    maxFileSize?: number;
    /** Allow selecting multiple files. Default: false. */
    multiple?: boolean;
    /** Called when a file fails extension or size validation. */
    onValidationError?: (error: FileInputError) => void;
};

type UseFileInputReturn = {
    /** Spread onto <input type="file"> */
    inputProps: {
        type: "file";
        ref: React.RefObject<HTMLInputElement | null>;
        accept: string | undefined;
        multiple: boolean;
        onChange: React.ChangeEventHandler<HTMLInputElement>;
        style: React.CSSProperties;
    };
    /** Spread onto any container element to make it a drop zone. */
    dropZoneProps: {
        onDragEnter: React.DragEventHandler;
        onDragOver: React.DragEventHandler;
        onDragLeave: React.DragEventHandler;
        onDrop: React.DragEventHandler;
    };
    /** True while a drag is active over the drop zone. */
    isDragging: boolean;
    /**
     * True while dragging but the dragged item fails extension/size validation.
     * Use this to render a "not allowed" visual state.
     */
    isDragInvalid: boolean;
    /** Programmatically open the file picker. */
    openFilePicker: () => void;
    /** Last validation error. Cleared on the next successful file selection. */
    validationError: FileInputError | null;
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function validateSingleFile(
    file: File,
    allowedExtensions?: string[],
    maxFileSize?: number,
): FileInputError | null {
    if (allowedExtensions && allowedExtensions.length > 0) {
        const ext = "." + (file.name.split(".").pop()?.toLowerCase() ?? "");
        if (!allowedExtensions.includes(ext)) {
            return {
                kind: "invalid_type",
                message: `Invalid file type "${ext}". Expected: ${allowedExtensions.join(", ")}`,
                file,
            };
        }
    }
    if (maxFileSize !== undefined && file.size > maxFileSize) {
        const sizeMB = (maxFileSize / (1024 * 1024)).toFixed(2);
        return {
            kind: "too_large",
            message: `"${file.name}" exceeds the ${sizeMB} MB size limit.`,
            file,
        };
    }
    return null;
}

function getFilesFromDataTransfer(dt: DataTransfer): File[] {
    // Prefer DataTransferItemList for type checking before the drop is committed
    if (dt.items) {
        return Array.from(dt.items)
            .filter((item) => item.kind === "file")
            .map((item) => item.getAsFile())
            .filter((f): f is File => f !== null);
    }
    return Array.from(dt.files);
}

/**
 * Checks drag items against allowed extensions without fully resolving the
 * files (which requires a drop). Returns false if any item clearly violates.
 */
function isDragValid(
    dt: DataTransfer,
    allowedExtensions?: string[],
): boolean {
    if (!allowedExtensions || allowedExtensions.length === 0) return true;
    if (!dt.items) return true; // can't inspect before drop in some browsers

    return Array.from(dt.items).every((item) => {
        if (item.kind !== "file") return false;
        // item.type is the MIME type, not extension — best effort
        // For .json specifically: application/json
        // Fall back to permissive if MIME is empty (common on Windows)
        if (!item.type) return true;
        return allowedExtensions.some(
            (ext) => item.type === extToMime(ext) || item.type === "",
        );
    });
}

function extToMime(ext: string): string {
    const map: Record<string, string> = {
        ".json": "application/json",
        ".txt": "text/plain",
        ".csv": "text/csv",
        ".xml": "application/xml",
        ".html": "text/html",
        ".md": "text/markdown",
    };
    return map[ext] ?? "";
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

function useFileInput(options: UseFileInputOptions = {}): UseFileInputReturn {
    const {
        onFile,
        onFiles,
        allowedExtensions,
        maxFileSize,
        multiple = false,
        onValidationError,
    } = options;

    const inputRef = useRef<HTMLInputElement>(null);
    const dragCounterRef = useRef(0); // tracks nested dragenter/dragleave pairs

    const [isDragging, setIsDragging] = useState(false);
    const [isDragInvalid, setIsDragInvalid] = useState(false);
    const [validationError, setValidationError] = useState<FileInputError | null>(null);

    const processFiles = useCallback((rawFiles: File[]) => {
        if (rawFiles.length === 0) {
            const err: FileInputError = { kind: "no_files", message: "No files were provided." };
            setValidationError(err);
            onValidationError?.(err);
            return;
        }

        const validated: File[] = [];

        for (const file of rawFiles) {
            const err = validateSingleFile(file, allowedExtensions, maxFileSize);
            if (err) {
                setValidationError(err);
                onValidationError?.(err);
                return; // fail fast — don't partially process a batch
            }
            validated.push(file);
        }

        setValidationError(null);

        if (multiple) {
            onFiles?.(validated);
        } else {
            onFile?.(validated[0]);
        }
    }, [allowedExtensions, maxFileSize, multiple, onFile, onFiles, onValidationError]);

    const handleChange = useCallback<React.ChangeEventHandler<HTMLInputElement>>(
        (e) => {
            const files = Array.from(e.target.files ?? []);
            processFiles(files);
            // Reset the input so selecting the same file again fires onChange
            if (inputRef.current) inputRef.current.value = "";
        },
        [processFiles],
    );

    const handleDragEnter = useCallback<React.DragEventHandler>((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current += 1;
        if (dragCounterRef.current === 1) {
            setIsDragging(true);
            setIsDragInvalid(!isDragValid(e.dataTransfer, allowedExtensions));
        }
    }, [allowedExtensions]);

    const handleDragOver = useCallback<React.DragEventHandler>((e) => {
        e.preventDefault();
        e.stopPropagation();
        // Required to allow drop
        e.dataTransfer.dropEffect = isDragInvalid ? "none" : "copy";
    }, [isDragInvalid]);

    const handleDragLeave = useCallback<React.DragEventHandler>((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current -= 1;
        if (dragCounterRef.current === 0) {
            setIsDragging(false);
            setIsDragInvalid(false);
        }
    }, []);

    const handleDrop = useCallback<React.DragEventHandler>((e) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounterRef.current = 0;
        setIsDragging(false);
        setIsDragInvalid(false);

        const files = getFilesFromDataTransfer(e.dataTransfer);
        processFiles(multiple ? files : files.slice(0, 1));
    }, [processFiles, multiple]);

    const openFilePicker = useCallback(() => {
        inputRef.current?.click();
    }, []);

    const accept = allowedExtensions?.join(",");

    return {
        inputProps: {
            type: "file",
            ref: inputRef,
            accept,
            multiple,
            onChange: handleChange,
            // Visually hidden — consumers position/style their own trigger element
            style: { display: "none" },
        },
        dropZoneProps: {
            onDragEnter: handleDragEnter,
            onDragOver: handleDragOver,
            onDragLeave: handleDragLeave,
            onDrop: handleDrop,
        },
        isDragging,
        isDragInvalid,
        openFilePicker,
        validationError,
    };
}

export { useFileInput, type UseFileInputOptions, type UseFileInputReturn, type FileInputError };
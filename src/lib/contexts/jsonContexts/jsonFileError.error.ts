type FileJsonErrorKind = "read" | "parse" | "validation";

class FileJsonError extends Error {
    readonly kind: FileJsonErrorKind;

    constructor(kind: FileJsonErrorKind, message: string, cause?: unknown) {
        super(message, { cause });
        this.name = "FileJsonError";
        this.kind = kind;
    }
}

export { FileJsonError, type FileJsonErrorKind };

/**
 * Reads a File object as text with optional progress tracking.
 */
function readFileAsText(
    file: File,
    onProgress?: (percent: number) => void,
): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        if (onProgress) {
            reader.onprogress = (event) => {
                if (event.lengthComputable) {
                    const percent = (event.loaded / event.total) * 100;
                    onProgress(percent);
                }
            };
        }

        reader.onload = (event) =>
            resolve((event.target?.result as string) ?? '');
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

readFileAsText.displayName = 'readFileAsText';

export { readFileAsText };

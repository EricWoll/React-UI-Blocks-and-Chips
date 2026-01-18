import React, {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    ReactNode,
} from 'react';

function readFileAsText(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (event) =>
            resolve((event.target?.result as string) ?? '');
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

type FileDataContextType<T> = {
    data: T | null;
    setData: React.Dispatch<React.SetStateAction<T | null>>;
    file: File | null;
    setFile: React.Dispatch<React.SetStateAction<File | null>>;
    clearFile: () => void;
    loadFromText: (text: string) => void;
    isLoading: boolean;
    error: Error | null;
};

type CreateFileJsonContextOptions<T> = {
    displayName?: string;
    parse?: (text: string) => T;
    validate?: (value: unknown) => value is T;
    initialData?: T | null;
};

function createFileJsonContext<T>(options: CreateFileJsonContextOptions<T>) {
    const {
        displayName = 'FileJson',
        parse,
        validate,
        initialData = null,
    } = options;

    const Context = createContext<FileDataContextType<T> | undefined>(
        undefined,
    );
    Context.displayName = `${displayName}Context`;

    function JsonProvider({ children }: { children: ReactNode }) {
        const [file, setFile] = useState<File | null>(null);
        const [data, setData] = useState<T | null>(initialData);
        const [isLoading, setIsLoading] = useState(false);
        const [error, setError] = useState<Error | null>(null);

        const loadFromText = useMemo(
            () => (text: string) => {
                try {
                    setIsLoading(true);
                    const parsed = parse ? parse(text) : JSON.parse(text);
                    if (validate && !validate(parsed)) {
                        setError(new Error('Data validation failed'));
                        throw new Error(
                            `${displayName}: parsed data failed validation.`,
                        );
                    }
                    setData(parsed);
                    setError(null);
                } catch (error) {
                    setError(
                        new Error(
                            `${displayName}: failed to parse file content: ${error instanceof Error ? error.message : String(error)}`,
                        ),
                    );
                    console.error(
                        `${displayName}: invalid file content`,
                        error,
                    );
                    setData(null);
                } finally {
                    setIsLoading(false);
                }
            },
            [parse, validate],
        );

        useEffect(() => {
            if (!file) return;
            let cancelled = false;

            readFileAsText(file)
                .then((text) => {
                    if (cancelled) return;
                    loadFromText(text);
                })
                .catch((error) => {
                    if (cancelled) return;
                    setError(error);
                    console.error(`${displayName}: failed to read file`, error);
                    setData(null);
                });

            return () => {
                cancelled = true;
            };
        }, [file, loadFromText]);

        const clearFile = () => {
            setFile(null);
            setData(null);
        };

        const value = {
            data,
            setData,
            file,
            setFile,
            clearFile,
            loadFromText,
            isLoading,
            error,
        };

        return <Context.Provider value={value}>{children}</Context.Provider>;
    }

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

createFileJsonContext.displaName = 'createFileJsonContext';
export { type FileDataContextType };
export default createFileJsonContext;

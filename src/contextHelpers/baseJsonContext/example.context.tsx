import createFileJsonContext from './baseJson.context';

interface iPersistentData {
    name: string;
    pager: string;
    ext: string;
}

function validatePersistentData(value: unknown): value is iPersistentData[] {
    return (
        Array.isArray(value) &&
        value.every(
            (item) =>
                typeof item === 'object' &&
                item !== null &&
                'name' in item &&
                'pager' in item &&
                'ext' in item &&
                typeof (item.name as any) === 'string' &&
                typeof (item.pager as any) === 'string' &&
                typeof (item.ext as any) === 'string',
        )
    );
}

const {
    JsonProvider: PersistentProvider,
    useFileJsonContext: usePersistentContext,
} = createFileJsonContext<iPersistentData[]>({
    displayName: 'PersistentJson',
    validate: validatePersistentData,
    // parse: is how context would parse your jsonData
    // initialData: is the initial data the context will set
});

export { type iPersistentData, PersistentProvider, usePersistentContext };

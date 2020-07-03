declare module 'db-migrate' {
    interface DataType {
        [key: string]: string;
    }

    export const dataType: DataType;
    export const version: string;

    interface DataMigrate {
        up(specification?: any, opts?: any, callback?: any): Promise<any>;
    }

    export function getInstance(
        plugins: any,
        isModule?: any,
        options?: any,
        callback?: Function | undefined | null
    ): DataMigrate;
}

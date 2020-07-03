import {} from 'winston';

declare module 'winston' {
    interface Logger {
        addFileWithName: Function | undefined;
        addFile: Function | undefined;
        useFileLogger: Function | undefined;
    }
}

import { Response } from 'express-serve-static-core';

declare module 'express-serve-static-core' {
    export interface Response {
        setResult(data: any): Response;
        setError(error: any): Response;
    }

    export interface Request {
        startTime: number;
    }
}

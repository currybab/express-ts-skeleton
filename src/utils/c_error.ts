/**
 * Error 클래스 wrapper
 * serverside error message가 클라이언트단으로 전송되는것 방지
 */
class CError {
    /**
     * 입력된 error wrapping
     * err이 string인 경우 -> new Error(err)로 wrapping, stack = null, status = 500으로 설정
     * err이 Error object인 경우 -> custom message 설정해줌
     */
    message: Optional<string>;
    responseMessage: Optional<string>;
    stack?: string;
    status?: string | number;

    static errorCodes: { INTERNAL_ERROR: string };

    constructor(err: Optional<string | Error | CError>, responseMessage: Optional<string> = null) {
        if (!err) {
            const error = new Error();
            this.message = CError.errorCodes.INTERNAL_ERROR;
            this.responseMessage = responseMessage || CError.errorCodes.INTERNAL_ERROR;
            this.stack = error.stack;
        } else if (typeof err == 'string') {
            const error = new Error();
            this.message = err;
            this.responseMessage = responseMessage || err;
            this.stack = error.stack;
        } else if (err instanceof Error) {
            this.message = err.message;
            this.responseMessage = responseMessage || CError.errorCodes.INTERNAL_ERROR;
            this.stack = err.stack;
            this.status = 500;
        } else if (err instanceof CError) {
            this.message = err.message;
            this.responseMessage = err.responseMessage || CError.errorCodes.INTERNAL_ERROR;
            this.stack = err.stack;
            this.status = err.status || 500;
        }
    }
}

CError.errorCodes = {
    INTERNAL_ERROR: 'INTERNAL ERROR',
};

export default CError;

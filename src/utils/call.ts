import logger from './logger';

const MAX_RETRY = 10;

function callProc(f: () => Promise<any>, retry: number, sleep: number): Promise<any> {
    return f()
        .then((res) => res)
        .catch((err) => {
            logger.error(err);
            if (retry < MAX_RETRY) {
                const ret = retry + 1;
                logger.error('request failed, retry(' + ret + ')');
                if (sleep <= 0) {
                    return callProc(f, ret, sleep);
                } else {
                    return new Promise((resolve) => {
                        setTimeout(() => {
                            resolve();
                        }, sleep);
                    }).then(() => {
                        return callProc(f, ret, sleep);
                    });
                }
            } else {
                throw err;
            }
        });
}

function call(f: () => Promise<any>, sleep: number = 0): Promise<any> {
    return callProc(f, 0, sleep);
}

export default call;

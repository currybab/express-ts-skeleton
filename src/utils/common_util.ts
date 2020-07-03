import * as express from 'express';
import * as circularJSON from 'circular-json';
import logger from './logger';

class CommonUtil {
    static doSequential(funcs: (() => void)[]): Promise<void> {
        return funcs.reduce(
            (acc, cur) =>
                acc.then(
                    () => cur(),
                    (err) => {
                        logger.error(err);
                        return cur();
                    }
                ),
            Promise.resolve()
        );
    }

    static stringify(obj: any): string {
        try {
            return JSON.stringify(obj);
        } catch (err) {
            return circularJSON.stringify(obj);
        }
    }

    static getIPAddress(req: express.Request): Optional<string> {
        const rgx = /\d+\.\d+\.\d+\.\d+/;
        const raw: Optional<string | string[]> =
            req.headers['X-Real-Ip'] ||
            req.headers['x-forwarded-for'] ||
            req.connection.remoteAddress;
        // console.log('x-real-ip', req.headers['x-real-ip']);
        // console.log('x-forwarded-for', req.headers['x-forwarded-for']);
        // console.log('remoteAddress', req.connection.remoteAddress);
        const matches = typeof raw === 'string' ? raw?.match(rgx) : null;
        if (matches) {
            return matches[0];
        } else {
            return null;
        }
    }
}

export default CommonUtil;

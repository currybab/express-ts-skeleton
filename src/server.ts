//src/index.ts
import * as express from 'express';
import * as cluster from 'cluster';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as cors from 'cors';
import * as onFinished from 'on-finished';
import * as colors from 'colors/safe';
import 'bluebird-global';

import basicRouter from './routes/index';
import logger from './utils/logger';
import CError from './utils/c_error';
import MySQL from './utils/database/mysql';
import Redis from './utils/database/redis';
import CacheStore from './utils/cache_stores/redis_cache_store';

import './utils/dotenv';

const penv = process.env;
MySQL.initialize(penv, 0, true);
Redis.initialize(penv);
CacheStore.initialize(cluster, penv);

const app = express();
const port = process.env.PORT;

// error handlers
function dumpError(err: CError): void {
    logger.error(err);
}

function printTimestamp(_error: Error | null, req: express.Request): void {
    const duration = new Date().getTime() - req.startTime;
    if (_error) {
        const error = new CError(_error);
        const url = req.protocol + '://' + req.get('host') + req.originalUrl;
        logger.error(
            colors.magenta(
                'Finished [' +
                    req.method +
                    '] ' +
                    url +
                    ` (${duration} ms)  with Error${error.status}`
            )
        );
    } else {
        const url = req.protocol + '://' + req.get('host') + req.originalUrl;
        logger.info(colors.magenta('Finished [' + req.method + '] ' + url + ` (${duration} ms) `));
    }
}

// global unhandled exception handler
process.on('uncaughtException', (error) => {
    logger.error('Unhandled Exception Occurred :');
    logger.error(error);
});

// global unhandled rejection handler
process.on('unhandledRejection', (reason, p) => {
    logger.error('Possibly Unhandled Rejection at: Promise ' + p + ' reason: ' + reason);
});

app.use(express.static('dist'));

// POST 페럼을 Json형태로 반환된, req.body 를 사용하면 json으로 반환됨
app.use(cookieParser());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// print request information
app.use((req, res, next) => {
    req.startTime = new Date().getTime();
    const url = req.protocol + '://' + req.get('host') + req.originalUrl;
    logger.info(colors.magenta('Started [' + req.method + '] ' + url));
    if (req.method == 'GET' && req.query) {
        logger.info('Query Parameters : ' + JSON.stringify(req.query));
    } else if (req.body) {
        const printData = JSON.parse(JSON.stringify(req.body));
        for (const k in printData) {
            if (k.indexOf('password') > -1) {
                printData[k] = '[FILTERED]';
            }
        }
        logger.info('Parameters : ' + JSON.stringify(printData).substr(0, 50));
    }

    onFinished(res, (err, _res) => {
        printTimestamp(err, req);
    });
    next(); // 페러미터를 넘기면 에러를 넘긴걸로 간주 됨.
});

app.use((req, res, next) => {
    res.setResult = (data: any): express.Response<any> => {
        return res.json({
            status: 'success',
            data: data,
        });
    };

    res.setError = (_err: any): express.Response<any> => {
        let err = _err;
        if (!(err instanceof CError)) {
            err = new CError(err);
        }
        const status = err.status || 400;
        dumpError(err);
        const message = err.responseMessage;
        return res.status(status).json({
            status: 'error',
            result_code: status,
            error_msg: message,
        });
    };
    next();
});

const corsOptions = {
    credentials: true,
    origin: (origin: any, callback: any): void => {
        // if (penv.NODE_ENV === 'staging' || penv.NODE_ENV === 'production') {
        //     // origin == undefined : native call
        //     if (
        //         !origin ||
        //         origin == 'null' ||
        //         origin.match(/https?:\/\/(?:.+\.)?mbga\.dev/) ||
        //         origin.match(/chrome-extension:\/\//)
        //     ) {
        //         callback(null, true);
        //     } else {
        //         const error = new CError('not allowed', `origin ${origin} is not allowed`);
        //         error.status = 403;
        //         callback(error);
        //     }
        // } else {
        // pass all
        callback(null, true);
        // }
    },
};
app.use(cors(corsOptions));

app.use('/api', basicRouter);

app.use((req, res) => {
    const err = new CError('NOT FOUND');
    err.status = 404;
    res.setError(err);
});

app.listen(port, () => {
    console.log(`Example app listening on port ${port}!`);
});

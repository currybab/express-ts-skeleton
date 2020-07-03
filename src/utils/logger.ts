import * as fs from 'fs';
import * as winston from 'winston';
import { format } from 'winston';
import * as colors from 'colors/safe';

const { combine, timestamp, printf, colorize } = format;

const logDir = process.env.LOG_DIR || 'logs';
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir);
}

const myFormat = printf((info) => {
    let message = info.message;
    if (info.level == 'error') {
        if (info.responseMessage) {
            message += ' (response message : ' + info.responseMessage + ')';
        }
        if (info.stack) {
            message += '\n' + info.stack;
        }
    }
    let fullMessage = `[#${process.pid}] ${info.timestamp} [${info.level}] ${message}`;
    if (info.level == 'error') {
        fullMessage = colors.red(fullMessage);
    }
    return fullMessage;
});

const getFilePath = function (file: string): string {
    if (file.indexOf('.log') === -1) file += '.log';
    file = `${logDir}/${file}`;
    return file;
};

export const createFileLogger = function (filename: string): winston.Logger {
    const logger = winston.createLogger({
        exitOnError: false,
        format: combine(timestamp(), myFormat),
        transports: [
            new winston.transports.File({
                filename: getFilePath(filename),
            }),
        ],
    });
    return logger;
};

const logger = winston.createLogger({
    exitOnError: false,
    format: combine(timestamp(), myFormat),
    transports: [new winston.transports.Console()],
});

logger.addFileWithName = function (filename: string): void {
    logger.add(
        new winston.transports.File({
            filename: getFilePath(filename),
        })
    );
};

logger.addFile = function (config: winston.transports.FileTransportOptions): void {
    logger.add(new winston.transports.File(config));
};

try {
    fs.renameSync(logDir + '/all-logs.log', logDir + '/prev-logs.log');
} catch (err) {}

logger.useFileLogger = function (): void {
    if (logger.addFileWithName) {
        logger.addFileWithName('all-logs');
    }
};

export default logger;

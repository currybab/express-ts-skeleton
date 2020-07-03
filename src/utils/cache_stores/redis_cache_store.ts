import CError from '../c_error';
import logger from '../logger';
import BaseStore from './base_store';
import Redis from '../database/redis';

/**
 * Redis cache store
 */
class RedisCacheStore extends BaseStore {
    static hget(_key: any, field: string): Promise<any> {
        const key: string = BaseStore.settings.KEY_PREFIX + _key;
        const start = new Date().getTime();
        logger.info('Search cache - ' + key + ', field - ' + field);
        return new Promise((resolve, reject) => {
            Redis.client.hget(key, field, (err, res) => {
                const end = new Date().getTime();
                const millis = end - start;
                if (err || !res) {
                    logger.info(
                        'Cache Miss - ' + key + ', field - ' + field + ' (' + millis + 'ms)'
                    );
                    reject(new CError(BaseStore.errorCodes.CACHE_MISS));
                } else {
                    logger.info(
                        'Cache Hit - ' + key + ', field - ' + field + ' (' + millis + 'ms)'
                    );
                    resolve(BaseStore.parse(res));
                }
            });
        });
    }

    static get(_key: any): Promise<any> {
        const key = BaseStore.settings.KEY_PREFIX + _key;
        const start = new Date().getTime();
        logger.info('Search cache - ' + key);
        return new Promise((resolve, reject) => {
            Redis.client.get(key, (err, res) => {
                const end = new Date().getTime();
                const millis = end - start;
                if (err || !res) {
                    logger.info('Cache Miss - ' + key + ' (' + millis + 'ms)');
                    reject(new CError(BaseStore.errorCodes.CACHE_MISS));
                } else {
                    logger.info('Cache Hit - ' + key + ' (' + millis + 'ms)');
                    resolve(BaseStore.parse(res));
                }
            });
        });
    }

    static mget(_keys: any[]): Promise<any[] | null> {
        const key = _keys.map((k) => BaseStore.settings.KEY_PREFIX + k);
        const start = new Date().getTime();
        logger.info('Search cache mget - ' + JSON.stringify(key).substr(0, 500));
        return new Promise((resolve, reject) => {
            Redis.client.mget(key, (err, res) => {
                const end = new Date().getTime();
                const millis = end - start;
                if (err || !res) {
                    logger.info(
                        'Cache Hit - (' +
                            key.length +
                            ') ' +
                            key.slice(0, 30) +
                            ' (' +
                            millis +
                            'ms)'
                    );
                    reject(new CError(BaseStore.errorCodes.CACHE_MISS));
                } else {
                    logger.info(
                        'Cache Hit - (' +
                            key.length +
                            ') ' +
                            key.slice(0, 30) +
                            ' (' +
                            millis +
                            'ms)'
                    );
                    resolve(BaseStore.parseArray(_keys.length, res));
                }
            });
        });
    }

    static hdel(_key: any, field: string): Promise<true> {
        const key = BaseStore.settings.KEY_PREFIX + _key;
        const start = new Date().getTime();
        logger.info('Delete cache - ' + key + ', field - ' + field);
        return new Promise((resolve, reject) => {
            Redis.client.hdel(key, field, (err, _res) => {
                const end = new Date().getTime();
                const millis = end - start;
                logger.info(
                    'Delete cache completed - ' + key + ', field - ' + field + ' (' + millis + 'ms)'
                );
                if (err) {
                    reject(new CError(BaseStore.errorCodes.DEL_ERROR));
                } else {
                    resolve(true);
                }
            });
        });
    }

    static del(_key: any): Promise<true> {
        const key = BaseStore.settings.KEY_PREFIX + _key;
        const start = new Date().getTime();
        logger.info('Delete cache - ' + key);
        return new Promise((resolve, reject) => {
            Redis.client.del(key, (err, _res) => {
                const end = new Date().getTime();
                const millis = end - start;
                logger.info('Delete cache completed - ' + key + ' (' + millis + 'ms)');
                if (err) {
                    reject(new CError(BaseStore.errorCodes.DEL_ERROR));
                } else {
                    resolve(true);
                }
            });
        });
    }

    // @important hset의 maxAge는 key단위로 적용됨
    static hset(_key: any, field: string, value: any, maxAge: number = 86400): Promise<any> {
        const key = BaseStore.settings.KEY_PREFIX + _key;
        const start = new Date().getTime();
        logger.info('Set Cache - ' + key + ', field - ' + field);
        return new Promise((resolve, reject) => {
            Redis.client.hset(key, field, BaseStore.stringify(value), (err, _res) => {
                if (err) {
                    reject(new CError(BaseStore.errorCodes.SET_ERROR));
                } else {
                    if (maxAge) {
                        Redis.client.expire(key, maxAge, (_err2, _res2) => {
                            const end = new Date().getTime();
                            const millis = end - start;
                            logger.info(
                                'Set cache completed - ' +
                                    key +
                                    ', field - ' +
                                    field +
                                    ' (' +
                                    millis +
                                    'ms)'
                            );
                            resolve(value);
                        });
                    } else {
                        const end = new Date().getTime();
                        const millis = end - start;
                        logger.info(
                            'Set cache completed - ' +
                                key +
                                ', field - ' +
                                field +
                                ' (' +
                                millis +
                                'ms)'
                        );
                        resolve(value);
                    }
                }
            });
        });
    }

    // maxAge : second
    static set(_key: any, value: any, maxAge: number = 86400): Promise<any> {
        const key = BaseStore.settings.KEY_PREFIX + _key;
        const start = new Date().getTime();
        logger.info('Set Cache - ' + key);
        return new Promise((resolve, reject) => {
            Redis.client.setex(key, maxAge, BaseStore.stringify(value), (err, _res) => {
                if (err) {
                    reject(new CError(BaseStore.errorCodes.SET_ERROR));
                } else {
                    const end = new Date().getTime();
                    const millis = end - start;
                    logger.info('Set cache completed - ' + key + ' (' + millis + 'ms)');
                    resolve(value);
                }
            });
        });
    }
}

export default RedisCacheStore;

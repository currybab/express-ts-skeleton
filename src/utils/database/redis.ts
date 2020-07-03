import * as redis from 'redis';
import logger from '../logger';

class Redis {
    static client: redis.RedisClient;

    static initialize(penv: NodeJS.ProcessEnv): void {
        if (Redis.client) {
            return;
        }

        const options: redis.ClientOpts = {
            host: penv.REDIS_HOST,
            port: Number(penv.REDIS_PORT ?? 6379),
            no_ready_check: true,
            retry_strategy: (retryOptions: any) => {
                if (retryOptions.total_retry_time > 1000 * 60 * 60) {
                    // End reconnecting after a specific timeout and flush all commands with an individual error
                    return new Error('Retry time exhausted');
                }
                if (
                    retryOptions.error &&
                    (retryOptions.error.code === 'ECONNREFUSED' ||
                        retryOptions.error.code === 'ECONNRESET')
                ) {
                    // Try reconnecting after 5 seconds
                    logger.error('The server refused the connection. Retrying connection...');
                    return 5000;
                }
                if (retryOptions.attempt > 50) {
                    // End reconnecting with built in error
                    return new Error('Retry attempt exhausted');
                }
                // reconnect after
                return Math.min(retryOptions.attempt * 100, 3000);
            },
        };

        if (penv.REDIS_PASS && penv.REDIS_PASS.length > 0) {
            options.auth_pass = penv.REDIS_PASS;
            options.password = penv.REDIS_PASS;
        }

        const client = redis.createClient(options);
        Redis.client = client;
        Redis.statusCheck();
    }

    static statusCheck(): void {
        Redis.client.ping((err, res) => {
            console.log('REDIS PING RESPONSE :', res);
        });
    }
}

export default Redis;

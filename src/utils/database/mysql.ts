import * as mysql from 'mysql';
import * as dbMigrate from 'db-migrate';
import * as colors from 'colors/safe';
import logger from '../logger';
import CError from '../c_error';

class MySQL {
    static poolCluster: mysql.PoolCluster;
    static debug: boolean = true;

    static createSchema(config: {
        host: string;
        user: string;
        password: string;
    }): Promise<boolean> {
        return new Promise((resolve, reject) => {
            const connection = mysql.createConnection({
                host: config.host,
                user: config.user,
                password: config.password,
            });

            connection.connect();
            connection.query(
                `
                    CREATE SCHEMA IF NOT EXISTS \`${process.env.DB_NAME}\` DEFAULT CHARACTER SET utf8; 
                `,
                (err, _res) => {
                    if (err) {
                        reject(err);
                    } else {
                        logger.info(colors.green('DATABASE INITIALIZED'));
                        resolve(true);
                    }
                }
            );
            connection.end();
        });
    }

    static dbMigrate(config: {
        connectionLimit: number;
        host: string;
        user: string;
        password: string;
        database: string;
        restoreNodeTimeout: number;
    }): Promise<any> {
        return MySQL.createSchema(config)
            .then(() => {
                const migrator = dbMigrate.getInstance(true);
                return migrator.up();
            })
            .catch((err) => {
                throw err;
            });
    }

    static initialize(
        penv: NodeJS.ProcessEnv,
        maxConnection: number = 0,
        shouldMigrate: boolean = false
    ): Promise<boolean> {
        // create pool cluster
        const poolCluster = mysql.createPoolCluster();

        const masterConfig = {
            connectionLimit: maxConnection || Number(penv.DB_CONN_LIMIT ?? 0),
            host: penv.DB_HOST ?? 'localhost',
            user: penv.DB_USER ?? 'root',
            password: penv.DB_PASS ?? '0000',
            database: penv.DB_NAME ?? 'test_db',
            restoreNodeTimeout: 5000,
        };

        const slave1Config = {
            connectionLimit: maxConnection || Number(penv.DB_CONN_LIMIT ?? 0),
            host: penv.SLAVE_DB_HOST ?? 'localhost',
            user: penv.SLAVE_DB_USER ?? 'root',
            password: penv.SLAVE_DB_PASS ?? '0000',
            database: penv.SLAVE_DB_NAME ?? 'test_db',
            restoreNodeTimeout: 5000,
        };

        poolCluster.add('MASTER', masterConfig);
        poolCluster.add('SLAVE1', slave1Config);
        MySQL.poolCluster = poolCluster;

        if (shouldMigrate) {
            return MySQL.dbMigrate(masterConfig).then(() => {
                MySQL.statusCheck();
                return true;
            });
        } else {
            return Promise.resolve(true).then(() => {
                MySQL.statusCheck();
                return true;
            });
        }
    }

    static statusCheck(): void {
        MySQL.executeQuery({ sql: 'SELECT 1+? AS res' }, [2], 'MASTER')
            .then((res) => {
                console.log(res, ' : MASTER OK');
            })
            .catch((err) => {
                console.log(err, ' : MASTER BAD');
            });
        MySQL.executeQuery({ sql: 'SELECT 1+? AS res' }, [3], 'SLAVE*')
            .then((res) => {
                console.log(res, ' : SLAVE OK');
            })
            .catch((err) => {
                console.log(err, ' : SLAVE BAD');
            });
    }

    // get escaped parameter value
    static escape(val: any): string {
        return mysql.escape(val);
    }

    /**
     * transaction
     * @param queries: [[sql1, [params1]], [sql2, [params2]], ..]
     */
    static transactionStep(
        connection: mysql.PoolConnection,
        index: number,
        queries: [[string, any]]
    ): Promise<any> {
        if (index >= queries.length) {
            return new Promise((resolve) => {
                resolve(true);
            });
        }

        const query = queries[index];
        return MySQL.executeQueryWithConnection(
            connection,
            {
                sql: query[0],
            },
            query[1]
        ).then(
            () => {
                return MySQL.transactionStep(connection, index + 1, queries);
            },
            (err) => {
                throw new CError(err);
            }
        );
    }

    static doTransaction(queries: [[string, any]]): Promise<unknown> {
        let connection: mysql.PoolConnection;
        return MySQL.beginTransaction()
            .then((_connection) => {
                connection = _connection;
                return MySQL.transactionStep(connection, 0, queries);
            })
            .then(() => {
                return MySQL.commit(connection);
            })
            .catch((err) => {
                if (connection) {
                    MySQL.rollback(connection);
                }
                throw new CError(err);
            });
    }

    // mysql beginTransaction promise wrapper
    // return : a connection
    static beginTransaction(): Promise<mysql.PoolConnection> {
        return new Promise((resolve, reject) => {
            MySQL.poolCluster.of('MASTER').getConnection((err, connection) => {
                if (err) {
                    reject(new CError(err));
                    return;
                }
                connection.beginTransaction((_err) => {
                    if (_err) {
                        reject(new CError(_err));
                        return;
                    }
                    connection.___startAt = new Date().getTime();
                    logger.info(colors.green('BEGIN Transaction'));
                    resolve(connection);
                });
            });
        });
    }

    // mysql commit promise wrapper
    static commit(connection: mysql.PoolConnection): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (!connection) {
                return resolve(true);
            }
            connection.commit((err) => {
                if (err) {
                    reject(new CError(err));
                    return;
                }
                logger.info(
                    colors.green(
                        'COMMIT Transaction - ' +
                            (connection.___startAt - new Date().getTime() + 'ms')
                    )
                );
                connection.release();
                return resolve(true);
            });
        });
    }

    // mysql rollback promise wrapper
    static rollback(connection: mysql.PoolConnection): Promise<boolean> {
        return new Promise((resolve) => {
            if (!connection) {
                resolve(true);
                return;
            }
            connection.rollback(() => {
                logger.info(colors.red('ROLLBACK Transaction'));
                connection.release();
                resolve(true);
            });
        });
    }

    static getPoolByQuery(_qry: string): mysql.Pool {
        // if(!qry || qry.toLowerCase().match(/truncate |alter |insert |update |drop |delete |replace |call |flush |lock |create |last_insert_id|found_rows|sql_calc_found_rows|row_count/)) {
        return MySQL.poolCluster.of('MASTER');
        // } else {
        //     return MySQL.poolCluster.of("SLAVE*");
        // }
    }

    /**
     * mysql.pool.query Promise wrapper
     */
    static executeQuery(
        option: {
            sql: string;
        },
        params: any,
        poolNS?: Optional<string>
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const startTime = new Date().getTime();
            const sql = option.sql;

            let pool: mysql.Pool;
            if (!poolNS) pool = MySQL.getPoolByQuery(sql);
            else pool = MySQL.poolCluster.of(poolNS);

            pool.query(option, params, (err, res) => {
                const endTime = new Date().getTime();
                MySQL.logQuery(option.sql, params);
                if (MySQL.debug)
                    logger.info(colors.green('execution time : ' + (endTime - startTime) + 'ms'));
                if (err) {
                    logger.error('Querying Error : ');
                    reject(new CError(err));
                    return;
                }

                resolve(res);
            });
        });
    }

    /**
     * mysql.connection.query Promise wrapper
     */
    static executeQueryWithConnection(
        connection: mysql.PoolConnection,
        option: mysql.QueryOptions,
        params: any
    ): Promise<any> {
        return new Promise((resolve, reject) => {
            const startTime: number = new Date().getTime();
            connection.query(option, params, (err, res) => {
                const endTime = new Date().getTime();
                MySQL.logQuery(option.sql, params);
                if (MySQL.debug)
                    logger.info(colors.green('execution time : ' + (endTime - startTime) + 'ms'));
                if (err) {
                    logger.error('Querying Error : ');
                    reject(new CError(err));
                    return;
                }
                resolve(res);
            });
        });
    }

    static logQuery(sql: string, params: [any]): void {
        if (!MySQL.debug) return;
        sql = sql.replace(/(\t+)|\n/g, ' ');
        const fullSql = mysql.format(sql, params);
        logger.info(colors.blue(fullSql.substr(0, 500)));
    }
}

export default MySQL;

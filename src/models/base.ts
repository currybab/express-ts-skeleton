import Redis from '../utils/database/redis';
import MySQL from '../utils/database/mysql';
import CError from '../utils/c_error';
import { PoolConnection } from 'mysql';

/**
 * 사용할 model들의 superclass
 */
class Base {
    static Redis: Redis = Redis;
    static MySQL: MySQL = MySQL;

    /**
     * escaped param 획득
     * parameter binding 하지 않고 직접 쿼리에 param embed 해야하는 경우 사용
     */
    static escape(val: any): string {
        return MySQL.escape(val);
    }

    /**
     * mysql executeQuery wrapper
     * @params connection: 사용할 connection 직접 명시
     * - transaction 사용하는 경우 connection param 입력할것
     *   transaciton 완료시 반드시 commit/rollback 호출할것 - (connection release)
     */
    static executeQuery(
        options: any,
        params: any,
        connection?: Optional<PoolConnection | string>
    ): Promise<any> {
        if (connection) {
            if (typeof connection === 'string') {
                return MySQL.executeQuery(options, params, connection);
            }
            return MySQL.executeQueryWithConnection(connection, options, params);
        } else {
            const sqlOption = options as { sql: string };
            return MySQL.executeQuery(sqlOption, params);
        }
    }

    /**
     * 고유성 검사
     * 특정 table에서 조건에 일치하는 row가 있는지 확인
     * -> 존재하면 고유하지 않음, throw duplicate error
     * -> 존재하지 않으면 고유함. resolve true
     */
    static _checkIsUniqueQuery(condition: string): string {
        let query = 'SELECT id FROM ?? ';
        query += 'WHERE ?? = ? ';
        if (condition) {
            query += `AND ${condition} `;
        }
        query += 'LIMIT 1';
        return query;
    }

    static checkIsUnique(
        table: string,
        column: string,
        value: any,
        condition: any = null,
        connection = null
    ): Promise<boolean> {
        return Base.executeQuery(
            {
                sql: Base._checkIsUniqueQuery(condition),
            },
            [table, column, value + ''],
            connection
        ).then((res) => {
            if (res.length == 0) {
                return true;
            } else {
                const error = new CError('DUPLICATE');
                error.status = 403;
                throw error;
            }
        });
    }

    /**
     * select count
     */
    static _getCountQuery(condition: any): string {
        let query = 'SELECT count(*) as count FROM ??';
        if (condition) {
            query += ' WHERE ' + condition;
        }
        return query;
    }

    static getCount(
        table: string,
        condition: any = null,
        connection: Optional<string | PoolConnection> = null
    ): Promise<number> {
        return Base.executeQuery(
            {
                sql: Base._getCountQuery(condition),
            },
            [table],
            connection
        ).then((res) => {
            return res[0].count;
        });
    }

    /**
     * check existence
     * 존재시 true, 존재하지 않을시 false return
     */
    static _checkExistenceQuery(condition: any): string {
        const query = `
			SELECT id FROM ??
			WHERE ${condition}
			LIMIT 1
		`;
        return query;
    }

    static checkExistence(table: string, condition: any, connection = null): Promise<boolean> {
        return Base.executeQuery(
            {
                sql: Base._checkExistenceQuery(condition),
            },
            [table],
            connection
        ).then((res) => {
            return res.length > 0;
        });
    }
}

export default Base;

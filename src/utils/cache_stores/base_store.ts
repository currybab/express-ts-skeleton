import CommonUtil from '../common_util';

class BaseStore {
    static settings: { KEY_PREFIX: string };
    static errorCodes: { CACHE_MISS: string; SET_ERROR: string; DEL_ERROR: string };

    static initialize(_cluster: any, _penv: any): void {
        // override if need
    }

    // set 전 stringify
    static stringify(value: any): string {
        if (value == null) return 'null';

        let valueToSave = value;
        if (typeof value == 'object') {
            valueToSave = CommonUtil.stringify(value);
        }
        return valueToSave;
    }

    // get 후 parse
    static parse(value: string): any {
        let valueToReturn = value;
        try {
            if (valueToReturn == 'null' || valueToReturn == 'undefined') {
                return null;
            }
            valueToReturn = JSON.parse(value);
        } catch (err) {
            // nothing to do
        }
        return valueToReturn;
    }

    // get 후 parse
    static parseArray(size: number, value: any): any[] | null {
        let valueToReturn: any = value;
        try {
            if (size == 1) {
                if (value == 'null' || value == 'undefined') return null;
                else {
                    try {
                        valueToReturn = [JSON.parse(value)];
                    } catch (e) {
                        valueToReturn = [value];
                    }
                }
            } else {
                valueToReturn = value.map((v: string) => {
                    if (v == 'null' || v == 'undefined') return null;
                    else {
                        try {
                            return JSON.parse(v);
                        } catch (e) {
                            return v;
                        }
                    }
                });
            }
        } catch (err) {
            console.log('parseArray error : ' + err);
            console.log('parseArray size : ' + size);
            console.log('parseArray value : ' + value);
            console.log('parseArray typeof : ' + typeof value);
        }
        return valueToReturn;
    }
}

BaseStore.settings = {
    KEY_PREFIX: 'c:',
};

BaseStore.errorCodes = {
    CACHE_MISS: 'CACHE_MISS',
    SET_ERROR: 'SET_ERROR',
    DEL_ERROR: 'DEL_ERROR',
};

export default BaseStore;

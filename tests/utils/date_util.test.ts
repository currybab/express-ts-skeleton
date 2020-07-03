import { expect } from 'chai';
import 'mocha';

import DateUtil from '../../src/utils/date_util';

describe('DateUtil test', () => {
    it('getDataDateString 1 day ago (12:00)', () => {
        const testDate = new Date(2020, 0, 1, 12);
        const result = DateUtil.getDataDateString(testDate);
        expect(result).to.equal('2019-12-31');
    });

    it('getDataDateString 2 day ago (10:00)', () => {
        const testDate = new Date(2020, 0, 1, 10);
        const result = DateUtil.getDataDateString(testDate);
        expect(result).to.equal('2019-12-30');
    });
});

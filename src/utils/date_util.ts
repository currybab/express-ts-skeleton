import * as dateformat from 'dateformat';

class DateUtil {
    static getOldDate(date1: Date, date2: Date): Date {
        if (!date1) return date2;
        if (!date2) return date1;

        if (date1 > date2) return date2;
        return date1;
    }

    // mysql에서 select한 date string -> timestamp(millis)
    static getTimestamp(dateString: string): number {
        if (dateString) return new Date(dateString).getTime();
        return 0;
    }

    // date -> YYYY-MM-DD hh:mm:ss
    static getDateTimeString(date: Optional<Date>): Optional<string> {
        if (!date) return null;
        return dateformat(date, 'yyyy-mm-dd HH:MM:ss');
    }

    static getDateString(date: Date): string {
        return dateformat(date, 'yyyy-mm-dd');
    }

    // api 호출 시점에 대한 데이터의 날짜
    static getDataDateString(apiCallDate?: Date, offset?: number): string {
        if (!offset) offset = 11;
        const date = apiCallDate ? new Date(apiCallDate) : new Date();
        date.setHours(date.getHours() - offset);
        date.setDate(date.getDate() - 1);
        return DateUtil.getDateString(date);
    }

    static getStartAndEndOfMonth(dateStr: string): string[] {
        const date = new Date(dateStr);
        date.setDate(1);
        const startDateStr = DateUtil.getDateString(date);
        date.setMonth(date.getMonth() + 1);
        date.setDate(date.getDate() - 1);
        const endDateStr = DateUtil.getDateString(date);
        return [startDateStr, endDateStr];
    }
}

export default DateUtil;

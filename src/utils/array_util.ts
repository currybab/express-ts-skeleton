class ArrayUtil {
    static getUnique(arr: any): any[] {
        if (Array.isArray(arr)) {
            return arr.filter((elem, pos, array) => {
                return array.indexOf(elem) == pos;
            });
        } else {
            return [arr];
        }
    }

    static getChunks(array: any[], chunkSize: number): any[] {
        return ([] as any[]).concat(
            [],
            ...array.map((elem, i) => {
                return i % chunkSize ? [] : [array.slice(i, i + chunkSize)];
            })
        );
    }
}

export default ArrayUtil;

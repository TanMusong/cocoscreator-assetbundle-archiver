

namespace ProcessUtils {

    export function getArg(key: string, check?: (value: string) => boolean): string | null {
        const index = process.argv.indexOf(key);
        if (index < 0) return null;
        const value = process.argv[index + 1];
        return check ? (check(value) ? value : null) : value;
    }

    export function haveArg(key: string): boolean {
        const index = process.argv.indexOf(key);
        return index >= 0;
    }

}

export default ProcessUtils;
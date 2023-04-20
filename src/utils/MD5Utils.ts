import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

namespace MD5Utils {

    export type FileMD5 = { path: string, md5: string };
    export type FileMD5CompareResult = { added: FileMD5[], deleted: FileMD5[], changed: FileMD5[], same: FileMD5[] }


    export function md5(text: string): string {
        const hash = crypto.createHash('md5');
        hash.update(text);
        const hex = hash.digest('hex');
        return hex;
    }

    export function md5Dir(fileOrDir: string, output?: MD5Utils.FileMD5[]): MD5Utils.FileMD5[] {
        output = output || [];
        if (!fs.existsSync(fileOrDir)) return output;
        const relativePath = fileOrDir;
        const md5 = (file: string): void => {
            const stat = fs.statSync(file);
            if (!stat.isDirectory()) {
                const buffer = fs.readFileSync(file);
                const hash = crypto.createHash('md5');
                hash.update(buffer);
                const hex = hash.digest('hex');
                output.push({ path: path.relative(relativePath, file), md5: hex });
            } else {
                const files = fs.readdirSync(file);
                files.forEach(item => md5(path.join(file, item)))
            }
        }
        md5(fileOrDir);
        return output;
    }

    export function md5Compare(source: MD5Utils.FileMD5[], target: MD5Utils.FileMD5[]): MD5Utils.FileMD5CompareResult {
        const result: MD5Utils.FileMD5CompareResult = { added: [], deleted: [], changed: [], same: [] };
        target = target.concat([]);
        source = source.concat([]);

        let sourceItem: MD5Utils.FileMD5 | undefined;
        while (sourceItem = source.shift()) {
            let matchItem: MD5Utils.FileMD5 | undefined = undefined;
            for (let j = 0, length = target.length; j < length; j++) {
                const targetItem = target[j];
                if (targetItem.path !== sourceItem.path) continue;
                matchItem = targetItem;
                target.splice(j, 1);
                break;
            }
            if (!matchItem) result.added.push(sourceItem);
            else matchItem.md5 === sourceItem.md5 ? result.same.push(sourceItem) : result.changed.push(sourceItem)
        }
        result.deleted.push(...target);
        return result;
    }
}

export default MD5Utils;
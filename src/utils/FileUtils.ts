import fs from 'fs';
import path from 'path';
import archiver from 'archiver';


namespace FileUtils {

    export function copy(srcFileOrDir: string, destFileOrDir: string): void {
        if (!fs.existsSync(srcFileOrDir)) return;
        const stat = fs.statSync(srcFileOrDir);
        if (stat.isDirectory()) {
            mkdir(destFileOrDir);
            const files = fs.readdirSync(srcFileOrDir);
            files.forEach(item => copy(path.join(srcFileOrDir, item), path.join(destFileOrDir, item)));
        } else {
            mkdir(path.dirname(destFileOrDir));
            fs.copyFileSync(srcFileOrDir, destFileOrDir);
        }
    }

    export function mkdir(dir: string): void {
        if (fs.existsSync(dir)) return;
        let parentDir = path.dirname(dir);
        mkdir(parentDir);
        fs.mkdirSync(dir);

    }

    export function rm(fileOrDir: string): void {
        if (!fs.existsSync(fileOrDir)) return;
        const stat = fs.statSync(fileOrDir);
        if (stat.isDirectory()) {
            const files = fs.readdirSync(fileOrDir);
            files.forEach(item => rm(path.join(fileOrDir, item)));
            fs.rmdirSync(fileOrDir);
        } else {
            fs.unlinkSync(fileOrDir);
        }

    }

    export function find(dir: string, nameOrRegExp: string | RegExp, deepFind: boolean = false): string | null {
        if (!fs.existsSync(dir)) return null;
        const files = fs.readdirSync(dir);
        const check = typeof nameOrRegExp === 'string' ? (value: string) => value === nameOrRegExp : (value: string) => nameOrRegExp.test(value);
        for (const file of files) {
            const fullPath = path.join(dir, file);
            const stat = fs.statSync(fullPath);
            if (!stat.isDirectory()) {
                if (check(file)) return fullPath;
            } else if (deepFind) {
                const result = find(fullPath, nameOrRegExp);
                if (result) return result;
            }
        }
        return null;
    }

    export function fileCount(dir: string, includeFolder: boolean = false): number {
        if (!fs.existsSync(dir)) return 0;
        const stat = fs.statSync(dir);
        if (!stat.isDirectory()) {
            return 1;
        }
        let count = includeFolder ? 1 : 0;
        const files = fs.readdirSync(dir);
        files.forEach(item => count += fileCount(path.join(dir, item)))
        return count;
    }

    export function checkFileNameIndex(fileFullPath: string, indexGen: (index: number) => string = index => `(${index})`): string | null {
        if (!fs.existsSync(fileFullPath)) return fileFullPath;
        const extname = path.extname(fileFullPath);
        const basename = path.basename(fileFullPath, extname);
        const dirname = path.dirname(fileFullPath);

        let i = 1;
        let limit = 1000;
        while (limit-- > 0) {
            const newPath = path.join(dirname, `${basename}${indexGen(i)}${extname}`);
            if (!fs.existsSync(newPath)) return newPath;
            i++;
        }
        return null;
    }

    export function zipdir(srcDir: string, outputFile: string): Promise<void> {
        mkdir(path.dirname(outputFile));
        var promise: Promise<void> = new Promise((resolve: () => void, reject: (reason?: any) => void) => {
            const writeStream = fs.createWriteStream(outputFile);
            const archive = archiver('zip', {
                // encoding: 'utf-8',
                // forceZip64: true,
                zlib: { level: 9 }
            });
            writeStream.on('close', () => {
                resolve();
            });
            archive.on('error', function (error: archiver.ArchiverError) {
                reject(error)
            })

            archive.pipe(writeStream);
            archive.directory(srcDir, false);
            archive.finalize();
        });
        return promise;
    }

}

export default FileUtils;
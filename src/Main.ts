
import fs from 'fs';
import path from 'path';
import AssetBundle from './packager/AssetBundle';
import FileUtils from './utils/FileUtils';
import ProcessUtils from './utils/ProcessUtils';

const main = async (): Promise<number> => {

    const project = ProcessUtils.getArg('--project', value => !!value && !value.startsWith('--') && fs.existsSync(value));
    if (!project) {
        console.error(`illegal parameter --project or file not exists`);
        return 1;
    }
    const platform = ProcessUtils.getArg('--platform', value => !!value && !value.startsWith('--'));
    if (!project) {
        console.error(`illegal parameter --platform`);
        return 1;
    }
    const mode = ProcessUtils.getArg('--mode', value => !!value && !value.startsWith('--'));
    if (!mode) {
        console.error(`illegal parameter --mode`);
        return 1;
    }


    const buildPath = path.join(project, 'build', platform === 'web-mobile' ? platform : 'jsb-default', 'assets');
    const packageAll = ProcessUtils.haveArg('--all');
    const keys: string[] = [];
    if (packageAll) {
        const subGameDir = fs.readdirSync(buildPath);
        subGameDir.forEach(dir => {
            if (dir === 'main' || dir === 'internal' || dir === 'resources' || dir.startsWith('_')) return;
            const stat = fs.statSync(path.join(buildPath, dir));
            if (stat.isFile()) return;
            keys.push(dir);
        })
    } else {
        const keyString = ProcessUtils.getArg('--key', value => !value.startsWith('--'));
        if (!keyString) {
            console.error(`illegal parameter --key`);
            return 1;
        }
        keys.push(...keyString.split(','));
    }


    const xxtea = ProcessUtils.getArg('--xxtea', value => !!value && !value.startsWith('--')) || '';
    const zipCompressJs = !!ProcessUtils.haveArg('--zipCompressJs');
    const appVersion = ProcessUtils.getArg('--version', value => !!value && !value.startsWith('--'));
    const outputDir = ProcessUtils.getArg('--output', value => !!value && !value.startsWith('--')) || path.join(project, 'build', 'asset-bundle', platform, mode)
    const recordDir = ProcessUtils.getArg('--record', value => !!value && !value.startsWith('--')) || path.join(project, 'asset-bundle');

    const notitle = !!ProcessUtils.haveArg('--cinotitle');

    const ciResult: string[] = [];
    const results: AssetBundle.Result[] = [];
    for (let i = 0, length = keys.length; i < length; i++) {
        const key = keys[i];
        const result = await AssetBundle.pack(project, platform, key, appVersion, mode, xxtea, zipCompressJs, outputDir, recordDir);
        results.push(result);
        i > 0 && ciResult.push('line');
        if (result.size <= 0) {
            notitle ?
                ciResult.push(`没有需要打包的更新`) :
                ciResult.push(`AssetBundle [${result.key}] 没有需要打包的更新`);
            continue;
        }
        notitle || ciResult.push(`**AssetBundle [${result.key}] 打包信息：**`);
        ciResult.push(`主包版本=${result.mainVersion}`);
        ciResult.push(`子包版本=${result.version}`);
        ciResult.push(`子包大小=${(result.size / 1024 / 1024).toFixed(2)}MB`)
        ciResult.push(`新增文件=${result.added}`);
        ciResult.push(`修改文件=${result.changed}`);
        ciResult.push(`删除文件=${result.deleted}`);
        if (result.supports && result.supports.length) {
            if (result.supports.length === 1)
                ciResult.push(`增量支持版本=${result.supports.shift()}`);
            else
                ciResult.push(`增量支持版本=${result.supports.shift()} - ${result.supports.pop()}`);
        }

    }


    const backup = ProcessUtils.getArg('--backup', value => !!value && !value.startsWith('--'));
    if (backup) {
        const dateDir = (new Date()).toLocaleString().replace(/[\/\\:]/gm, '-');
        const backupDir = path.join(backup, dateDir);
        FileUtils.copy(outputDir, backupDir);
        fs.writeFileSync(path.join(backupDir, 'package_result.json'), JSON.stringify(results));
    }

    const ciLog = ProcessUtils.getArg('--cibm', value => !!value && !value.startsWith('--'));
    if (ciLog) {
        FileUtils.mkdir(path.dirname(ciLog));
        fs.writeFileSync(ciLog, ciResult.join(';'));
        console.info(`save build result ${ciLog}`)
    }
    return 0;
}

(async () => {
    const result = await main();
    process.exit(result);
})()

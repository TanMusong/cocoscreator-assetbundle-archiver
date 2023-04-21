import fs from 'fs';
import path from 'path';
import FileUtils from '../utils/FileUtils';
import MD5Utils from '../utils/MD5Utils';

namespace AssetBundle {

    const START_VERSION = 1;
    const VERSION_SUPPORT = 50;

    type AssetBundleData = { version: number, size: number, files: number, md5: string };
    type Config = { version: number, supports: AssetBundleData[] };
    type AssetBundleRecord = Config & { md5: MD5Utils.FileMD5[] };


    export type Result = {
        project: string,
        platform: string,
        key: string,
        mainVersion: string,
        mode: string,
        xxtea: string,
        zipCompressJs: boolean,
        added: number, changed: number, deleted: number,
        version: number,
        supports: number[],
        size: number
    }

    export async function pack(projectDir: string,
        platform: string,
        key: string,
        mainVersion: string,
        mode: string,
        xxtea: string,
        zipCompressJs: boolean,
        outputDir: string,
        recordDir: string,
    ): Promise<Result> {
        console.log(`-----------------------------------------------------AssetBundle [${key}] 打包开始-----------------------------------------------------`);

        console.log(`检查 [${key}] 构建目录: ${outputDir}`);
        FileUtils.rm(outputDir);
        FileUtils.mkdir(outputDir);

        const versionCacheDir = path.join(recordDir, platform, key, mode);
        console.log(`检查 [${key}] 构建记录缓存目录: ${versionCacheDir}`);
        FileUtils.mkdir(versionCacheDir);

        const bundleDir = path.join(projectDir, 'build', 'jsb-default', 'assets', key);

        //读取版本缓存
        const existVersions = readExistAssetBundleRecords(versionCacheDir);

        //读取上一版本数据
        const previousRecord: AssetBundleRecord = existVersions && existVersions.length ?
            readAssetBundleRecord(existVersions[existVersions.length - 1], versionCacheDir) :
            { md5: [], version: START_VERSION - 1, supports: [] };
        console.log(`获取 [${key}] 上一次构建版本号: ${previousRecord.version}`);

        //读取本次构建MD5
        const md5 = MD5Utils.md5Dir(bundleDir);

        //对比前一版本
        const md5Compare = MD5Utils.md5Compare(md5, previousRecord.md5);
        console.log(` [${key}] 与上一版本资源对比: 新增: ${md5Compare.added.length}, 删除: ${md5Compare.deleted.length}, 变更: ${md5Compare.changed.length}, 无修改: ${md5Compare.same.length}`);

        const assetBundleResult: Result = {
            project: projectDir,
            platform, key, mainVersion, mode, xxtea, zipCompressJs,
            version: previousRecord.version,
            supports: existVersions,
            added: md5Compare.added.length,
            changed: md5Compare.changed.length,
            deleted: md5Compare.deleted.length,
            size: 0
        };

        const config: Config = { version: previousRecord.version, supports: previousRecord.supports };

        const packageOutputDir = path.join(outputDir, 'package');
        const configOutputDir = path.join(outputDir, 'config');

        FileUtils.mkdir(packageOutputDir);
        FileUtils.mkdir(configOutputDir);

        if (md5Compare.changed.length || md5Compare.added.length) {
            console.log(`Assetbundle [${key}] 变更，开始打包`);

            const zipCacheOutputDir = path.join(outputDir, 'cache');
            FileUtils.mkdir(zipCacheOutputDir);

            const supports: AssetBundleData[] = [];
            const newVersion = previousRecord.version + 1;

            for (const versionItem of existVersions) {
                console.log(`处理 [${key}] ${versionItem}-${newVersion}差异包`);
                const versionInfo = readAssetBundleRecord(versionItem, versionCacheDir);
                if (!versionInfo) {
                    console.warn(`[${key}] 跳过${versionItem}版本处理, 版本记录文件丢失`);
                    continue;
                }

                //对比文件
                const versionCompareResult = MD5Utils.md5Compare(md5, versionInfo.md5);
                console.log(`[${key}] 版本${versionItem}资源对比: 新增: ${versionCompareResult.added.length}, 删除: ${versionCompareResult.deleted.length}, 变更: ${versionCompareResult.changed.length}, 无修改: ${versionCompareResult.same.length}`);

                //只压缩changed和added
                const files = versionCompareResult.changed.concat(versionCompareResult.added);
                const zipCacheDir = path.join(zipCacheOutputDir, `${versionItem}_${newVersion}`);
                FileUtils.mkdir(zipCacheDir);
                files.forEach(value => {
                    const outPath = path.join(zipCacheDir, value.path)
                    FileUtils.mkdir(path.dirname(outPath));
                    fs.copyFileSync(path.join(bundleDir, value.path), outPath);
                });
                fs.writeFileSync(path.join(zipCacheDir, 'assetbundle_version'), `${newVersion}`);
                const zipOutFile = path.join(packageOutputDir, `assetbundle_${key}_${versionItem}_${newVersion}.zip`);
                const fileCount = FileUtils.fileCount(zipCacheDir, true);
                await FileUtils.zipdir(zipCacheDir, zipOutFile);
                FileUtils.rm(zipCacheDir);
                const zipStat = fs.statSync(zipOutFile);
                const zipMD5 = MD5Utils.md5Dir(zipOutFile)[0].md5;
                supports.push({ version: versionItem, size: zipStat.size, files: fileCount, md5: zipMD5 });
            }

            FileUtils.rm(zipCacheOutputDir);//删除临时文件


            fs.writeFileSync(path.join(bundleDir, 'assetbundle_version'), `${newVersion}`);
            const zipOutFile = path.join(packageOutputDir, `assetbundle_${key}_${newVersion}.zip`);
            const fileCount = FileUtils.fileCount(bundleDir, true);
            await FileUtils.zipdir(bundleDir, zipOutFile);
            const zipStat = fs.statSync(zipOutFile);
            const zipMD5 = MD5Utils.md5Dir(zipOutFile)[0].md5;
            supports.push({ version: 0, size: zipStat.size, files: fileCount, md5: zipMD5 });

            config.version = newVersion;
            config.supports = supports;

            console.log(`保存 [${key}] 版本记录`);
            writeAssetBundleRecord({ ...config, md5 }, versionCacheDir);
            assetBundleResult.version = newVersion;
            assetBundleResult.size = zipStat.size;

        } else if (md5Compare.deleted.length) {
            console.log(`Assetbundle [${key}] 版本兼容，无需打包`);
        } else {
            console.log(`Assetbundle [${key}] 无修改，无需打包`);
        }

        const configFileName = `assetbundle_${key}_${mainVersion}.json`;
        console.log(`保存 [${key}] 配置文件：${configFileName}`);
        const configFilePath = path.join(configOutputDir, configFileName);
        FileUtils.mkdir(path.dirname(configFilePath));


        fs.writeFileSync(configFilePath, JSON.stringify(config));

        FileUtils.rm(bundleDir);//删除原构建目录内的AssetBundle资源
        console.log(`-----------------------------------------------------AssetBundle [${key}] 打包结束-----------------------------------------------------`);
        return assetBundleResult;
    }

    function readExistAssetBundleRecords(versionCacheDir: string): number[] {
        const versions: number[] = [];
        const versionFiles = fs.readdirSync(versionCacheDir);
        versionFiles.forEach(versionFile => {
            const versionFilePath = path.join(versionCacheDir, versionFile)
            const stat = fs.statSync(versionFilePath);
            if (stat.isDirectory()) return;
            const versionString = path.basename(versionFile, path.extname(versionFile));
            const version = parseInt(versionString);
            versions.push(version);
        })
        return versions.sort((a, b) => a - b).slice(-VERSION_SUPPORT);
    }

    function readAssetBundleRecord(assetBundleVersion: number, versionCacheDir: string): AssetBundleRecord | null {
        const infoFilePath: string = path.join(versionCacheDir, `${assetBundleVersion}.json`);
        if (!fs.existsSync(infoFilePath)) return null;
        const infoContent = fs.readFileSync(infoFilePath);
        const info: AssetBundleRecord = JSON.parse(infoContent.toString());
        return info;
    }

    function writeAssetBundleRecord(record: AssetBundleRecord, versionCacheDir: string): void {
        const content = JSON.stringify(record);
        const infoFilePath = path.join(versionCacheDir, `${record.version}.json`);
        FileUtils.mkdir(path.dirname(infoFilePath));
        fs.writeFileSync(infoFilePath, content);
    }

}
export default AssetBundle;
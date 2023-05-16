"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const FileUtils_1 = __importDefault(require("../utils/FileUtils"));
const MD5Utils_1 = __importDefault(require("../utils/MD5Utils"));
var AssetBundle;
(function (AssetBundle) {
    const START_VERSION = 1;
    const VERSION_SUPPORT = 50;
    function pack(projectDir, platform, key, mainVersion, mode, xxtea, zipCompressJs, outputDir, recordDir, abVersion = 'assetbundle') {
        return __awaiter(this, void 0, void 0, function* () {
            console.log(`-----------------------------------------------------AssetBundle [${key}] 打包开始-----------------------------------------------------`);
            console.log(`检查 [${key}] 构建目录: ${outputDir}`);
            FileUtils_1.default.rm(outputDir);
            FileUtils_1.default.mkdir(outputDir);
            const versionCacheDir = path_1.default.join(recordDir, platform, key, mode);
            console.log(`检查 [${key}] 构建记录缓存目录: ${versionCacheDir}`);
            FileUtils_1.default.mkdir(versionCacheDir);
            const bundleDir = path_1.default.join(projectDir, 'build', 'jsb-default', 'assets', key);
            const existVersions = readExistAssetBundleRecords(versionCacheDir);
            const previousRecord = existVersions && existVersions.length ?
                readAssetBundleRecord(existVersions[existVersions.length - 1], versionCacheDir) :
                { md5: [], version: START_VERSION - 1, supports: [] };
            console.log(`获取 [${key}] 上一次构建版本号: ${previousRecord.version}`);
            const md5 = MD5Utils_1.default.md5Dir(bundleDir);
            const md5Compare = MD5Utils_1.default.md5Compare(md5, previousRecord.md5);
            console.log(` [${key}] 与上一版本资源对比: 新增: ${md5Compare.added.length}, 删除: ${md5Compare.deleted.length}, 变更: ${md5Compare.changed.length}, 无修改: ${md5Compare.same.length}`);
            const assetBundleResult = {
                project: projectDir,
                platform, key, mainVersion, mode, xxtea, zipCompressJs,
                version: previousRecord.version,
                supports: existVersions,
                added: md5Compare.added.length,
                changed: md5Compare.changed.length,
                deleted: md5Compare.deleted.length,
                size: 0
            };
            const config = { version: previousRecord.version, supports: previousRecord.supports };
            const packageOutputDir = path_1.default.join(outputDir, 'package');
            const configOutputDir = path_1.default.join(outputDir, 'config');
            FileUtils_1.default.mkdir(packageOutputDir);
            FileUtils_1.default.mkdir(configOutputDir);
            if (md5Compare.changed.length || md5Compare.added.length) {
                console.log(`Assetbundle [${key}] 变更，开始打包`);
                const zipCacheOutputDir = path_1.default.join(outputDir, 'cache');
                FileUtils_1.default.mkdir(zipCacheOutputDir);
                const configPath = FileUtils_1.default.find(bundleDir, /config\.([a-zA-Z0-9\.]+\.)?json/);
                fs_1.default.renameSync(configPath, path_1.default.join(bundleDir, `config.${abVersion}.json`));
                const scriptPath = FileUtils_1.default.find(bundleDir, /index\.([a-zA-Z0-9\.]+\.)?js/);
                fs_1.default.renameSync(scriptPath, path_1.default.join(bundleDir, `index.${abVersion}${path_1.default.extname(scriptPath)}`));
                const supports = [];
                const newVersion = previousRecord.version + 1;
                for (const versionItem of existVersions) {
                    console.log(`处理 [${key}] ${versionItem}-${newVersion}差异包`);
                    const versionInfo = readAssetBundleRecord(versionItem, versionCacheDir);
                    if (!versionInfo) {
                        console.warn(`[${key}] 跳过${versionItem}版本处理, 版本记录文件丢失`);
                        continue;
                    }
                    const versionCompareResult = MD5Utils_1.default.md5Compare(md5, versionInfo.md5);
                    console.log(`[${key}] 版本${versionItem}资源对比: 新增: ${versionCompareResult.added.length}, 删除: ${versionCompareResult.deleted.length}, 变更: ${versionCompareResult.changed.length}, 无修改: ${versionCompareResult.same.length}`);
                    const files = versionCompareResult.changed.concat(versionCompareResult.added);
                    const zipCacheDir = path_1.default.join(zipCacheOutputDir, `${versionItem}_${newVersion}`);
                    FileUtils_1.default.mkdir(zipCacheDir);
                    files.forEach(value => {
                        const outPath = path_1.default.join(zipCacheDir, value.path);
                        FileUtils_1.default.mkdir(path_1.default.dirname(outPath));
                        fs_1.default.copyFileSync(path_1.default.join(bundleDir, value.path), outPath);
                    });
                    fs_1.default.writeFileSync(path_1.default.join(zipCacheDir, 'assetbundle_version'), `${newVersion}`);
                    const zipOutFile = path_1.default.join(packageOutputDir, `assetbundle_${key}_${versionItem}_${newVersion}.zip`);
                    const fileCount = FileUtils_1.default.fileCount(zipCacheDir, true);
                    yield FileUtils_1.default.zipdir(zipCacheDir, zipOutFile);
                    FileUtils_1.default.rm(zipCacheDir);
                    const zipStat = fs_1.default.statSync(zipOutFile);
                    const zipMD5 = MD5Utils_1.default.md5Dir(zipOutFile)[0].md5;
                    supports.push({ version: versionItem, size: zipStat.size, files: fileCount, md5: zipMD5 });
                }
                FileUtils_1.default.rm(zipCacheOutputDir);
                fs_1.default.writeFileSync(path_1.default.join(bundleDir, 'assetbundle_version'), `${newVersion}`);
                const zipOutFile = path_1.default.join(packageOutputDir, `assetbundle_${key}_${newVersion}.zip`);
                const fileCount = FileUtils_1.default.fileCount(bundleDir, true);
                yield FileUtils_1.default.zipdir(bundleDir, zipOutFile);
                const zipStat = fs_1.default.statSync(zipOutFile);
                const zipMD5 = MD5Utils_1.default.md5Dir(zipOutFile)[0].md5;
                supports.push({ version: 0, size: zipStat.size, files: fileCount, md5: zipMD5 });
                config.version = newVersion;
                config.supports = supports;
                console.log(`保存 [${key}] 版本记录`);
                writeAssetBundleRecord(Object.assign(Object.assign({}, config), { md5 }), versionCacheDir);
                assetBundleResult.version = newVersion;
                assetBundleResult.size = zipStat.size;
            }
            else if (md5Compare.deleted.length) {
                console.log(`Assetbundle [${key}] 版本兼容，无需打包`);
            }
            else {
                console.log(`Assetbundle [${key}] 无修改，无需打包`);
            }
            const configFileName = `assetbundle_${key}_${mainVersion}.json`;
            console.log(`保存 [${key}] 配置文件：${configFileName}`);
            const configFilePath = path_1.default.join(configOutputDir, configFileName);
            FileUtils_1.default.mkdir(path_1.default.dirname(configFilePath));
            fs_1.default.writeFileSync(configFilePath, JSON.stringify(config));
            FileUtils_1.default.rm(bundleDir);
            console.log(`-----------------------------------------------------AssetBundle [${key}] 打包结束-----------------------------------------------------`);
            return assetBundleResult;
        });
    }
    AssetBundle.pack = pack;
    function readExistAssetBundleRecords(versionCacheDir) {
        const versions = [];
        const versionFiles = fs_1.default.readdirSync(versionCacheDir);
        versionFiles.forEach(versionFile => {
            const versionFilePath = path_1.default.join(versionCacheDir, versionFile);
            const stat = fs_1.default.statSync(versionFilePath);
            if (stat.isDirectory())
                return;
            const versionString = path_1.default.basename(versionFile, path_1.default.extname(versionFile));
            const version = parseInt(versionString);
            versions.push(version);
        });
        return versions.sort((a, b) => a - b).slice(-VERSION_SUPPORT);
    }
    function readAssetBundleRecord(assetBundleVersion, versionCacheDir) {
        const infoFilePath = path_1.default.join(versionCacheDir, `${assetBundleVersion}.json`);
        if (!fs_1.default.existsSync(infoFilePath))
            return null;
        const infoContent = fs_1.default.readFileSync(infoFilePath);
        const info = JSON.parse(infoContent.toString());
        return info;
    }
    function writeAssetBundleRecord(record, versionCacheDir) {
        const content = JSON.stringify(record);
        const infoFilePath = path_1.default.join(versionCacheDir, `${record.version}.json`);
        FileUtils_1.default.mkdir(path_1.default.dirname(infoFilePath));
        fs_1.default.writeFileSync(infoFilePath, content);
    }
})(AssetBundle || (AssetBundle = {}));
exports.default = AssetBundle;

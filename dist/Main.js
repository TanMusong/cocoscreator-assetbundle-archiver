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
const AssetBundle_1 = __importDefault(require("./packager/AssetBundle"));
const FileUtils_1 = __importDefault(require("./utils/FileUtils"));
const ProcessUtils_1 = __importDefault(require("./utils/ProcessUtils"));
const main = () => __awaiter(void 0, void 0, void 0, function* () {
    const project = ProcessUtils_1.default.getArg('--project', value => !!value && !value.startsWith('--') && fs_1.default.existsSync(value));
    if (!project) {
        console.error(`illegal parameter --project or file not exists`);
        return 1;
    }
    const platform = ProcessUtils_1.default.getArg('--platform', value => !!value && !value.startsWith('--'));
    if (!project) {
        console.error(`illegal parameter --platform`);
        return 1;
    }
    const mode = ProcessUtils_1.default.getArg('--mode', value => !!value && !value.startsWith('--'));
    if (!mode) {
        console.error(`illegal parameter --mode`);
        return 1;
    }
    const buildPath = path_1.default.join(project, 'build', platform === 'web-mobile' ? platform : 'jsb-default', 'assets');
    const packageAll = ProcessUtils_1.default.haveArg('--all');
    const keys = [];
    if (packageAll) {
        const subGameDir = fs_1.default.readdirSync(buildPath);
        subGameDir.forEach(dir => {
            if (dir === 'main' || dir === 'internal' || dir === 'resources' || dir.startsWith('_'))
                return;
            const stat = fs_1.default.statSync(path_1.default.join(buildPath, dir));
            if (stat.isFile())
                return;
            keys.push(dir);
        });
    }
    else {
        const keyString = ProcessUtils_1.default.getArg('--key', value => !value.startsWith('--'));
        if (!keyString) {
            console.error(`illegal parameter --key`);
            return 1;
        }
        keys.push(...keyString.split(','));
    }
    const xxtea = ProcessUtils_1.default.getArg('--xxtea', value => !!value && !value.startsWith('--')) || '';
    const zipCompressJs = !!ProcessUtils_1.default.haveArg('--zipCompressJs');
    const appVersion = ProcessUtils_1.default.getArg('--version', value => !!value && !value.startsWith('--'));
    const outputDir = ProcessUtils_1.default.getArg('--output', value => !!value && !value.startsWith('--')) || path_1.default.join(project, 'build', 'asset-bundle', platform, mode);
    const recordDir = ProcessUtils_1.default.getArg('--record', value => !!value && !value.startsWith('--')) || path_1.default.join(project, 'asset-bundle');
    const notitle = !!ProcessUtils_1.default.haveArg('--cinotitle');
    const ciResult = [];
    const results = [];
    for (let i = 0, length = keys.length; i < length; i++) {
        const key = keys[i];
        const result = yield AssetBundle_1.default.pack(project, platform, key, appVersion, mode, xxtea, zipCompressJs, outputDir, recordDir);
        results.push(result);
        i > 0 && ciResult.push('line');
        if (result.size <= 0) {
            ciResult.push(`AssetBundle${notitle ? '' : result.key}没有需要打包的更新`);
            continue;
        }
        notitle || ciResult.push(`AssetBundle${result.key}打包`);
        ciResult.push(`主包版本=${result.mainVersion}`);
        ciResult.push(`子包版本=${result.version}`);
        ciResult.push(`新增文件=${result.added}`);
        ciResult.push(`修改文件=${result.changed}`);
        ciResult.push(`删除文件=${result.deleted}`);
        ciResult.push(`子包大小=${(result.size / 1024 / 1024).toFixed(2)}MB`);
        if (result.supports && result.supports.length) {
            if (result.supports.length === 1)
                ciResult.push(`增量支持版本=${result.supports.shift()}`);
            else
                ciResult.push(`增量支持版本=${result.supports.shift()} - ${result.supports.pop()}`);
        }
    }
    const backup = ProcessUtils_1.default.getArg('--record', value => !!value && !value.startsWith('--'));
    if (backup) {
        const dateDir = (new Date()).toLocaleString().replace(/[\/\\:]/gm, '-');
        const backupDir = path_1.default.join(backup, dateDir);
        FileUtils_1.default.copy(outputDir, backupDir);
        fs_1.default.writeFileSync(path_1.default.join(backupDir, 'package_result.json'), JSON.stringify(results));
    }
    const ciLog = ProcessUtils_1.default.getArg('--cibm', value => !!value && !value.startsWith('--'));
    if (ciLog) {
        FileUtils_1.default.mkdir(path_1.default.dirname(ciLog));
        fs_1.default.writeFileSync(ciLog, ciResult.join(';'));
        console.info(`save build result ${ciLog}`);
    }
    return 0;
});
(() => __awaiter(void 0, void 0, void 0, function* () {
    const result = yield main();
    process.exit(result);
}))();

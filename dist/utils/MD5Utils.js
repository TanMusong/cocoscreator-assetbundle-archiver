"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const crypto_1 = __importDefault(require("crypto"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
var MD5Utils;
(function (MD5Utils) {
    function md5(text) {
        const hash = crypto_1.default.createHash('md5');
        hash.update(text);
        const hex = hash.digest('hex');
        return hex;
    }
    MD5Utils.md5 = md5;
    function md5Dir(fileOrDir, output) {
        output = output || [];
        if (!fs_1.default.existsSync(fileOrDir))
            return output;
        const relativePath = fileOrDir;
        const md5 = (file) => {
            const stat = fs_1.default.statSync(file);
            if (!stat.isDirectory()) {
                const buffer = fs_1.default.readFileSync(file);
                const hash = crypto_1.default.createHash('md5');
                hash.update(buffer);
                const hex = hash.digest('hex');
                output.push({ path: path_1.default.relative(relativePath, file), md5: hex });
            }
            else {
                const files = fs_1.default.readdirSync(file);
                files.forEach(item => md5(path_1.default.join(file, item)));
            }
        };
        md5(fileOrDir);
        return output;
    }
    MD5Utils.md5Dir = md5Dir;
    function md5Compare(source, target) {
        const result = { added: [], deleted: [], changed: [], same: [] };
        target = target.concat([]);
        source = source.concat([]);
        let sourceItem;
        while (sourceItem = source.shift()) {
            let matchItem = undefined;
            for (let j = 0, length = target.length; j < length; j++) {
                const targetItem = target[j];
                if (targetItem.path !== sourceItem.path)
                    continue;
                matchItem = targetItem;
                target.splice(j, 1);
                break;
            }
            if (!matchItem)
                result.added.push(sourceItem);
            else
                matchItem.md5 === sourceItem.md5 ? result.same.push(sourceItem) : result.changed.push(sourceItem);
        }
        result.deleted.push(...target);
        return result;
    }
    MD5Utils.md5Compare = md5Compare;
})(MD5Utils || (MD5Utils = {}));
exports.default = MD5Utils;

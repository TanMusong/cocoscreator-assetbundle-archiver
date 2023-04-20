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
const child_process_1 = __importDefault(require("child_process"));
var BuildUtils;
(function (BuildUtils) {
    const LOG_SPLIT_SEPARATOR = '||||||';
    const exec = (cmd) => {
        const promise = new Promise((resolve) => {
            let result = '';
            const stream = child_process_1.default.exec(cmd);
            stream.stdout.on('data', data => {
                console.log('stdout: ' + data);
                result += data;
            });
            stream.stderr.on('data', data => console.error(`stderr: ${data}`));
            stream.on('close', (code) => {
                if (code !== 0)
                    console.warn(`process exited with code ${code}`);
                resolve(result || "");
            });
        });
        return promise;
    };
    BuildUtils.readGitVersion = (dir) => __awaiter(this, void 0, void 0, function* () {
        const commit = yield exec(`cd ${dir} && git show -s --format=%H`);
        return commit.trim();
    });
    BuildUtils.readGitLog = (dir, startVersion) => __awaiter(this, void 0, void 0, function* () {
        let command = `cd ${dir} && `;
        command += startVersion ? `git log ${startVersion}.. ` : 'git log ';
        command += `--pretty=format:"%an${LOG_SPLIT_SEPARATOR}%s${LOG_SPLIT_SEPARATOR}%H" --no-merges`;
        const log = yield exec(command);
        const logArray = log.split('\n');
        const messageArray = [];
        logArray.forEach((element) => {
            if (!element || !element.length)
                return;
            const data = element.split(LOG_SPLIT_SEPARATOR);
            if (!data || data.length !== 3)
                return;
            const [name, title, id] = data;
            messageArray.push({ name, title });
        });
        return messageArray;
    });
})(BuildUtils || (BuildUtils = {}));
exports.default = BuildUtils;

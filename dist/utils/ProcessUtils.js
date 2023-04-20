"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var ProcessUtils;
(function (ProcessUtils) {
    function getArg(key, check) {
        const index = process.argv.indexOf(key);
        if (index < 0)
            return null;
        const value = process.argv[index + 1];
        return check ? (check(value) ? value : null) : value;
    }
    ProcessUtils.getArg = getArg;
    function haveArg(key) {
        const index = process.argv.indexOf(key);
        return index >= 0;
    }
    ProcessUtils.haveArg = haveArg;
})(ProcessUtils || (ProcessUtils = {}));
exports.default = ProcessUtils;

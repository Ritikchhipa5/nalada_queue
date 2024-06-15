"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.download = exports.median = exports.isUndefined = exports.isNull = exports.isUsable = exports.isNotFilled = exports.isFilled = exports.isNotEmpty = void 0;
const fs_1 = require("fs");
const request_1 = __importDefault(require("request"));
function isNotEmpty(param) {
    return param !== undefined && param !== null && param !== "";
}
exports.isNotEmpty = isNotEmpty;
function isFilled(param) {
    return param !== undefined && param !== null && param.length > 0;
}
exports.isFilled = isFilled;
function isNotFilled(param) {
    return param !== undefined && param !== null && param.length === 0;
}
exports.isNotFilled = isNotFilled;
function isUsable(param) {
    return param !== undefined && param !== null;
}
exports.isUsable = isUsable;
function isNull(param) {
    return param !== undefined && param === null;
}
exports.isNull = isNull;
function isUndefined(param) {
    return param === undefined;
}
exports.isUndefined = isUndefined;
function median(values) {
    if (values.length === 0)
        throw new Error("No inputs");
    values.sort((a, b) => a - b);
    var half = Math.floor(values.length / 2);
    if (values.length % 2)
        return values[half];
    return (values[half - 1] + values[half]) / 2.0;
}
exports.median = median;
async function download(uri, filename, callback) {
    if (this.isUsable(uri))
        (0, request_1.default)(uri)
            .pipe((0, fs_1.createWriteStream)(`./temp/${filename}`))
            .on("close", callback);
    else
        return null;
    // })
}
exports.download = download;

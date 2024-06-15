"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bookDownload = void 0;
const axios_1 = __importDefault(require("axios"));
const functions_1 = require("./functions");
const fs_1 = require("fs");
const constant_1 = require("./constant");
const bookDownload = async ({ fileUrl, bookFileName }) => {
    console.log(fileUrl);
    if ((0, functions_1.isUsable)(fileUrl)) {
        try {
            const response = await (0, axios_1.default)({
                url: fileUrl,
                method: "GET",
                responseType: "stream",
            });
            const bookDownload = (0, fs_1.createWriteStream)(`${constant_1.temPath}/${bookFileName}`);
            response.data.pipe(bookDownload);
            return new Promise((resolve, reject) => {
                bookDownload.on("finish", () => {
                    console.log("Download complete");
                    resolve(true);
                });
                bookDownload.on("error", (err) => {
                    console.error("Error writing file:", err.message);
                    reject(err);
                });
            });
        }
        catch (err) {
            console.error("Error downloading the book:", err);
            return Promise.reject(err);
        }
    }
    else {
        return null;
    }
};
exports.bookDownload = bookDownload;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketplaceContract = exports.signer = exports.provider = exports.WALLET_PRIVATE_KEY = exports.GENRES = exports.LANGUAGES = exports.langPath = exports.genresPath = exports.customPath = exports.temPath = exports.tempJsonPath = exports.dirPath = exports.UserState = exports.QUEUES = exports.UTILS = exports.MARKET_CONTRACT_ADDRESS = exports.NALNDA_TOKEN_CONTRACT_ADDRESS = exports.NALNDA_SERVER_URL = void 0;
const path_1 = __importDefault(require("path"));
const ethers_1 = require("ethers");
// export const NALNDA_SERVER_URL = "http://localhost:8081";
exports.NALNDA_SERVER_URL = "https://server.nalnda.com";
exports.NALNDA_TOKEN_CONTRACT_ADDRESS = "0xf1be3Ff58d52154830a27369d6E16235Ae0e8d34";
exports.MARKET_CONTRACT_ADDRESS = "0x16E1d24736367d32E0Bcc216F8821fc57DC42fD7";
exports.UTILS = {};
exports.QUEUES = {
    DATA_BOOKS_ADDED_QUEUE: "data_books_added_queue",
    BOOK_BATCH_PROCESSING_QUEUE: "book_batch_processing_queue",
    FILTERS_BATCH_PROCESSING_BOOKS_QUEUE: "filters_batch_processing_books_queue",
    BATCH_BOOKS_ADD_IN_DATABASE_QUEUE: "batch_books_add_in_database_queue",
};
exports.UserState = {
    user: {
        uid: "e57fc583-aebe-5403-842b-88102dd7cf5b",
        wallet: "0x9C818B56141A089b1f626479BA3BC62F319B4200",
    },
    tokens: {
        acsTkn: {
            tkn: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1aWQiOiJlNTdmYzU4My1hZWJlLTU0MDMtODQyYi04ODEwMmRkN2NmNWIiLCJpYXQiOjE3MTcyMjIwMzUsImV4cCI6MTcyNzU5MDAzNX0.UAHVmKeQu07yjxeAFr0H0n5JmMAojSX4yJEK1cPnHjE",
        },
    },
};
exports.dirPath = path_1.default.join(__dirname, "../data/epub");
exports.tempJsonPath = path_1.default.join(__dirname, "../temp.json");
exports.temPath = path_1.default.join(__dirname, "../temp");
const customPath = (filePath) => path_1.default.join(__dirname, filePath);
exports.customPath = customPath;
exports.genresPath = path_1.default.join(__dirname, "../config/genres.txt");
exports.langPath = path_1.default.join(__dirname, "../config/languages.txt");
exports.LANGUAGES = [1];
exports.GENRES = [1, 2];
exports.WALLET_PRIVATE_KEY = "0xcb5a39692ba03a3d34f29a006e56bb6fd12ea31d78f8d2b36be352fcb52c3016";
exports.provider = new ethers_1.ethers.providers.JsonRpcProvider(`https://polygon-amoy.infura.io/v3/1da2a4aeb9a949d586c8bcbf4a43b8b6`);
exports.signer = new ethers_1.ethers.Wallet(exports.WALLET_PRIVATE_KEY, exports.provider);
const NalndaMarketplace_json_1 = __importDefault(require("../artifacts/contracts/NalndaMarketplace.sol/NalndaMarketplace.json"));
exports.marketplaceContract = new ethers_1.ethers.Contract(exports.MARKET_CONTRACT_ADDRESS, NalndaMarketplace_json_1.default.abi, exports.signer);

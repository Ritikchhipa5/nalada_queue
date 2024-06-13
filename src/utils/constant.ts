import path from "path";
import { ethers } from "ethers";
// export const NALNDA_SERVER_URL = "http://localhost:8081";
export const NALNDA_SERVER_URL = "https://server.nalnda.com";
export const NALNDA_TOKEN_CONTRACT_ADDRESS =
  "0xf1be3Ff58d52154830a27369d6E16235Ae0e8d34";
export const MARKET_CONTRACT_ADDRESS =
  "0x16E1d24736367d32E0Bcc216F8821fc57DC42fD7";
export const UTILS = {};

export const QUEUES = {
  DATA_BOOKS_ADDED_QUEUE: "data_books_added_queue",
  BOOK_BATCH_PROCESSING_QUEUE: "book_batch_processing_queue",
  FILTERS_BATCH_PROCESSING_BOOKS_QUEUE: "filters_batch_processing_books_queue",
  BATCH_BOOKS_ADD_IN_DATABASE_QUEUE: "batch_books_add_in_database_queue",
};

export const UserState = {
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

export const dirPath = path.join(__dirname, "../data/epub");
export const temPath = path.join(__dirname, "../temp");
export const customPath = (filePath: string) => path.join(__dirname, filePath);
export const genresPath = path.join(__dirname, "../config/genres.txt");
export const langPath = path.join(__dirname, "../config/languages.txt");
export const LANGUAGES = [1];
export const GENRES = [1, 2];
export const WALLET_PRIVATE_KEY =
  "0xcb5a39692ba03a3d34f29a006e56bb6fd12ea31d78f8d2b36be352fcb52c3016";
export const provider = new ethers.providers.JsonRpcProvider(
  `https://polygon-amoy.infura.io/v3/1da2a4aeb9a949d586c8bcbf4a43b8b6`
);

export const signer = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

import marketplace from "../artifacts/contracts/NalndaMarketplace.sol/NalndaMarketplace.json";

export const marketplaceContract = new ethers.Contract(
  MARKET_CONTRACT_ADDRESS,
  marketplace.abi,
  signer
);

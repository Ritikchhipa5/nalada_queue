import path from "path";
import { ethers } from "ethers";
export const NALNDA_SERVER_URL = "http://localhost:8080";
// export const NALNDA_SERVER_URL = "https://server.nalnda.com";
export const NALNDA_TOKEN_CONTRACT_ADDRESS =
  "0xf1be3Ff58d52154830a27369d6E16235Ae0e8d34";
export const MARKET_CONTRACT_ADDRESS =
  "0x7D9D0EFBAE2366C59DF8f912e41c17cc2779D0fF";
export const USDC_ADDRESS = "0xba3482BaABf0e9F68Fe7a62c957619771162fB92";
export const UTILS = {};
export const BOOKS_PROCESS = 5;
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
export const tempJsonPath = path.join(__dirname, "../temp.json");
export const temPath = path.join(__dirname, "../temp");
export const customPath = (filePath: string) => path.join(__dirname, filePath);
export const genresPath = path.join(__dirname, "../config/genres.txt");
export const langPath = path.join(__dirname, "../config/languages.txt");
export const LANGUAGES = [1];
export const GENRES = [1, 2];
export const WALLET_PRIVATE_KEY =
  "ab1e5a90cc720a565a215aace55a190a1bbed385148886372f0b6d408b69cfe7";
export const provider = new ethers.providers.JsonRpcProvider(
  `https://polygon-amoy.infura.io/v3/27N6WnWjamLPy7lc85McjJoRTCZ`
);

export const signer = new ethers.Wallet(WALLET_PRIVATE_KEY, provider);

import marketplace from "../artifacts/contracts/NalndaMarketplace.sol/NalndaMarketplace.json";

export const marketplaceContract = new ethers.Contract(
  MARKET_CONTRACT_ADDRESS,
  marketplace.abi,
  signer
);

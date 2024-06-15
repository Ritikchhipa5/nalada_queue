"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const express_1 = __importDefault(require("express"));
const app = (0, express_1.default)();
const port = 3001;
const cors_1 = __importDefault(require("cors"));
const rabbitMq_1 = require("./jobs/rabbitMq");
const bookService_1 = __importDefault(require("./services/bookService"));
const main = async () => {
    app.use((0, cors_1.default)());
    app.use(express_1.default.json());
    app.use(express_1.default.urlencoded({ extended: true }));
    await rabbitMq_1.rabbitMqClient.setupConnection();
    // Add Queue to Rabbit
    // await rabbitMqClient.addQueue(QUEUES.DATA_BOOKS_ADDED_QUEUE);
    // await rabbitMqClient.addQueue(QUEUES.BOOK_BATCH_PROCESSING_QUEUE);
    // await rabbitMqClient.addQueue(QUEUES.FILTERS_BATCH_PROCESSING_BOOKS_QUEUE);
    // await rabbitMqClient.addQueue(QUEUES.BATCH_BOOKS_ADD_IN_DATABASE_QUEUE);
    (0, bookService_1.default)();
    // app.get("/", (req, res) => {
    //   res.send("Hello, TypeScript with Express!");
    // });
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
};
main();

import "dotenv/config";
import express from "express";
const app = express();
const port = 3001;
import cors from "cors";
import { rabbitMqClient } from "./jobs/rabbitMq";
import { QUEUES } from "./utils/constant";
import booksAddServices from "./services/bookService";
const main = async () => {
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  await rabbitMqClient.setupConnection();

  // Add Queue to Rabbit
  // await rabbitMqClient.addQueue(QUEUES.DATA_BOOKS_ADDED_QUEUE);
  // await rabbitMqClient.addQueue(QUEUES.BOOK_BATCH_PROCESSING_QUEUE);
  // await rabbitMqClient.addQueue(QUEUES.FILTERS_BATCH_PROCESSING_BOOKS_QUEUE);
  // await rabbitMqClient.addQueue(QUEUES.BATCH_BOOKS_ADD_IN_DATABASE_QUEUE);

  booksAddServices();
  // app.get("/", (req, res) => {
  //   res.send("Hello, TypeScript with Express!");
  // });

  app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
  });
};

main();

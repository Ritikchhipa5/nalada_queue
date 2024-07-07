import * as amqplib from "amqplib";
import { bookUploadToDatabase } from "../services/bookService";

class RabbitMqClient {
  public channel: amqplib.Channel;
  private connection: amqplib.Connection;
  private AMQP_URL = process.env.RABBIT_MQ as string | amqplib.Options.Connect;
  async setupConnection() {
    try {
      console.log("Connecting to Rabbit Establish Server...");
      this.connection = await amqplib.connect(this.AMQP_URL);
      this.channel = await this.connection.createChannel();
      this.channel.prefetch(1);
      console.log(this.AMQP_URL);
    } catch (error: any) {
      console.log(error.message);
    }
  }
  async addQueue(queueName: string) {
    await this.channel.assertQueue(queueName, { durable: true });
  }

  async sendCreateBookTransactionDataToQueue(queueName: string, msg: any) {
    this.channel.sendToQueue(queueName, Buffer.from(msg), { persistent: true });
  }

  async sendBookToDatabase(queueName: string) {
    this.channel.consume(
      queueName,
      async (msg) => {
        try {
          const {
            epub,
            name,
            author,
            cover,
            coverFile,
            book,
            genres,
            ageGroup,
            price,
            pages,
            publication,
            synopsis,
            language,
            published,
            secondarySalesFrom,
            publisherAddress,
            bookAddress,
            txHash,
          } = JSON.parse(msg.content.toString());

          console.log(`Book transaction`, language);
          if (bookAddress) {
            await bookUploadToDatabase({
              epub,
              name,
              author,
              cover,
              coverFile,
              book,
              genres,
              ageGroup,
              price,
              pages,
              publication,
              synopsis,
              language,
              published,
              secondarySalesFrom,
              publisherAddress,
              bookAddress,
              txHash,
            });
          } else {
            console.log("No data available");
          }
          // await documentExtractor(filePath, fileName, language, id);
          this.channel.ack(msg);
        } catch (error) {
          console.log(error?.message);
          // this.channel.ack(msg);
        }
      },
      { noAck: false }
    );
  }
}

export const rabbitMqClient = new RabbitMqClient();

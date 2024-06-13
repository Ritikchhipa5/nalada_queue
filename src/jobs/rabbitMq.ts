import * as amqplib from "amqplib";

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
    await this.channel.assertQueue(queueName, { durable: false });
  }

  async sendCreateBookTransactionDataToQueue(queueName: string, msg: any) {
    this.channel.sendToQueue(queueName, Buffer.from(msg));
  }
}

export const rabbitMqClient = new RabbitMqClient();

import amqp from "amqplib";
import { SQSClient } from "@aws-sdk/client-sqs";

const sqs = new SQSClient({});
const conn = await amqp.connect(process.env.AMQP_URL);
const ch = await conn.createChannel();
await ch.assertQueue("notifications.inbound", { durable: true });

import { Kafka, Producer } from 'kafkajs';

const kafkaBroker = process.env.KAFKA_BROKER || 'localhost:9092';

let producer: Producer | null = null;
let connecting: Promise<Producer | null> | null = null;

/**
 * 获取 Kafka Producer 连接单例
 */
export async function getKafkaProducer(): Promise<Producer | null> {
  if (producer) return producer;
  if (connecting) return connecting;

  connecting = (async () => {
  try {
    const kafka = new Kafka({
      clientId: 'movieflex-app',
      brokers: [kafkaBroker],
      // 设置连接和请求超时时间
      connectionTimeout: 5000,
      requestTimeout: 10000,
    });

    const nextProducer = kafka.producer();
    await nextProducer.connect();
    producer = nextProducer;
    console.log('✅ Kafka Producer connected successfully to ' + kafkaBroker);
    return producer;
  } catch (error) {
    console.error('❌ Failed to connect to Kafka:', error);
    producer = null;
    return null;
  } finally { connecting = null; }
  })();
  return connecting;
}

/**
 * 发送事件消息至指定 Kafka 主题
 */
export async function sendKafkaMessage(topic: string, message: Record<string, unknown>): Promise<boolean> {
  try {
    const p = await getKafkaProducer();
    if (!p) {
      console.warn(`[Kafka Warning] Kafka producer offline. Event on topic [${topic}] not sent.`);
      return false;
    }

    await p.send({
      topic,
      messages: [
        {
          key: message.user_id ? String(message.user_id) : undefined,
          value: JSON.stringify({
            ...message,
            timestamp: message.timestamp || new Date().toISOString()
          }),
        },
      ],
    });
    return true;
  } catch (error) {
    console.error(`❌ Failed to send message to Kafka topic [${topic}]:`, error);
    return false;
  }
}

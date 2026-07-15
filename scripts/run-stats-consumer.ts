import 'dotenv/config';
import { statsConsumer } from '../src/lib/stats/stats-consumer';

async function main() {
  await statsConsumer.start();
  const stop = async () => { await statsConsumer.stop(); process.exit(0); };
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
}
main().catch((error) => { console.error('Stats consumer failed:', error); process.exit(1); });

import { v4 as uuidv4 } from 'uuid';
import type { Prisma } from '@prisma/client';
import prisma from './prisma';
import { sendKafkaMessage } from './kafka';

export async function queueEvent(topic: string, payload: Prisma.InputJsonValue) {
  const id = uuidv4();
  await prisma.eventOutbox.create({ data: { id, topic, payload } });
  return deliverOutboxEvent(id);
}

export async function deliverOutboxEvent(id: string) {
  const event = await prisma.eventOutbox.findUnique({ where: { id } });
  if (!event || event.status === 'DELIVERED') return event?.status === 'DELIVERED';
  const delivered = await sendKafkaMessage(event.topic, event.payload as Record<string, unknown>);
  if (delivered) {
    await prisma.eventOutbox.update({ where: { id }, data: { status: 'DELIVERED', deliveredAt: new Date(), attempts: { increment: 1 }, lastError: null } });
  } else {
    await prisma.eventOutbox.update({ where: { id }, data: { status: 'PENDING', attempts: { increment: 1 }, lastError: 'Kafka 不可用', availableAt: new Date(Date.now() + 60_000) } });
  }
  return delivered;
}

export async function retryPendingEvents(limit = 50) {
  const events = await prisma.eventOutbox.findMany({ where: { status: 'PENDING', availableAt: { lte: new Date() } }, orderBy: { createdAt: 'asc' }, take: limit, select: { id: true } });
  let delivered = 0;
  for (const event of events) if (await deliverOutboxEvent(event.id)) delivered += 1;
  return { attempted: events.length, delivered };
}

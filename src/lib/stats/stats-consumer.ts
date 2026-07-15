import { Kafka, Consumer, EachMessagePayload } from 'kafkajs';
import prisma from '../prisma';

interface BehaviorEvent {
  eventType: string;
  userId?: number;
  movieId?: number;
  data?: {
    episode?: string;
    url?: string;
    currentTime?: number;
    duration?: number;
    progress?: string;
    action?: string;
  };
  timestamp?: string;
}

class StatsConsumer {
  private consumer: Consumer;
  private isRunning = false;

  constructor() {
    const kafka = new Kafka({
      clientId: 'stats-consumer',
      brokers: [process.env.KAFKA_BROKER || 'localhost:9092'],
    });

    this.consumer = kafka.consumer({ groupId: 'stats-consumer-group' });
  }

  async start() {
    if (this.isRunning) {
      console.log('Stats consumer already running');
      return;
    }

    try {
      await this.consumer.connect();
      console.log('✅ Kafka Stats Consumer connected');

      await this.consumer.subscribe({ topic: 'user-behaviors', fromBeginning: false });
      console.log('📡 Subscribed to user-behaviors topic');

      this.isRunning = true;

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }: EachMessagePayload) => {
          try {
            const event: BehaviorEvent = JSON.parse(message.value?.toString() || '{}');
            await this.processEvent(event);
          } catch (error) {
            console.error('Error processing message:', error);
          }
        },
      });

      console.log('🚀 Stats consumer started successfully');
    } catch (error) {
      console.error('❌ Failed to start stats consumer:', error);
      throw error;
    }
  }

  async stop() {
    if (!this.isRunning) return;

    console.log('Stopping stats consumer...');
    await this.consumer.disconnect();
    this.isRunning = false;
    console.log('✅ Stats consumer stopped');
  }

  private async processEvent(event: BehaviorEvent) {
    const { eventType, userId = -1, movieId, data } = event;
    const timestamp = event.timestamp ? new Date(event.timestamp) : new Date();
    const date = new Date(timestamp.getFullYear(), timestamp.getMonth(), timestamp.getDate());

    // Get movie typeId for category dimension
    let typeId: number | null = null;
    if (movieId) {
      const movie = await prisma.movie.findUnique({
        where: { id: movieId },
        select: { typeId: true },
      });
      typeId = movie?.typeId || null;
    }

    // Aggregate based on event type
    if (eventType === 'view' || eventType === 'play_start') {
      const isGuest = userId === -1;
      const progress = parseFloat(data?.progress || '0') || 0;

      // Update movie dimension
      if (movieId) {
        await this.updateDailyStats({
          date,
          dimension: 'movie',
          dimensionId: movieId,
          totalViews: 1,
          userViews: isGuest ? 0 : 1,
          guestViews: isGuest ? 1 : 0,
          uniqueUser: isGuest ? null : userId,
          progress,
        });
      }

      // Update category dimension
      if (typeId) {
        await this.updateDailyStats({
          date,
          dimension: 'category',
          dimensionId: typeId,
          totalViews: 1,
          userViews: isGuest ? 0 : 1,
          guestViews: isGuest ? 1 : 0,
          uniqueUser: isGuest ? null : userId,
          progress,
        });
      }

      // Update global dimension
      await this.updateDailyStats({
        date,
        dimension: 'global',
        dimensionId: null,
        totalViews: 1,
        userViews: isGuest ? 0 : 1,
        guestViews: isGuest ? 1 : 0,
        uniqueUser: isGuest ? null : userId,
        progress,
      });
    } else if (eventType === 'favorite') {
      // Update movie dimension
      if (movieId) {
        await this.updateDailyStats({
          date,
          dimension: 'movie',
          dimensionId: movieId,
          totalFavorites: 1,
        });
      }

      // Update category dimension
      if (typeId) {
        await this.updateDailyStats({
          date,
          dimension: 'category',
          dimensionId: typeId,
          totalFavorites: 1,
        });
      }

      // Update global dimension
      await this.updateDailyStats({
        date,
        dimension: 'global',
        dimensionId: null,
        totalFavorites: 1,
      });
    }
  }

  private async updateDailyStats(params: {
    date: Date;
    dimension: string;
    dimensionId: number | null;
    totalViews?: number;
    userViews?: number;
    guestViews?: number;
    uniqueUser?: number | null;
    totalFavorites?: number;
    progress?: number;
  }) {
    const {
      date,
      dimension,
      dimensionId,
      totalViews = 0,
      userViews = 0,
      guestViews = 0,
      totalFavorites = 0,
      progress = 0,
    } = params;

    if (dimensionId === null) {
      // For global dimension (no dimensionId), use direct query
      const existing = await prisma.dailyStats.findFirst({
        where: { date, dimension, dimensionId: null },
      });

      if (existing) {
        await prisma.dailyStats.update({
          where: { id: existing.id },
          data: {
            totalViews: { increment: totalViews },
            userViews: { increment: userViews },
            guestViews: { increment: guestViews },
            totalFavorites: { increment: totalFavorites },
            avgProgress: progress,
          },
        });
      } else {
        await prisma.dailyStats.create({
          data: {
            date,
            dimension,
            dimensionId: null,
            totalViews,
            userViews,
            guestViews,
            uniqueUsers: params.uniqueUser ? 1 : 0,
            totalFavorites,
            avgProgress: progress,
          },
        });
      }
    } else {
      await prisma.dailyStats.upsert({
        where: {
          uk_dimension_date: {
            date,
            dimension,
            dimensionId,
          },
        },
        create: {
          date,
          dimension,
          dimensionId,
          totalViews,
          userViews,
          guestViews,
          uniqueUsers: params.uniqueUser ? 1 : 0,
          totalFavorites,
          avgProgress: progress,
        },
        update: {
          totalViews: { increment: totalViews },
          userViews: { increment: userViews },
          guestViews: { increment: guestViews },
          totalFavorites: { increment: totalFavorites },
          avgProgress: { set: progress },
        },
      });
    }
  }
}

export const statsConsumer = new StatsConsumer();

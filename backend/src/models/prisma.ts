import { PrismaClient } from '@prisma/client';
import { config } from '../config/env';

export const prisma = new PrismaClient({
  datasources: {
    db: {
      url: config.databaseUrl,
    },
  },
});

// Graceful shutdown helper for future use
export async function closePrisma() {
  await prisma.$disconnect();
}

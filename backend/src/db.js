import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis;
export const prisma = globalForPrisma.__campusfixPrisma || new PrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.__campusfixPrisma = prisma;


import { Router } from 'express';
import { prisma } from '../db.js';
import { asyncHandler } from '../middleware/errors.js';

export const healthRouter = Router();

healthRouter.get('/', asyncHandler(async (req, res) => {
  await prisma.$queryRaw`SELECT 1`;
  res.json({ status: 'ok', service: 'CampusFix API', time: new Date().toISOString() });
}));


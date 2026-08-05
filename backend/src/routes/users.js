import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

export const usersRouter = Router();
usersRouter.use(authenticate);

usersRouter.get('/technicians', requireRoles('TECHNICIAN', 'ADMIN'), asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({
    where: { role: { in: ['TECHNICIAN', 'ADMIN'] }, isActive: true },
    select: { id: true, name: true, email: true, role: true, isActive: true },
    orderBy: { name: 'asc' }
  });
  res.json({ users });
}));

usersRouter.use(requireRoles('ADMIN'));

usersRouter.get('/', asyncHandler(async (req, res) => {
  const users = await prisma.user.findMany({ orderBy: { name: 'asc' } });
  res.json({ users });
}));

usersRouter.patch('/:id', asyncHandler(async (req, res) => {
  const input = z.object({ role: z.enum(['STUDENT', 'FACULTY', 'TECHNICIAN', 'ADMIN']).optional(), isActive: z.boolean().optional() })
    .refine((value) => Object.keys(value).length > 0)
    .parse(req.body);
  if (req.params.id === req.user.id && input.isActive === false) return res.status(400).json({ error: 'You cannot disable your own account.' });
  const user = await prisma.user.update({ where: { id: req.params.id }, data: input });
  await prisma.auditLog.create({ data: { action: 'USER_UPDATED', entityType: 'User', entityId: user.id, userId: req.user.id, details: input } });
  res.json({ user });
}));

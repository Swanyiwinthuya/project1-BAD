import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { authenticate, canManageTickets, requireRoles } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';
import { classifyTicket } from '../services/ai.js';
import { checkPeerRoom } from '../services/peer.js';

export const ticketsRouter = Router();
ticketsRouter.use(authenticate);

const createSchema = z.object({
  title: z.string().trim().min(5).max(160),
  description: z.string().trim().min(10).max(5000),
  room: z.string().trim().max(120).optional().or(z.literal(''))
});

function ticketIncludes(showInternal = false) {
  return {
  requester: { select: { id: true, name: true, email: true, role: true } },
  assignedTechnician: { select: { id: true, name: true, email: true } },
  comments: {
    ...(showInternal ? {} : { where: { isInternal: false } }),
    orderBy: { createdAt: 'asc' },
    include: { author: { select: { id: true, name: true, role: true } } }
  }
  };
}

ticketsRouter.get('/', asyncHandler(async (req, res) => {
  const where = canManageTickets(req.user) ? {} : { requesterId: req.user.id };
  const tickets = await prisma.ticket.findMany({ where, include: ticketIncludes(canManageTickets(req.user)), orderBy: { createdAt: 'desc' } });
  res.json({ tickets });
}));

ticketsRouter.post('/', asyncHandler(async (req, res) => {
  const input = createSchema.parse(req.body);
  const [classification, roomCheck] = await Promise.all([
    classifyTicket(input),
    checkPeerRoom(input.room)
  ]);

  const ticket = await prisma.ticket.create({
    data: {
      ...input,
      room: input.room || null,
      category: classification.category,
      priority: roomCheck.active ? 'URGENT' : classification.priority,
      aiReason: roomCheck.active
        ? `Active event reported by partner API. ${classification.reason}`.slice(0, 500)
        : classification.reason,
      requesterId: req.user.id,
      peerRequests: roomCheck.configured
        ? { create: { partnerName: 'Event Booking API', requestType: 'ROOM_CHECK', status: roomCheck.active ? 'ACTIVE_EVENT' : 'NO_ACTIVE_EVENT', payload: roomCheck.data || { error: roomCheck.error } } }
        : undefined
    },
    include: ticketIncludes(canManageTickets(req.user))
  });
  await prisma.auditLog.create({ data: { action: 'TICKET_CREATED', entityType: 'Ticket', entityId: ticket.id, userId: req.user.id } });
  res.status(201).json({ ticket });
}));

ticketsRouter.post('/:id/comments', asyncHandler(async (req, res) => {
  const input = z.object({ content: z.string().trim().min(1).max(3000), isInternal: z.boolean().default(false) }).parse(req.body);
  const ticket = await prisma.ticket.findUnique({ where: { id: req.params.id } });
  if (!ticket) return res.status(404).json({ error: 'Ticket not found.' });
  if (!canManageTickets(req.user) && ticket.requesterId !== req.user.id) return res.status(403).json({ error: 'Permission denied.' });
  if (input.isInternal && !canManageTickets(req.user)) return res.status(403).json({ error: 'Private notes are for technicians.' });

  const comment = await prisma.comment.create({
    data: { ...input, ticketId: ticket.id, authorId: req.user.id },
    include: { author: { select: { id: true, name: true, role: true } } }
  });
  res.status(201).json({ comment });
}));

ticketsRouter.patch('/:id', requireRoles('TECHNICIAN', 'ADMIN'), asyncHandler(async (req, res) => {
  const input = z.object({
    status: z.enum(['OPEN', 'IN_PROGRESS', 'WAITING', 'RESOLVED', 'CLOSED']).optional(),
    priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
    assignedTechnicianId: z.string().cuid().nullable().optional()
  }).refine((value) => Object.keys(value).length > 0).parse(req.body);

  if (input.assignedTechnicianId) {
    const technician = await prisma.user.findFirst({ where: { id: input.assignedTechnicianId, role: { in: ['TECHNICIAN', 'ADMIN'] }, isActive: true } });
    if (!technician) return res.status(400).json({ error: 'Assigned user must be an active technician or administrator.' });
  }
  const ticket = await prisma.ticket.update({ where: { id: req.params.id }, data: input, include: ticketIncludes(true) });
  await prisma.auditLog.create({ data: { action: 'TICKET_UPDATED', entityType: 'Ticket', entityId: ticket.id, userId: req.user.id, details: input } });
  res.json({ ticket });
}));

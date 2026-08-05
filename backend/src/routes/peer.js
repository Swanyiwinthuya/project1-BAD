import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../db.js';
import { asyncHandler } from '../middleware/errors.js';
import { classifyTicket } from '../services/ai.js';

export const peerRouter = Router();

function verifyPeerKey(req, res, next) {
  const expected = process.env.PEER_INBOUND_API_KEY;
  if (!expected || req.get('x-api-key') !== expected) return res.status(401).json({ error: 'Invalid peer API key.' });
  next();
}

peerRouter.post('/tickets', verifyPeerKey, asyncHandler(async (req, res) => {
  const input = z.object({
    externalReference: z.string().trim().min(1).max(191),
    requesterEmail: z.string().email(),
    requesterName: z.string().trim().min(2).max(120).optional(),
    title: z.string().trim().min(5).max(160),
    description: z.string().trim().min(10).max(5000),
    room: z.string().trim().max(120).optional(),
    partnerName: z.string().trim().max(160).optional()
  }).parse(req.body);

  const previous = await prisma.peerRequest.findUnique({ where: { externalReference: input.externalReference }, include: { ticket: true } });
  if (previous) return res.status(200).json({ duplicate: true, ticket: previous.ticket });

  const requesterEmail = input.requesterEmail.toLowerCase();
  const requester = await prisma.user.upsert({
    where: { email: requesterEmail },
    create: { microsoftId: `peer:${requesterEmail}`, email: requesterEmail, name: input.requesterName || requesterEmail, role: 'STUDENT' },
    update: {}
  });
  const classification = await classifyTicket(input);
  const ticket = await prisma.ticket.create({
    data: {
      title: input.title,
      description: input.description,
      room: input.room || null,
      category: classification.category,
      priority: classification.priority,
      aiReason: classification.reason,
      requesterId: requester.id,
      peerRequests: { create: { externalReference: input.externalReference, partnerName: input.partnerName || 'Peer system', requestType: 'CREATE_TICKET', status: 'CREATED', payload: input } }
    }
  });
  res.status(201).json({ ticket });
}));


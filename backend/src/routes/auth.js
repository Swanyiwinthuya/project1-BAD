import { Router } from 'express';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { prisma } from '../db.js';
import { adminEmails } from '../config.js';
import { authenticate } from '../middleware/auth.js';
import { asyncHandler } from '../middleware/errors.js';

export const authRouter = Router();

function issueSession(user) {
  return jwt.sign(
    { role: user.role, email: user.email, name: user.name },
    process.env.JWT_SECRET,
    { subject: user.id, issuer: 'campusfix', audience: 'campusfix-web', expiresIn: '8h' }
  );
}

authRouter.post('/exchange', asyncHandler(async (req, res) => {
  const entraToken = z.object({ accessToken: z.string().min(20) }).parse(req.body).accessToken;
  const tenant = process.env.ENTRA_TENANT_ID;
  const jwks = createRemoteJWKSet(new URL(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`));
  const { payload } = await jwtVerify(entraToken, jwks, {
    issuer: `https://login.microsoftonline.com/${tenant}/v2.0`,
    audience: process.env.ENTRA_CLIENT_ID
  });

  const email = String(payload.preferred_username || payload.email || payload.upn || '').toLowerCase();
  const microsoftId = String(payload.oid || payload.sub || '');
  if (!email || !microsoftId) return res.status(401).json({ error: 'Microsoft token lacks required identity claims.' });

  const existing = await prisma.user.findFirst({ where: { OR: [{ microsoftId }, { email }] } });
  const admin = adminEmails().has(email);
  const identityData = {
    microsoftId,
    email,
    name: String(payload.name || email),
    ...(admin && existing?.role !== 'ADMIN' ? { role: 'ADMIN' } : {})
  };
  const user = existing
    ? await prisma.user.update({ where: { id: existing.id }, data: identityData })
    : await prisma.user.create({ data: { ...identityData, role: admin ? 'ADMIN' : 'STUDENT' } });
  if (!user.isActive) return res.status(403).json({ error: 'This CampusFix account is disabled.' });

  await prisma.auditLog.create({ data: { action: 'LOGIN', entityType: 'User', entityId: user.id, userId: user.id } });
  res.json({ token: issueSession(user), user });
}));

authRouter.post('/dev-login', asyncHandler(async (req, res) => {
  if (process.env.NODE_ENV === 'production' || process.env.DEV_AUTH_BYPASS !== 'true') {
    return res.status(404).json({ error: 'Route not found.' });
  }
  const input = z.object({ email: z.string().email(), name: z.string().min(2).default('Development User') }).parse(req.body);
  const email = input.email.toLowerCase();
  const user = await prisma.user.upsert({
    where: { email },
    create: { microsoftId: `dev:${email}`, email, name: input.name, role: adminEmails().has(email) ? 'ADMIN' : 'STUDENT' },
    update: { name: input.name }
  });
  res.json({ token: issueSession(user), user });
}));

authRouter.get('/me', authenticate, (req, res) => res.json({ user: req.user }));

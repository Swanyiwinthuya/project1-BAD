import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.get('authorization') || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) return res.status(401).json({ error: 'Authentication required.' });

    const payload = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'campusfix',
      audience: 'campusfix-web'
    });
    const user = await prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive) return res.status(401).json({ error: 'Account is unavailable.' });

    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired session.' });
  }
}

export function requireRoles(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return res.status(403).json({ error: 'Permission denied.' });
    next();
  };
}

export function canManageTickets(user) {
  return ['TECHNICIAN', 'ADMIN'].includes(user.role);
}


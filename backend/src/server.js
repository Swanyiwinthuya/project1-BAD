import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { loadConfig } from './config.js';

await loadConfig();

const [{ authRouter }, { healthRouter }, { ticketsRouter }, { usersRouter }, { peerRouter }, { notFound, errorHandler }, { prisma }] = await Promise.all([
  import('./routes/auth.js'),
  import('./routes/health.js'),
  import('./routes/tickets.js'),
  import('./routes/users.js'),
  import('./routes/peer.js'),
  import('./middleware/errors.js'),
  import('./db.js')
]);

const app = express();
app.set('trust proxy', 1);
app.disable('x-powered-by');
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use(cors({
  origin(origin, callback) {
    const allowed = (process.env.CORS_ORIGINS || '').split(',').map((item) => item.trim()).filter(Boolean);
    if (!origin || allowed.includes(origin)) callback(null, true);
    else callback(new Error('Origin is not allowed by CORS.'));
  },
  credentials: false
}));
app.use(express.json({ limit: '256kb' }));
app.use(rateLimit({ windowMs: 60_000, limit: 120, standardHeaders: 'draft-7', legacyHeaders: false }));

const apiRoot = `${process.env.APP_BASE_PATH}/api`;
app.use(`${apiRoot}/health`, healthRouter);
app.use(`${apiRoot}/auth`, authRouter);
app.use(`${apiRoot}/tickets`, ticketsRouter);
app.use(`${apiRoot}/users`, usersRouter);
app.use(`${apiRoot}/peer`, peerRouter);
app.use(notFound);
app.use(errorHandler);

const server = app.listen(Number(process.env.PORT), '127.0.0.1', () => {
  console.log(`CampusFix API listening on http://127.0.0.1:${process.env.PORT}${apiRoot}`);
});

async function shutdown(signal) {
  console.log(`${signal} received; shutting down.`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));


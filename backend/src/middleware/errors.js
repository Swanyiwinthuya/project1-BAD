import { ZodError } from 'zod';

export const asyncHandler = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

export function notFound(req, res) {
  res.status(404).json({ error: 'Route not found.' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  if (error instanceof ZodError) {
    return res.status(400).json({ error: 'Invalid request.', details: error.flatten() });
  }
  console.error(error);
  res.status(error.status || 500).json({ error: error.status ? error.message : 'Unexpected server error.' });
}


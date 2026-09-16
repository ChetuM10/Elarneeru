import { Request, Response, NextFunction } from 'express';

/**
 * Global error handler middleware.
 */
export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  console.error(`[ERROR] ${req.method} ${req.path}:`, err.message);

  if (process.env.NODE_ENV === 'development') {
    console.error(err.stack);
  }

  res.status(500).json({
    error: 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { message: err.message }),
  });
}

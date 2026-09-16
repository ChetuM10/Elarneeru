import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config';
import prisma from '../lib/prisma';

// Extend Express Request to include user info
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        firebaseUid: string;
        phone: string;
        role: string;
      };
    }
  }
}

export interface JwtPayload {
  userId: string;
  firebaseUid: string;
  phone: string;
  role: string;
}

/**
 * Middleware: Verify JWT from Authorization header.
 * Attaches user info to req.user.
 */
export async function authenticate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Missing or invalid authorization header' });
      return;
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret) as JwtPayload;

    // Verify user still exists in DB
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: { id: true, firebaseUid: true, phone: true, role: true },
    });

    if (!user) {
      res.status(401).json({ error: 'User not found' });
      return;
    }

    req.user = {
      id: user.id,
      firebaseUid: user.firebaseUid,
      phone: user.phone,
      role: user.role,
    };

    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

/**
 * Middleware: Require specific role(s).
 * Must be used AFTER authenticate.
 */
export function requireRole(...roles: string[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated' });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }
    next();
  };
}

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { firebaseAuth } from '../lib/firebase';
import prisma from '../lib/prisma';
import { config } from '../config';
import { validate } from '../middleware/validate';
import { authenticate } from '../middleware/auth';

const router = Router();

// ── Schemas ──
const verifyTokenSchema = z.object({
  idToken: z.string().min(1, 'Firebase ID token is required'),
});

const updateProfileSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().optional(),
});

// ── POST /api/v1/auth/verify ──
// Verify Firebase ID token, upsert user, return JWT session token
router.post('/verify', validate(verifyTokenSchema), async (req: Request, res: Response) => {
  try {
    const { idToken } = req.body;

    // Verify the Firebase token
    const decodedToken = await firebaseAuth.verifyIdToken(idToken);
    const { uid, phone_number } = decodedToken;

    if (!phone_number) {
      res.status(400).json({ error: 'Phone number not found in Firebase token' });
      return;
    }

    // Find user by firebaseUid or phone
    let user = await prisma.user.findFirst({
      where: {
        OR: [
          { firebaseUid: uid },
          { phone: phone_number },
        ],
      },
    });

    if (user) {
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          firebaseUid: uid,
          phone: phone_number,
        },
      });
    } else {
      user = await prisma.user.create({
        data: {
          firebaseUid: uid,
          phone: phone_number,
        },
      });
    }

    // Generate session JWT
    const token = jwt.sign(
      {
        userId: user.id,
        firebaseUid: user.firebaseUid,
        phone: user.phone,
        role: user.role,
      },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn as any }
    );

    res.json({
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Auth verify error:', error.message);
    if (error.code === 'auth/id-token-expired') {
      res.status(401).json({ error: 'Firebase token expired' });
      return;
    }
    res.status(401).json({ error: 'Invalid Firebase token' });
  }
});

// ── GET /api/v1/auth/me ──
// Get current user profile
router.get('/me', authenticate, async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.id },
      include: {
        addresses: true,
        subscriptions: {
          include: { plan: true, address: true },
          where: { status: { not: 'CANCELLED' } },
        },
      },
    });

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ── PATCH /api/v1/auth/profile ──
// Update user name/email
router.patch('/profile', authenticate, validate(updateProfileSchema), async (req: Request, res: Response) => {
  try {
    const user = await prisma.user.update({
      where: { id: req.user!.id },
      data: req.body,
    });

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error: any) {
    console.error('Update profile error:', error.message);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;

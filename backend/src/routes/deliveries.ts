import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';

const router = Router();

// All delivery routes require authentication
router.use(authenticate);

// ── GET /api/v1/deliveries/upcoming ──
// Get upcoming deliveries for current user
router.get('/upcoming', async (req: Request, res: Response) => {
  try {
    const deliveries = await prisma.delivery.findMany({
      where: {
        subscription: { userId: req.user!.id },
        status: { in: ['PENDING', 'OUT_FOR_DELIVERY'] },
        scheduledDate: { gte: new Date() },
      },
      include: {
        subscription: {
          select: {
            plan: { select: { name: true, quantity: true } },
            address: { select: { line1: true, pincode: true, label: true } },
          },
        },
      },
      orderBy: { scheduledDate: 'asc' },
      take: 14,
    });

    res.json({ deliveries });
  } catch (error: any) {
    console.error('Upcoming deliveries error:', error.message);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// ── GET /api/v1/deliveries/history ──
// Get past deliveries for current user
router.get('/history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [deliveries, total] = await Promise.all([
      prisma.delivery.findMany({
        where: {
          subscription: { userId: req.user!.id },
          status: { in: ['DELIVERED', 'MISSED'] },
        },
        include: {
          subscription: {
            select: {
              plan: { select: { name: true } },
            },
          },
        },
        orderBy: { scheduledDate: 'desc' },
        skip,
        take: limit,
      }),
      prisma.delivery.count({
        where: {
          subscription: { userId: req.user!.id },
          status: { in: ['DELIVERED', 'MISSED'] },
        },
      }),
    ]);

    res.json({
      deliveries,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Delivery history error:', error.message);
    res.status(500).json({ error: 'Failed to fetch delivery history' });
  }
});

export default router;

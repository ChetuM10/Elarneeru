import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate, requireRole } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All admin routes require ADMIN role
router.use(authenticate, requireRole('ADMIN'));

// ── GET /api/v1/admin/overview ──
// Dashboard overview stats
router.get('/overview', async (_req: Request, res: Response) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [
      activeSubscriptions,
      totalCustomers,
      todayDeliveries,
      todayDelivered,
      todayMissed,
      monthRevenue,
    ] = await Promise.all([
      prisma.subscription.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
      prisma.delivery.count({
        where: { scheduledDate: { gte: today, lt: tomorrow } },
      }),
      prisma.delivery.count({
        where: { scheduledDate: { gte: today, lt: tomorrow }, status: 'DELIVERED' },
      }),
      prisma.delivery.count({
        where: { scheduledDate: { gte: today, lt: tomorrow }, status: 'MISSED' },
      }),
      prisma.payment.aggregate({
        where: {
          status: 'SUCCESS',
          createdAt: {
            gte: new Date(today.getFullYear(), today.getMonth(), 1),
          },
        },
        _sum: { amount: true },
      }),
    ]);

    res.json({
      activeSubscriptions,
      totalCustomers,
      todayDeliveries: {
        total: todayDeliveries,
        delivered: todayDelivered,
        missed: todayMissed,
        pending: todayDeliveries - todayDelivered - todayMissed,
      },
      monthRevenue: (monthRevenue._sum.amount || 0) / 100, // paise to rupees
    });
  } catch (error: any) {
    console.error('Admin overview error:', error.message);
    res.status(500).json({ error: 'Failed to fetch overview' });
  }
});

// ── GET /api/v1/admin/deliveries?date=YYYY-MM-DD ──
// Get all deliveries for a specific date
router.get('/deliveries', async (req: Request, res: Response) => {
  try {
    const dateStr = (req.query.date as string) || new Date().toISOString().split('T')[0];
    const date = new Date(dateStr);
    date.setHours(0, 0, 0, 0);
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);

    const deliveries = await prisma.delivery.findMany({
      where: {
        scheduledDate: { gte: date, lt: nextDay },
      },
      include: {
        subscription: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
            plan: { select: { name: true } },
            address: true,
          },
        },
      },
      orderBy: [
        { subscription: { address: { pincode: 'asc' } } },
        { createdAt: 'asc' },
      ],
    });

    // Group by pincode for dispatch view
    const byPincode: Record<string, typeof deliveries> = {};
    for (const d of deliveries) {
      const pin = d.subscription.address.pincode;
      if (!byPincode[pin]) byPincode[pin] = [];
      byPincode[pin].push(d);
    }

    res.json({
      date: dateStr,
      total: deliveries.length,
      deliveries,
      byPincode,
    });
  } catch (error: any) {
    console.error('Admin deliveries error:', error.message);
    res.status(500).json({ error: 'Failed to fetch deliveries' });
  }
});

// ── PATCH /api/v1/admin/deliveries/:id/status ──
const updateDeliveryStatusSchema = z.object({
  status: z.enum(['OUT_FOR_DELIVERY', 'DELIVERED', 'MISSED', 'CANCELLED']),
  notes: z.string().optional(),
  deliveryPartner: z.string().optional(),
});

router.patch(
  '/deliveries/:id/status',
  validate(updateDeliveryStatusSchema),
  async (req: Request, res: Response) => {
    try {
      const { status, notes, deliveryPartner } = req.body;

      const delivery = await prisma.delivery.findUnique({
        where: { id: (req.params.id as string) },
      });

      if (!delivery) {
        res.status(404).json({ error: 'Delivery not found' });
        return;
      }

      const updateData: any = { status, notes, deliveryPartner };
      if (status === 'DELIVERED') {
        updateData.deliveredAt = new Date();
      }

      const updated = await prisma.delivery.update({
        where: { id: (req.params.id as string) },
        data: updateData,
      });

      res.json({ delivery: updated });
    } catch (error: any) {
      console.error('Update delivery status error:', error.message);
      res.status(500).json({ error: 'Failed to update delivery status' });
    }
  }
);

// ── GET /api/v1/admin/customers ──
// List all customers with subscription info
router.get('/customers', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const [customers, total] = await Promise.all([
      prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        include: {
          subscriptions: {
            select: { id: true, status: true, plan: { select: { name: true } } },
          },
          addresses: { select: { pincode: true, label: true }, take: 1 },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.user.count({ where: { role: 'CUSTOMER' } }),
    ]);

    res.json({
      customers,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error: any) {
    console.error('Admin customers error:', error.message);
    res.status(500).json({ error: 'Failed to fetch customers' });
  }
});

export default router;

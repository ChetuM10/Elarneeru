import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All subscription routes require authentication
router.use(authenticate);

// ── Schemas ──
const createSubscriptionSchema = z.object({
  planId: z.string().min(1),
  addressId: z.string().uuid(),
  startDate: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  quantity: z.number().int().min(1).default(1),
});

const skipDateSchema = z.object({
  date: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
});

const pauseSchema = z.object({
  reason: z.string().optional(),
});

// ── POST /api/v1/subscriptions ──
// Create a new subscription (defaults to PENDING)
router.post('/', validate(createSubscriptionSchema), async (req: Request, res: Response) => {
  try {
    const { planId, addressId, startDate, quantity } = req.body;
    const userId = req.user!.id;

    // Verify plan exists and is active
    const plan = await prisma.plan.findUnique({ where: { id: planId } });
    if (!plan || !plan.isActive) {
      res.status(400).json({ error: 'Invalid or inactive plan' });
      return;
    }

    // Verify address belongs to user
    const address = await prisma.address.findFirst({
      where: { id: addressId, userId },
    });
    if (!address) {
      res.status(400).json({ error: 'Address not found' });
      return;
    }

    // Check pincode is serviceable
    const serviceable = await prisma.serviceableArea.findUnique({
      where: { pincode: address.pincode },
    });
    if (!serviceable || !serviceable.isActive) {
      res.status(400).json({ error: 'Delivery not available in your area yet' });
      return;
    }

    // Check user doesn't already have an active/pending subscription for this plan
    const existing = await prisma.subscription.findFirst({
      where: { userId, planId, status: { in: ['ACTIVE', 'PENDING'] } },
    });
    if (existing) {
      res.status(409).json({ error: 'You already have an active or pending subscription for this plan' });
      return;
    }

    const parsedStartDate = new Date(startDate);
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planId,
        addressId,
        quantity,
        startDate: parsedStartDate,
        nextDelivery: parsedStartDate,
      },
      include: { plan: true, address: true },
    });

    res.status(201).json({ subscription });
  } catch (error: any) {
    console.error('Create subscription error:', error.message);
    res.status(500).json({ error: 'Failed to create subscription' });
  }
});

// ── GET /api/v1/subscriptions/me ──
// Get all subscriptions for current user
router.get('/me', async (req: Request, res: Response) => {
  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: req.user!.id },
      include: {
        plan: { include: { product: true } },
        address: true,
        pauses: { where: { pauseEnd: null }, take: 1 },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json({ subscriptions });
  } catch (error: any) {
    console.error('Get subscriptions error:', error.message);
    res.status(500).json({ error: 'Failed to fetch subscriptions' });
  }
});

// ── GET /api/v1/subscriptions/:id ──
// Get single subscription detail
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: (req.params.id as string), userId: req.user!.id },
      include: {
        plan: { include: { product: true } },
        address: true,
        pauses: { orderBy: { createdAt: 'desc' }, take: 5 },
        deliveries: { orderBy: { scheduledDate: 'desc' }, take: 30 },
        skipDates: { orderBy: { date: 'desc' }, take: 30 },
      },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    res.json({ subscription });
  } catch (error: any) {
    console.error('Get subscription error:', error.message);
    res.status(500).json({ error: 'Failed to fetch subscription' });
  }
});

// ── POST /api/v1/subscriptions/:id/pause ──
router.post('/:id/pause', validate(pauseSchema), async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: (req.params.id as string), userId: req.user!.id, status: 'ACTIVE' },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Active subscription not found' });
      return;
    }

    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: { status: 'PAUSED' },
      }),
      prisma.subscriptionPause.create({
        data: {
          subscriptionId: subscription.id,
          pauseStart: new Date(),
          reason: req.body.reason,
        },
      }),
    ]);

    res.json({ message: 'Subscription paused successfully' });
  } catch (error: any) {
    console.error('Pause subscription error:', error.message);
    res.status(500).json({ error: 'Failed to pause subscription' });
  }
});

// ── POST /api/v1/subscriptions/:id/resume ──
router.post('/:id/resume', async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: (req.params.id as string), userId: req.user!.id, status: 'PAUSED' },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Paused subscription not found' });
      return;
    }

    // Close open pause record
    const openPause = await prisma.subscriptionPause.findFirst({
      where: { subscriptionId: subscription.id, pauseEnd: null },
    });

    await prisma.$transaction([
      prisma.subscription.update({
        where: { id: subscription.id },
        data: {
          status: 'ACTIVE',
          nextDelivery: new Date(), // Resume from tomorrow
        },
      }),
      ...(openPause
        ? [
            prisma.subscriptionPause.update({
              where: { id: openPause.id },
              data: { pauseEnd: new Date() },
            }),
          ]
        : []),
    ]);

    res.json({ message: 'Subscription resumed successfully' });
  } catch (error: any) {
    console.error('Resume subscription error:', error.message);
    res.status(500).json({ error: 'Failed to resume subscription' });
  }
});

// ── POST /api/v1/subscriptions/:id/cancel ──
router.post('/:id/cancel', async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: {
        id: (req.params.id as string),
        userId: req.user!.id,
        status: { in: ['ACTIVE', 'PAUSED'] },
      },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found or already cancelled' });
      return;
    }

    await prisma.subscription.update({
      where: { id: subscription.id },
      data: {
        status: 'CANCELLED',
        endDate: new Date(),
      },
    });

    res.json({ message: 'Subscription cancelled successfully' });
  } catch (error: any) {
    console.error('Cancel subscription error:', error.message);
    res.status(500).json({ error: 'Failed to cancel subscription' });
  }
});

// ── POST /api/v1/subscriptions/:id/skip-date ──
router.post('/:id/skip-date', validate(skipDateSchema), async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: (req.params.id as string), userId: req.user!.id, status: 'ACTIVE' },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Active subscription not found' });
      return;
    }

    const skipDate = new Date(req.body.date);

    // Don't allow skipping past dates
    if (skipDate < new Date()) {
      res.status(400).json({ error: 'Cannot skip a date in the past' });
      return;
    }

    await prisma.skipDate.create({
      data: {
        subscriptionId: subscription.id,
        date: skipDate,
      },
    });

    res.json({ message: `Delivery skipped for ${skipDate.toISOString().split('T')[0]}` });
  } catch (error: any) {
    if (error.code === 'P2002') {
      res.status(409).json({ error: 'Already skipped this date' });
      return;
    }
    console.error('Skip date error:', error.message);
    res.status(500).json({ error: 'Failed to skip date' });
  }
});

// ── DELETE /api/v1/subscriptions/:id/skip-date/:skipId ──
// Undo a skipped delivery date
router.delete('/:id/skip-date/:skipId', async (req: Request, res: Response) => {
  try {
    const subscription = await prisma.subscription.findFirst({
      where: { id: (req.params.id as string), userId: req.user!.id },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    const skipRecord = await prisma.skipDate.findFirst({
      where: {
        id: (req.params.skipId as string),
        subscriptionId: subscription.id,
      },
    });

    if (!skipRecord) {
      res.status(404).json({ error: 'Skip date not found' });
      return;
    }

    // Don't allow undoing past skip dates
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (skipRecord.date < today) {
      res.status(400).json({ error: 'Cannot undo a skip date in the past' });
      return;
    }

    await prisma.skipDate.delete({ where: { id: skipRecord.id } });

    res.json({ message: 'Skip removed — delivery will be scheduled as normal' });
  } catch (error: any) {
    console.error('Delete skip date error:', error.message);
    res.status(500).json({ error: 'Failed to remove skip date' });
  }
});

export default router;

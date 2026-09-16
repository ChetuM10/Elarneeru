import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ── GET /api/v1/plans ──
// List all active plans (public)
router.get('/', async (_req: Request, res: Response) => {
  try {
    const plans = await prisma.plan.findMany({
      where: { isActive: true },
      include: {
        product: {
          select: { name: true, unitLabel: true },
        },
      },
      orderBy: { pricePerUnit: 'asc' },
    });

    // Convert paise to rupees for frontend display
    const formattedPlans = plans.map((plan) => ({
      ...plan,
      priceDisplay: `₹${(plan.pricePerUnit / 100).toFixed(0)}`,
    }));

    res.json({ plans: formattedPlans });
  } catch (error: any) {
    console.error('List plans error:', error.message);
    res.status(500).json({ error: 'Failed to fetch plans' });
  }
});

// ── GET /api/v1/plans/:slug ──
// Get a single plan by slug
router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const plan = await prisma.plan.findUnique({
      where: { slug: (req.params.slug as string) },
      include: {
        product: {
          select: { name: true, unitLabel: true, description: true },
        },
      },
    });

    if (!plan || !plan.isActive) {
      res.status(404).json({ error: 'Plan not found' });
      return;
    }

    res.json({ plan });
  } catch (error: any) {
    console.error('Get plan error:', error.message);
    res.status(500).json({ error: 'Failed to fetch plan' });
  }
});

export default router;

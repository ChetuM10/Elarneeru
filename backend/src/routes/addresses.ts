import { Router, Request, Response } from 'express';
import { z } from 'zod';
import prisma from '../lib/prisma';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';

const router = Router();

// All address routes require authentication
router.use(authenticate);

// ── Schemas ──
const createAddressSchema = z.object({
  label: z.string().min(1).max(50).default('Home'),
  line1: z.string().min(1).max(200),
  line2: z.string().max(200).optional(),
  pincode: z.string().length(6),
  landmark: z.string().max(200).optional(),
  lat: z.number().optional(),
  lng: z.number().optional(),
  isDefault: z.boolean().optional(),
});

const updateAddressSchema = createAddressSchema.partial();

// ── GET /api/v1/addresses ──
router.get('/', async (req: Request, res: Response) => {
  try {
    const addresses = await prisma.address.findMany({
      where: { userId: req.user!.id },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });

    res.json({ addresses });
  } catch (error: any) {
    console.error('List addresses error:', error.message);
    res.status(500).json({ error: 'Failed to fetch addresses' });
  }
});

// ── POST /api/v1/addresses ──
router.post('/', validate(createAddressSchema), async (req: Request, res: Response) => {
  try {
    const userId = req.user!.id;
    const { isDefault, ...data } = req.body;

    // If this is the default, unset others
    if (isDefault) {
      await prisma.address.updateMany({
        where: { userId, isDefault: true },
        data: { isDefault: false },
      });
    }

    // If first address, make it default
    const count = await prisma.address.count({ where: { userId } });

    const address = await prisma.address.create({
      data: {
        ...data,
        userId,
        isDefault: isDefault || count === 0,
      },
    });

    res.status(201).json({ address });
  } catch (error: any) {
    console.error('Create address error:', error.message);
    res.status(500).json({ error: 'Failed to create address' });
  }
});

// ── PATCH /api/v1/addresses/:id ──
router.patch('/:id', validate(updateAddressSchema), async (req: Request, res: Response) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: (req.params.id as string), userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Address not found' });
      return;
    }

    if (req.body.isDefault) {
      await prisma.address.updateMany({
        where: { userId: req.user!.id, isDefault: true },
        data: { isDefault: false },
      });
    }

    const address = await prisma.address.update({
      where: { id: (req.params.id as string) },
      data: req.body,
    });

    res.json({ address });
  } catch (error: any) {
    console.error('Update address error:', error.message);
    res.status(500).json({ error: 'Failed to update address' });
  }
});

// ── DELETE /api/v1/addresses/:id ──
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const existing = await prisma.address.findFirst({
      where: { id: (req.params.id as string), userId: req.user!.id },
    });

    if (!existing) {
      res.status(404).json({ error: 'Address not found' });
      return;
    }

    // Check if address is used by active subscriptions
    const activeSubs = await prisma.subscription.count({
      where: { addressId: (req.params.id as string), status: 'ACTIVE' },
    });

    if (activeSubs > 0) {
      res.status(409).json({ error: 'Cannot delete address used by an active subscription' });
      return;
    }

    await prisma.address.delete({ where: { id: (req.params.id as string) } });
    res.json({ message: 'Address deleted' });
  } catch (error: any) {
    console.error('Delete address error:', error.message);
    res.status(500).json({ error: 'Failed to delete address' });
  }
});

export default router;

import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// ── GET /api/v1/serviceability/check?pincode=560034 ──
router.get('/check', async (req: Request, res: Response) => {
  try {
    const { pincode } = req.query;

    if (!pincode || typeof pincode !== 'string' || pincode.length !== 6) {
      res.status(400).json({ error: 'Valid 6-digit pincode is required' });
      return;
    }

    const area = await prisma.serviceableArea.findUnique({
      where: { pincode },
    });

    if (area && area.isActive) {
      res.json({
        serviceable: true,
        pincode,
        area: area.area,
        city: area.city,
      });
    } else {
      res.json({
        serviceable: false,
        pincode,
        message: "We're not in your area yet — but expanding fast. We'll notify you.",
      });
    }
  } catch (error: any) {
    console.error('Serviceability check error:', error.message);
    res.status(500).json({ error: 'Failed to check serviceability' });
  }
});

// ── GET /api/v1/serviceability/areas ──
// List all serviceable areas (public)
router.get('/areas', async (_req: Request, res: Response) => {
  try {
    const areas = await prisma.serviceableArea.findMany({
      where: { isActive: true },
      select: { pincode: true, area: true, city: true },
      orderBy: { pincode: 'asc' },
    });

    res.json({ areas });
  } catch (error: any) {
    console.error('List areas error:', error.message);
    res.status(500).json({ error: 'Failed to list areas' });
  }
});

export default router;

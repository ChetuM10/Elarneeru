import { Router, Request, Response } from 'express';
import { z } from 'zod';
import crypto from 'crypto';
import prisma from '../lib/prisma';
import razorpay from '../lib/razorpay';
import { authenticate } from '../middleware/auth';
import { validate } from '../middleware/validate';
import { config } from '../config';

const router = Router();

// ── Schemas ──
const createOrderSchema = z.object({
  subscriptionId: z.string().uuid(),
  amount: z.number().int().positive(), // Amount in paise
  periodStart: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
  periodEnd: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date'),
});

const verifyPaymentSchema = z.object({
  razorpay_order_id: z.string().min(1),
  razorpay_payment_id: z.string().min(1),
  razorpay_signature: z.string().min(1),
});

// ── POST /api/v1/payments/create-order ──
// Create a Razorpay order (authenticated)
router.post('/create-order', authenticate, validate(createOrderSchema), async (req: Request, res: Response) => {
  try {
    const { subscriptionId, amount, periodStart, periodEnd } = req.body;
    const userId = req.user!.id;

    // Verify subscription belongs to user
    const subscription = await prisma.subscription.findFirst({
      where: { id: subscriptionId, userId },
    });

    if (!subscription) {
      res.status(404).json({ error: 'Subscription not found' });
      return;
    }

    // Create Razorpay order
    const order = await razorpay.orders.create({
      amount,
      currency: 'INR',
      receipt: `eln_${Date.now()}`,
      notes: {
        subscriptionId,
        userId,
      },
    });

    // Record payment in DB
    await prisma.payment.create({
      data: {
        userId,
        subscriptionId,
        amount,
        method: 'RAZORPAY',
        status: 'INITIATED',
        razorpayOrderId: order.id,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
      },
    });

    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      key: config.razorpay.keyId,
    });
  } catch (error: any) {
    console.error('Create order error:', error.message);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// ── POST /api/v1/payments/verify ──
// Verify Razorpay payment signature (authenticated)
router.post('/verify', authenticate, validate(verifyPaymentSchema), async (req: Request, res: Response) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify HMAC signature
    const body = razorpay_order_id + '|' + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.keySecret)
      .update(body)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      // Mark payment as failed
      await prisma.payment.update({
        where: { razorpayOrderId: razorpay_order_id },
        data: { status: 'FAILED' },
      });
      res.status(400).json({ error: 'Payment verification failed' });
      return;
    }

    // Mark payment as success
    const payment = await prisma.payment.update({
      where: { razorpayOrderId: razorpay_order_id },
      data: {
        status: 'SUCCESS',
        razorpayPaymentId: razorpay_payment_id,
        razorpaySignature: razorpay_signature,
      },
    });

    if (payment.subscriptionId) {
      await prisma.subscription.update({
        where: { id: payment.subscriptionId },
        data: { status: 'ACTIVE' },
      });
    }

    res.json({ message: 'Payment verified successfully', payment });
  } catch (error: any) {
    console.error('Verify payment error:', error.message);
    res.status(500).json({ error: 'Payment verification failed' });
  }
});

// ── POST /api/v1/payments/webhook ──
// Razorpay webhook handler (no auth — uses signature verification)
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const webhookSignature = req.headers['x-razorpay-signature'] as string;
    const webhookBody = JSON.stringify(req.body);

    const expectedSignature = crypto
      .createHmac('sha256', config.razorpay.webhookSecret)
      .update(webhookBody)
      .digest('hex');

    if (expectedSignature !== webhookSignature) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    const event = req.body.event;
    const payload = req.body.payload;

    switch (event) {
      case 'payment.captured': {
        const orderId = payload.payment.entity.order_id;
        const paymentId = payload.payment.entity.id;

        const payment = await prisma.payment.update({
          where: { razorpayOrderId: orderId },
          data: {
            status: 'SUCCESS',
            razorpayPaymentId: paymentId,
          },
        });
        
        if (payment.subscriptionId) {
          await prisma.subscription.update({
            where: { id: payment.subscriptionId },
            data: { status: 'ACTIVE' },
          });
        }
        break;
      }
      case 'payment.failed': {
        const orderId = payload.payment.entity.order_id;
        await prisma.payment.update({
          where: { razorpayOrderId: orderId },
          data: { status: 'FAILED' },
        });
        break;
      }
      default:
        console.log(`Unhandled webhook event: ${event}`);
    }

    res.json({ status: 'ok' });
  } catch (error: any) {
    console.error('Webhook error:', error.message);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

// ── GET /api/v1/payments/history ──
// Get payment history for current user
router.get('/history', authenticate, async (req: Request, res: Response) => {
  try {
    const payments = await prisma.payment.findMany({
      where: { userId: req.user!.id },
      include: {
        subscription: {
          select: { plan: { select: { name: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({ payments });
  } catch (error: any) {
    console.error('Payment history error:', error.message);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

export default router;

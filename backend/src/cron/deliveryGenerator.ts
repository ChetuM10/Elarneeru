import cron from 'node-cron';
import prisma from '../lib/prisma';

/**
 * Nightly Delivery Generation Cron
 * Runs at 20:00 IST (14:30 UTC) every day.
 * Generates next-day delivery records for all active, non-paused subscriptions
 * that are not skipped for that date.
 */
export function startDeliveryCron(): void {
  // 20:00 IST = 14:30 UTC
  cron.schedule('30 14 * * *', async () => {
    console.log('[CRON] Starting nightly delivery generation...');

    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      tomorrow.setHours(0, 0, 0, 0);

      const tomorrowEnd = new Date(tomorrow);
      tomorrowEnd.setHours(23, 59, 59, 999);

      // Get all active subscriptions
      const activeSubscriptions = await prisma.subscription.findMany({
        where: { status: 'ACTIVE' },
        include: {
          plan: true,
          skipDates: {
            where: {
              date: { gte: tomorrow, lte: tomorrowEnd },
            },
          },
        },
      });

      let created = 0;
      let skipped = 0;

      for (const sub of activeSubscriptions) {
        // Skip if this date is in skip list
        if (sub.skipDates.length > 0) {
          skipped++;
          continue;
        }

        // Check frequency logic
        if (!shouldDeliverOn(sub.plan.frequency, sub.startDate, tomorrow)) {
          continue;
        }

        // Check if delivery already exists for this sub + date
        const existing = await prisma.delivery.findUnique({
          where: {
            subscriptionId_scheduledDate: {
              subscriptionId: sub.id,
              scheduledDate: tomorrow,
            },
          },
        });

        if (existing) continue;

        // Create delivery record
        await prisma.delivery.create({
          data: {
            subscriptionId: sub.id,
            scheduledDate: tomorrow,
            quantity: sub.plan.quantity,
            status: 'PENDING',
          },
        });

        // Update next delivery date on subscription
        await prisma.subscription.update({
          where: { id: sub.id },
          data: { nextDelivery: tomorrow },
        });

        created++;
      }

      console.log(`[CRON] Done. Created: ${created}, Skipped: ${skipped}, Total active: ${activeSubscriptions.length}`);
    } catch (error) {
      console.error('[CRON] Delivery generation failed:', error);
    }
  });

  console.log('[CRON] Delivery generation cron scheduled (20:00 IST daily)');
}

/**
 * Determine if a delivery should happen on a given date based on frequency
 */
function shouldDeliverOn(
  frequency: string,
  startDate: Date,
  targetDate: Date
): boolean {
  const daysSinceStart = Math.floor(
    (targetDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)
  );

  switch (frequency) {
    case 'DAILY':
      return true;
    case 'ALTERNATE_DAYS':
      return daysSinceStart % 2 === 0;
    case 'TWICE_A_WEEK': {
      const day = targetDate.getDay();
      return day === 1 || day === 4; // Monday & Thursday
    }
    case 'WEEKLY': {
      return daysSinceStart % 7 === 0;
    }
    default:
      return true;
  }
}

/**
 * Manual trigger for delivery generation (for testing or admin use)
 */
export async function generateDeliveriesForDate(date: Date): Promise<{ created: number; skipped: number }> {
  const targetDate = new Date(date);
  targetDate.setHours(0, 0, 0, 0);

  const targetDateEnd = new Date(targetDate);
  targetDateEnd.setHours(23, 59, 59, 999);

  const activeSubscriptions = await prisma.subscription.findMany({
    where: { status: 'ACTIVE' },
    include: {
      plan: true,
      skipDates: {
        where: {
          date: { gte: targetDate, lte: targetDateEnd },
        },
      },
    },
  });

  let created = 0;
  let skipped = 0;

  for (const sub of activeSubscriptions) {
    if (sub.skipDates.length > 0) {
      skipped++;
      continue;
    }

    if (!shouldDeliverOn(sub.plan.frequency, sub.startDate, targetDate)) {
      continue;
    }

    const existing = await prisma.delivery.findUnique({
      where: {
        subscriptionId_scheduledDate: {
          subscriptionId: sub.id,
          scheduledDate: targetDate,
        },
      },
    });

    if (existing) continue;

    await prisma.delivery.create({
      data: {
        subscriptionId: sub.id,
        scheduledDate: targetDate,
        quantity: sub.plan.quantity,
        status: 'PENDING',
      },
    });

    created++;
  }

  return { created, skipped };
}

import 'dotenv/config';
import { generateDeliveriesForDate } from './src/cron/deliveryGenerator';
import prisma from './src/lib/prisma';

async function main() {
  const targetDate = new Date('2026-09-15');
  console.log(`Generating deliveries for ${targetDate.toISOString().split('T')[0]}...`);
  
  const result = await generateDeliveriesForDate(targetDate);
  
  console.log(`Success! Created ${result.created} deliveries. Skipped ${result.skipped} deliveries.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

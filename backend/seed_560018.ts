import 'dotenv/config';
import prisma from './src/lib/prisma';

async function main() {
  await prisma.serviceableArea.upsert({
    where: { pincode: '560018' },
    update: { isActive: true },
    create: {
      pincode: '560018',
      area: 'Chamarajpet',
      city: 'Bengaluru',
      isActive: true,
    }
  });
  console.log('Added 560018');
}

main().catch(console.error).finally(() => prisma.$disconnect());

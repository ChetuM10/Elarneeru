import 'dotenv/config';
import prisma from './src/lib/prisma';

const areas = [
  { pincode: '560018', area: 'Chamarajpet', city: 'Bengaluru' },
  { pincode: '560060', area: 'Kengeri', city: 'Bengaluru' },
  { pincode: '560072', area: 'Nagarbhavi', city: 'Bengaluru' },
  { pincode: '560083', area: 'Gottigere', city: 'Bengaluru' },
  { pincode: '562159', area: 'Ramanagara', city: 'Ramanagara' },
];

async function main() {
  for (const item of areas) {
    await prisma.serviceableArea.upsert({
      where: { pincode: item.pincode },
      update: { isActive: true, area: item.area, city: item.city },
      create: {
        pincode: item.pincode,
        area: item.area,
        city: item.city,
        isActive: true,
      },
    });
    console.log(`✅ Added/Updated ${item.pincode} — ${item.area}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

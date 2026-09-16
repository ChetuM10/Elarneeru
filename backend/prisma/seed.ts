import 'dotenv/config';
import prisma from '../src/lib/prisma';

async function seed() {
  console.log('🌱 Seeding database...');

  // ── Product ──
  const product = await prisma.product.upsert({
    where: { id: 'prod-tender-coconut-001' },
    create: {
      id: 'prod-tender-coconut-001',
      name: 'Tender Coconut',
      description: 'Farm-fresh tender coconut from Kanakapura, harvested before sunrise',
      unitLabel: 'coconut',
    },
    update: {},
  });
  console.log('✅ Product:', product.name);

  // ── Plans ──
  const plans = [
    {
      id: 'plan-solo-sip-001',
      productId: product.id,
      name: 'Solo Sip',
      slug: 'solo-sip',
      description: 'One tender coconut, delivered every morning. Built for a single daily habit.',
      tag: 'Solo',
      quantity: 1,
      pricePerUnit: 6500, // ₹65 in paise
      frequency: 'DAILY' as const,
    },
    {
      id: 'plan-family-pack-001',
      productId: product.id,
      name: 'Family Pack',
      slug: 'family-pack',
      description: 'Three coconuts a day — enough for a small household to share.',
      tag: 'Most chosen',
      quantity: 3,
      pricePerUnit: 17000, // ₹170 in paise
      frequency: 'DAILY' as const,
    },
    {
      id: 'plan-office-crate-001',
      productId: product.id,
      name: 'Office Crate',
      slug: 'office-crate',
      description: 'Ten coconuts, twice a week — for offices, gyms, and cafés.',
      tag: 'Bulk',
      quantity: 10,
      pricePerUnit: 52000, // ₹520 in paise
      frequency: 'TWICE_A_WEEK' as const,
    },
    {
      id: 'plan-custom-001',
      productId: product.id,
      name: 'Custom Plan',
      slug: 'custom-plan',
      description: 'Choose exactly how many coconuts you want delivered.',
      tag: 'Flexible',
      quantity: 1, // Default, will be overridden by Subscription.quantity
      pricePerUnit: 6500, // ₹65 per coconut base price
      frequency: 'DAILY' as const,
    },
  ];

  for (const plan of plans) {
    await prisma.plan.upsert({
      where: { id: plan.id },
      create: plan,
      update: {},
    });
    console.log(`✅ Plan: ${plan.name} (₹${plan.pricePerUnit / 100})`);
  }

  // ── Serviceable Areas (Bengaluru) ──
  const areas = [
    { pincode: '560001', area: 'MG Road / Brigade Road' },
    { pincode: '560008', area: 'Shivajinagar' },
    { pincode: '560034', area: 'HSR Layout' },
    { pincode: '560038', area: 'Indiranagar' },
    { pincode: '560068', area: 'Koramangala' },
    { pincode: '560095', area: 'Whitefield' },
    { pincode: '560102', area: 'Electronic City' },
    { pincode: '560011', area: 'Jayanagar' },
    { pincode: '560078', area: 'BTM Layout' },
    { pincode: '560085', area: 'Marathahalli' },
    { pincode: '560018', area: 'Chamarajpet' },
    { pincode: '560060', area: 'Kengeri' },
    { pincode: '560072', area: 'Nagarbhavi' },
    { pincode: '560083', area: 'Gottigere' },
    { pincode: '562159', area: 'Ramanagara' },
  ];

  for (const area of areas) {
    await prisma.serviceableArea.upsert({
      where: { pincode: area.pincode },
      create: {
        pincode: area.pincode,
        area: area.area,
        city: 'Bengaluru',
        isActive: true,
      },
      update: {},
    });
    console.log(`✅ Area: ${area.pincode} — ${area.area}`);
  }

  // ── Admin user (will be created on first Firebase login, but create a placeholder) ──
  // Note: The actual admin user will be created when they verify via Firebase.
  // For dev purposes, you can manually update a user's role to ADMIN in the DB.

  console.log('\n🎉 Seed complete!');
  console.log('  - 1 product');
  console.log(`  - ${plans.length} plans`);
  console.log(`  - ${areas.length} serviceable areas`);
}

seed()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

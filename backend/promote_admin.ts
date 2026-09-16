import prisma from './src/lib/prisma';

async function main() {
  // Update all users to ADMIN for testing purposes
  const result = await prisma.user.updateMany({
    data: { role: 'ADMIN' },
  });

  console.log(`Successfully promoted ${result.count} users to ADMIN role.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

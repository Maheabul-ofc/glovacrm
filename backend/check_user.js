const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany();
  console.log('ALL USERS IN DB:');
  users.forEach(u => console.log(`- ${u.email} (${u.role}, Status: ${u.status})`));
}

main().catch(console.error).finally(() => prisma.$disconnect());

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { email: { contains: 'mahea', mode: 'insensitive' } },
    include: { tenant: true }
  });
  console.log(JSON.stringify(users, null, 2));
}

main().finally(() => prisma.$disconnect());

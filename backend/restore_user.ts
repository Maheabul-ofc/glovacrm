import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const existingUser = await prisma.user.findFirst({ where: { email: 'maheabulmunna@gmail.com' } });
  if (existingUser) return console.log('Already exists');

  const tenant = await prisma.tenant.create({
    data: {
      name: 'My Workspace',
      slug: 'my-workspace',
      status: 'ACTIVE',
      plan: 'FREE',
    },
  });

  const passwordHash = await bcrypt.hash('mahea123', 10);

  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email: 'maheabulmunna@gmail.com',
      passwordHash,
      firstName: 'Mahea',
      lastName: 'Munna',
      role: 'TENANT_ADMIN',
      status: 'ACTIVE',
    },
  });

  console.log(`Created user ${user.email} with password 'mahea123'`);
}

main().catch(console.error).finally(() => prisma.$disconnect());

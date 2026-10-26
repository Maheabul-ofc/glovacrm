import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@glovacrm.com';
  const password = 'password123';
  const tenantName = 'GlovaCRM Platform';
  
  console.log(`Starting Super Admin creation...`);

  // Check if super admin already exists
  const existingAdmin = await prisma.user.findFirst({
    where: { email }
  });

  if (existingAdmin) {
    console.log(`User ${email} already exists.`);
    return;
  }

  // Hash password
  const passwordHash = await bcrypt.hash(password, 10);

  // 1. Create the root tenant for the platform
  const tenant = await prisma.tenant.create({
    data: {
      name: tenantName,
      slug: 'glova-crm-platform',
      plan: 'ENTERPRISE',
      status: 'ACTIVE',
    }
  });
  console.log(`✓ Created root tenant (ID: ${tenant.id})`);

  // 2. Create the Super Admin user
  const user = await prisma.user.create({
    data: {
      tenantId: tenant.id,
      email,
      passwordHash,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN', // Critical: Must be SUPER_ADMIN
      isOwner: true,
      status: 'ACTIVE'
    }
  });
  
  console.log(`✓ Created Super Admin user (ID: ${user.id})`);
  console.log(`\nSuccess! You can now log in at http://localhost:3000/login`);
  console.log(`Email: ${email}`);
  console.log(`Password: ${password}`);
}

main()
  .catch((e) => {
    console.error('Error creating super admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

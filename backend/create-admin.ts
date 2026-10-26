import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Creating admin user...');
  
  // Create a default tenant
  const tenant = await prisma.tenant.upsert({
    where: { slug: 'default-tenant' },
    update: {},
    create: {
      name: 'Default Organization',
      slug: 'default-tenant',
      plan: 'ENTERPRISE'
    }
  });

  // Create admin user
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const admin = await prisma.user.upsert({
    where: { 
      tenantId_email: {
        tenantId: tenant.id,
        email: 'admin@glovacrm.com' 
      }
    },
    update: {
      passwordHash: hashedPassword,
      role: 'SUPER_ADMIN'
    },
    create: {
      email: 'admin@glovacrm.com',
      passwordHash: hashedPassword,
      firstName: 'Super',
      lastName: 'Admin',
      role: 'SUPER_ADMIN',
      tenantId: tenant.id
    }
  });

  console.log('Admin user created successfully!');
  console.log('Email:', admin.email);
  console.log('Password: admin123');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

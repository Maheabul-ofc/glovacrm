import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding GlovaCRM database...');

  const passwordHash = await bcrypt.hash('password123', 10);

  // 1. Subscription Plans
  const plans = [
    {
      name: 'Starter',
      description: 'Ideal for small teams and solo entrepreneurs getting started.',
      price: 999,
      features: ['Up to 5 Users', '1,000 Leads', 'Android SIM Call Duration', 'Basic Reports'],
      isActive: true,
    },
    {
      name: 'Professional',
      description: 'For growing sales teams needing automation, WhatsApp, and Kanban.',
      price: 2499,
      features: ['Up to 25 Users', '25,000 Leads', 'Android SIM Auto-Duration', 'WhatsApp Cloud API', 'Kanban Pipeline', 'Follow-up Scheduler'],
      isActive: true,
    },
    {
      name: 'Enterprise',
      description: 'Custom setups, unlimited users, high volume telephony, dedicated support.',
      price: 4999,
      features: ['Unlimited Users', 'Unlimited Leads', 'Priority Webhooks & Lead Ads', 'Full API Access', 'Custom Roles & Multi-Branch'],
      isActive: true,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { name: plan.name },
      update: { price: plan.price, description: plan.description, features: plan.features },
      create: plan,
    });
  }
  console.log('✔ Subscription plans seeded');

  // 2. Demo Tenant Company
  let tenant = await prisma.tenant.findFirst({ where: { slug: 'glova-dev' } });
  if (!tenant) {
    tenant = await prisma.tenant.create({
      data: {
        name: 'Glova Dev Corp',
        slug: 'glova-dev',
        status: 'ACTIVE',
        plan: 'PROFESSIONAL',
        billingEmail: 'billing@glovacrm.com',
        industry: 'Software & Technology',
        country: 'IN',
        settings: { currency: 'INR', timezone: 'Asia/Kolkata' },
      },
    });
  }
  console.log(`✔ Tenant company "${tenant.name}" ready`);

  // 3. Super Admin User
  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'admin@glovacrm.com' } },
    update: { passwordHash, status: 'ACTIVE' },
    create: {
      tenantId: tenant.id,
      email: 'admin@glovacrm.com',
      passwordHash,
      firstName: 'Admin',
      lastName: 'Platform',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      isOwner: true,
    },
  });

  // 4. Tenant Owner / Business Admin
  const ownerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'owner@glovacrm.com' } },
    update: { passwordHash, status: 'ACTIVE' },
    create: {
      tenantId: tenant.id,
      email: 'owner@glovacrm.com',
      passwordHash,
      firstName: 'Vikram',
      lastName: 'Mehta',
      role: 'TENANT_ADMIN',
      status: 'ACTIVE',
      isOwner: true,
    },
  });

  // 5. Telecaller Agent
  const callerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: 'caller@glovacrm.com' } },
    update: { passwordHash, status: 'ACTIVE' },
    create: {
      tenantId: tenant.id,
      email: 'caller@glovacrm.com',
      passwordHash,
      firstName: 'Pooja',
      lastName: 'Sharma',
      role: 'TELECALLER',
      status: 'ACTIVE',
    },
  });
  console.log('✔ Users seeded (admin@glovacrm.com, owner@glovacrm.com, caller@glovacrm.com)');

  // 6. Pipeline Stages
  const defaultStages = [
    { name: 'New Leads', position: 1, color: '#3b82f6' },
    { name: 'Contacted', position: 2, color: '#eab308' },
    { name: 'In Discussion', position: 3, color: '#8b5cf6' },
    { name: 'Proposal Sent', position: 4, color: '#06b6d4' },
    { name: 'Converted / Won', position: 5, color: '#10b981' },
    { name: 'Lost', position: 6, color: '#ef4444' },
  ];

  const createdStages: Record<string, string> = {};
  for (const st of defaultStages) {
    const existing = await prisma.pipelineStage.findFirst({
      where: { tenantId: tenant.id, name: st.name },
    });
    if (existing) {
      createdStages[st.name] = existing.id;
    } else {
      const created = await prisma.pipelineStage.create({
        data: {
          tenantId: tenant.id,
          name: st.name,
          position: st.position,
          color: st.color,
        },
      });
      createdStages[st.name] = created.id;
    }
  }
  console.log('✔ Pipeline stages seeded');

  // 7. Demo Leads
  const demoLeads = [
    {
      firstName: 'Rajesh',
      lastName: 'Sharma',
      phone: '+919876543210',
      email: 'rajesh@sharmalogistics.in',
      companyName: 'Sharma Logistics & Transport',
      serviceName: 'CRM & Fleet Automation',
      status: 'FOLLOW_UP',
      priority: 'HIGH',
      conversionChance: 4,
      stageName: 'In Discussion',
      notes: 'Interested in automated call logging and WhatsApp dispatch.',
    },
    {
      firstName: 'Priya',
      lastName: 'Patel',
      phone: '+919812345678',
      email: 'priya@pateltraders.com',
      companyName: 'Patel International Traders',
      serviceName: 'WhatsApp Cloud API',
      status: 'INTERESTED',
      priority: 'URGENT',
      conversionChance: 5,
      stageName: 'Proposal Sent',
      notes: 'Demo scheduled. Waiting for formal commercial proposal.',
    },
    {
      firstName: 'Amit',
      lastName: 'Verma',
      phone: '+919899887766',
      email: 'amit@vermatech.io',
      companyName: 'Verma Technologies',
      serviceName: 'Cloud Telephony Sync',
      status: 'NEW',
      priority: 'NORMAL',
      conversionChance: 3,
      stageName: 'New Leads',
      notes: 'Downloaded brochure from website.',
    },
    {
      firstName: 'Sneha',
      lastName: 'Roy',
      phone: '+919711223344',
      email: 'sneha@royproperties.in',
      companyName: 'Roy Real Estate',
      serviceName: 'Lead Management & Telecalling',
      status: 'CONVERTED',
      priority: 'HIGH',
      conversionChance: 5,
      stageName: 'Converted / Won',
      notes: 'Subscribed to Professional Plan. 15 agent onboarding completed.',
    },
  ];

  for (const ld of demoLeads) {
    const existing = await prisma.lead.findFirst({
      where: { tenantId: tenant.id, phone: ld.phone },
    });

    if (!existing) {
      const createdLead = await prisma.lead.create({
        data: {
          tenantId: tenant.id,
          assignedToId: callerUser.id,
          stageId: createdStages[ld.stageName] || Object.values(createdStages)[0],
          firstName: ld.firstName,
          lastName: ld.lastName,
          phone: ld.phone,
          email: ld.email,
          companyName: ld.companyName,
          serviceName: ld.serviceName,
          status: ld.status,
          priority: ld.priority,
          conversionChance: ld.conversionChance,
          notes: ld.notes,
          source: 'MANUAL',
        },
      });

      // Sample call log with real duration for this lead
      await prisma.call.create({
        data: {
          tenantId: tenant.id,
          leadId: createdLead.id,
          userId: callerUser.id,
          provider: 'ANDROID_APP',
          direction: 'OUTBOUND',
          status: 'COMPLETED',
          duration: 142, // 2m 22s
          notes: 'Customer discussed requirement for 10 user licenses.',
        },
      });
    }
  }
  console.log('✔ Sample leads & call durations seeded');

  // 8. WhatsApp Template Category & Templates
  let cat = await prisma.whatsAppTemplateCategory.findFirst({
    where: { tenantId: tenant.id, name: 'Sales & Follow-ups' },
  });
  if (!cat) {
    cat = await prisma.whatsAppTemplateCategory.create({
      data: {
        tenantId: tenant.id,
        name: 'Sales & Follow-ups',
        color: '#0d9488',
      },
    });
  }

  const existingTpl = await prisma.whatsAppTemplate.findFirst({
    where: { tenantId: tenant.id, name: 'Welcome & Inquiry Confirmation' },
  });
  if (!existingTpl) {
    await prisma.whatsAppTemplate.create({
      data: {
        tenantId: tenant.id,
        categoryId: cat.id,
        createdById: ownerUser.id,
        lastUpdatedById: ownerUser.id,
        name: 'Welcome & Inquiry Confirmation',
        content: 'Hello {{customer_name}}, thank you for reaching out to {{business_name}}! Our specialist {{telecaller_name}} will connect with you shortly.',
        status: 'ACTIVE',
        waStatus: 'APPROVED',
        waTemplateName: 'welcome_inquiry_confirmation',
      },
    });
  }
  console.log('✔ WhatsApp templates seeded');

  console.log('\n======================================================');
  console.log('  GlovaCRM Database Seed Complete!');
  console.log('  Credentials:');
  console.log('  - Super Admin:   admin@glovacrm.com  / password123');
  console.log('  - Business Admin: owner@glovacrm.com  / password123');
  console.log('  - Telecaller:    caller@glovacrm.com / password123');
  console.log('======================================================\n');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

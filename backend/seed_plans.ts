import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Subscription Plans...');

  // Delete all existing plans to avoid duplicates or old data
  await prisma.subscriptionPlan.deleteMany({});

  const plans = [
    {
      name: 'Starter',
      description: 'Perfect for small teams getting started.',
      price: 999,
      features: [
        'Up to 5 users',
        '1,000 leads',
        'Basic dialer',
        'WhatsApp messaging',
        'Email support'
      ],
      isActive: true,
    },
    {
      name: 'Professional',
      description: 'For growing sales teams that need more power.',
      price: 2499,
      features: [
        'Up to 25 users',
        '10,000 leads',
        'Power dialer',
        'WhatsApp + SMS campaigns',
        'API access',
        'Priority support'
      ],
      isActive: true,
    },
    {
      name: 'Enterprise',
      description: 'For large organizations with custom needs.',
      price: 4999,
      features: [
        'Unlimited users',
        'Unlimited leads',
        'Custom integrations',
        'Dedicated account manager',
        'SLA guarantee',
        'On-premise option'
      ],
      isActive: true,
    }
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.create({
      data: plan
    });
    console.log(`Created plan: ${plan.name}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());

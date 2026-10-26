import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { generateAccessToken, generateRefreshToken } from '../utils/jwt';

interface ProvisionInput {
  // Company
  companyName: string;
  industry?: string;
  country?: string;
  // Owner
  ownerEmail: string;
  ownerPassword: string;
  ownerFirstName: string;
  ownerLastName?: string;
  ownerPhone?: string;
  // Subscription (Super Admin can override)
  plan?: string;         // TRIAL, STARTER, PROFESSIONAL, ENTERPRISE
  trialDays?: number;    // default 7
}

interface ProvisionResult {
  tenant: any;
  user: any;
  accessToken: string;
  refreshToken: string;
}

const DEFAULT_PIPELINE_STAGES = [
  { name: 'New Lead', position: 1, color: '#6366f1' },
  { name: 'Contacted', position: 2, color: '#3b82f6' },
  { name: 'Qualified', position: 3, color: '#8b5cf6' },
  { name: 'Proposal', position: 4, color: '#f59e0b' },
  { name: 'Negotiation', position: 5, color: '#f97316' },
  { name: 'Won', position: 6, color: '#10b981' },
  { name: 'Lost', position: 7, color: '#ef4444' },
];

/**
 * Auto-provisions a new tenant workspace.
 * Called from both self-service registration AND Super Admin company creation.
 */
export const provisionTenant = async (input: ProvisionInput): Promise<ProvisionResult> => {
  const {
    companyName,
    industry,
    country = 'IN',
    ownerEmail,
    ownerPassword,
    ownerFirstName,
    ownerLastName = '',
    plan = 'TRIAL',
    trialDays = 7,
  } = input;

  // Generate slug from company name
  const slug = companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    + '-' + Date.now().toString(36);

  // Check if email already exists
  const existingUser = await prisma.user.findFirst({ where: { email: ownerEmail } });
  if (existingUser) {
    throw new Error('An account with this email already exists');
  }

  // Hash password
  const passwordHash = await bcrypt.hash(ownerPassword, 10);

  // Calculate trial end date
  const parsedTrialDays = parseInt(String(trialDays), 10) || 7;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + parsedTrialDays);

  // Run everything in a transaction
  const result = await prisma.$transaction(async (tx) => {
    // 1. Create Tenant
    const tenant = await tx.tenant.create({
      data: {
        name: companyName,
        slug,
        industry,
        country,
        plan,
        trialEndsAt: plan === 'TRIAL' ? trialEndsAt : null,
        billingEmail: ownerEmail,
        status: 'ACTIVE',
      },
    });

    // 2. Create Business Owner
    const user = await tx.user.create({
      data: {
        tenantId: tenant.id,
        email: ownerEmail,
        passwordHash,
        firstName: ownerFirstName,
        lastName: ownerLastName,
        phone: input.ownerPhone,
        role: 'TENANT_ADMIN',
        isOwner: true,
        status: 'ACTIVE',
      },
    });

    // 3. Create Default Pipeline Stages
    await tx.pipelineStage.createMany({
      data: DEFAULT_PIPELINE_STAGES.map((stage) => ({
        tenantId: tenant.id,
        ...stage,
      })),
    });

    return { tenant, user };
  });

  // 4. Generate tokens (outside transaction)
  const tokenPayload = {
    userId: result.user.id,
    tenantId: result.tenant.id,
    role: result.user.role,
  };

  const accessToken = generateAccessToken(tokenPayload);
  const refreshToken = generateRefreshToken(tokenPayload);

  // Store session
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);

  await prisma.session.create({
    data: {
      userId: result.user.id,
      refreshToken,
      expiresAt,
    },
  });

  return {
    tenant: result.tenant,
    user: {
      id: result.user.id,
      email: result.user.email,
      firstName: result.user.firstName,
      lastName: result.user.lastName,
      role: result.user.role,
      tenantId: result.tenant.id,
      isOwner: result.user.isOwner,
    },
    accessToken,
    refreshToken,
  };
};

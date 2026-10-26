import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { provisionTenant } from '../services/provisioning.service';

const VALID_PLANS: Record<string, number> = {
  'Starter': 999,
  'Professional': 2499,
  'Enterprise': 4999,
};

/**
 * POST /api/upgrade-requests — Public form submission (no auth required)
 */
export const submitRequest = async (req: Request, res: Response) => {
  try {
    const { companyName, industry, country, firstName, lastName, email, phone, planName } = req.body;

    if (!companyName || !firstName || !email || !phone || !planName) {
      return res.status(400).json({ error: 'Missing required fields: companyName, firstName, email, phone, planName' });
    }

    if (!VALID_PLANS[planName]) {
      return res.status(400).json({ error: 'Invalid plan. Choose Starter, Professional, or Enterprise.' });
    }

    // Check for duplicate pending request from same email
    const existingPending = await prisma.upgradeRequest.findFirst({
      where: { email: email.toLowerCase().trim(), status: 'PENDING' },
    });

    if (existingPending) {
      return res.status(409).json({ error: 'You already have a pending upgrade request. Please wait for approval.' });
    }

    const request = await prisma.upgradeRequest.create({
      data: {
        companyName: companyName.trim(),
        industry: industry || null,
        country: country || 'IN',
        firstName: firstName.trim(),
        lastName: lastName?.trim() || null,
        email: email.toLowerCase().trim(),
        phone: phone.trim(),
        planName,
        planPrice: VALID_PLANS[planName],
        status: 'PENDING',
      },
    });

    res.status(201).json({
      message: 'Upgrade request submitted successfully. Our team will reach out shortly.',
      requestId: request.id,
    });
  } catch (error) {
    console.error('Submit upgrade request error:', error);
    res.status(500).json({ error: 'Failed to submit upgrade request' });
  }
};

/**
 * GET /api/upgrade-requests — Super Admin: list all requests with counts
 */
export const getAllRequests = async (req: Request, res: Response) => {
  try {
    const { status, search, page = 1, limit = 20 } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status && status !== 'ALL') where.status = status;
    if (search) {
      where.OR = [
        { companyName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { firstName: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [requests, total, pendingCount, approvedCount, rejectedCount] = await Promise.all([
      prisma.upgradeRequest.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.upgradeRequest.count({ where }),
      prisma.upgradeRequest.count({ where: { status: 'PENDING' } }),
      prisma.upgradeRequest.count({ where: { status: 'APPROVED' } }),
      prisma.upgradeRequest.count({ where: { status: 'REJECTED' } }),
    ]);

    res.json({
      data: requests,
      counts: { pending: pendingCount, approved: approvedCount, rejected: rejectedCount },
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error('Get upgrade requests error:', error);
    res.status(500).json({ error: 'Failed to fetch upgrade requests' });
  }
};

/**
 * PATCH /api/upgrade-requests/:id/approve — Super Admin approves & provisions/upgrades tenant
 */
export const approveRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { adminNotes, ownerPassword } = req.body;

    const request = await prisma.upgradeRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Request is already ${request.status.toLowerCase()}` });
    }

    const planToSet = request.planName.toUpperCase();

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: request.email },
      include: { tenant: true }
    });

    let message = '';
    let tenant = null;

    if (existingUser) {
      // User exists, just update their tenant's plan
      tenant = await prisma.tenant.update({
        where: { id: existingUser.tenantId },
        data: { plan: planToSet }
      });
      message = 'Request approved. Existing company plan updated successfully.';
    } else {
      // User does not exist, provision a new tenant
      const password = ownerPassword || 'Welcome@123';
      const result = await provisionTenant({
        companyName: request.companyName,
        industry: request.industry || undefined,
        country: request.country || 'IN',
        ownerEmail: request.email,
        ownerPassword: password,
        ownerFirstName: request.firstName,
        ownerLastName: request.lastName || undefined,
        ownerPhone: request.phone || undefined,
        plan: planToSet,
        trialDays: 0, 
      });
      tenant = result.tenant;
      message = 'Request approved. New company and owner account created successfully.';
    }

    // Mark request as approved
    await prisma.upgradeRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
      },
    });

    res.json({
      message,
      tenant,
    });
  } catch (error: any) {
    console.error('Approve request error:', error);
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Failed to approve request' });
  }
};

/**
 * PATCH /api/upgrade-requests/:id/reject — Super Admin rejects
 */
export const rejectRequest = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    const { adminNotes } = req.body;

    const request = await prisma.upgradeRequest.findUnique({ where: { id } });
    if (!request) return res.status(404).json({ error: 'Request not found' });
    if (request.status !== 'PENDING') {
      return res.status(400).json({ error: `Request is already ${request.status.toLowerCase()}` });
    }

    await prisma.upgradeRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        adminNotes: adminNotes || null,
        reviewedAt: new Date(),
      },
    });

    res.json({ message: 'Request rejected.' });
  } catch (error) {
    console.error('Reject request error:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
};

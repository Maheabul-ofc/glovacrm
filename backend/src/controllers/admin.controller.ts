import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { provisionTenant } from '../services/provisioning.service';

/**
 * GET /api/admin/companies — List all tenants
 */
export const listCompanies = async (req: Request, res: Response) => {
  try {
    const { page = 1, limit = 20, search, status, plan } = req.query;
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const where: any = {};
    if (status) where.status = status;
    if (plan) where.plan = plan;
    if (search) {
      where.OR = [
        { name: { contains: search as string, mode: 'insensitive' } },
        { slug: { contains: search as string, mode: 'insensitive' } },
        { billingEmail: { contains: search as string, mode: 'insensitive' } },
      ];
    }

    const [companies, total] = await Promise.all([
      prisma.tenant.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: 'desc' },
        include: {
          _count: { select: { users: true, leads: true } },
        },
      }),
      prisma.tenant.count({ where }),
    ]);

    res.json({
      data: companies,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/admin/companies — Create a new company (admin-created path)
 */
export const createCompany = async (req: Request, res: Response) => {
  try {
    const {
      companyName, industry, country,
      ownerEmail, ownerPassword, ownerFirstName, ownerLastName,
      plan, trialDays,
    } = req.body;

    if (!companyName || !ownerEmail || !ownerPassword || !ownerFirstName) {
      return res.status(400).json({ error: 'Missing required fields: companyName, ownerEmail, ownerPassword, ownerFirstName' });
    }

    const normalizedEmail = ownerEmail.toLowerCase().trim();

    const result = await provisionTenant({
      companyName, industry, country,
      ownerEmail: normalizedEmail, ownerPassword, ownerFirstName, ownerLastName,
      plan: plan || 'STARTER',
      trialDays: trialDays || 30,
    });

    res.status(201).json({
      message: 'Company created successfully',
      tenant: result.tenant,
      owner: result.user,
    });
  } catch (error: any) {
    console.error(error);
    if (error.message?.includes('already exists')) {
      return res.status(409).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/admin/companies/:id — Get company details
 */
export const getCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const company = await prisma.tenant.findUnique({
      where: { id: id as string },
      include: {
        users: { select: { id: true, email: true, firstName: true, lastName: true, role: true, isOwner: true, status: true, createdAt: true } },
        _count: { select: { leads: true, calls: true, campaigns: true, whatsappMessages: true } },
      },
    });

    if (!company) return res.status(404).json({ error: 'Company not found' });

    res.json(company);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * PATCH /api/admin/companies/:id — Update/suspend a company
 */
export const updateCompany = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, plan, trialEndsAt, name } = req.body;

    const data: any = {};
    if (status) data.status = status;
    if (plan) data.plan = plan;
    if (trialEndsAt) data.trialEndsAt = new Date(trialEndsAt);
    if (name) data.name = name;

    const company = await prisma.tenant.update({
      where: { id: id as string },
      data,
    });

    res.json(company);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/admin/stats — Platform-wide statistics
 */
export const getPlatformStats = async (req: Request, res: Response) => {
  try {
    const now = new Date();

    const [
      totalCompanies,
      activeTrials,
      paidCompanies,
      suspendedCompanies,
      totalUsers,
      totalLeads,
      recentSignups,
    ] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { plan: 'TRIAL', trialEndsAt: { gte: now } } }),
      prisma.tenant.count({ where: { plan: { not: 'TRIAL' } } }),
      prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
      prisma.user.count(),
      prisma.lead.count(),
      prisma.tenant.findMany({
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { id: true, name: true, plan: true, status: true, createdAt: true, billingEmail: true },
      }),
    ]);

    // Real MRR calculation
    const activeSubs = await prisma.subscription.findMany({
      where: { status: 'ACTIVE' },
      include: { plan: true }
    });
    const mrr = activeSubs.reduce((sum, sub) => sum + (sub.plan?.price || 0), 0);

    res.json({
      metrics: {
        totalCompanies,
        activeTrials,
        paidCompanies,
        suspendedCompanies,
        totalUsers,
        totalLeads,
        mrr,
      },
      recentSignups,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * DELETE /api/admin/companies/:id — Permanently delete a company and all its data
 */
export const deleteCompany = async (req: Request, res: Response) => {
  try {
    const id = req.params.id as string;
    
    // Ensure tenant exists
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) return res.status(404).json({ error: 'Company not found' });
    
    // Since onDelete: Cascade is configured in schema.prisma, 
    // deleting the tenant will automatically delete all related users, leads, calls, etc.
    await prisma.tenant.delete({ where: { id } });
    
    res.json({ message: 'Company and all associated data permanently deleted.' });
  } catch (error) {
    console.error('Delete company error:', error);
    res.status(500).json({ error: 'Failed to delete company' });
  }
};

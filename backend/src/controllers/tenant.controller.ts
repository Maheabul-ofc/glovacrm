import { Request, Response } from 'express';
import { prisma } from '../lib/prisma';

export const listTenants = async (req: Request, res: Response) => {
  try {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(tenants);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getTenant = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tenant = await prisma.tenant.findUnique({
      where: { id: id as string }
    });
    
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateTenantStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    if (!['ACTIVE', 'SUSPENDED'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const tenant = await prisma.tenant.update({
      where: { id: id as string },
      data: { status }
    });
    
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getMyTenant = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      include: {
        pipelineStages: { orderBy: { position: 'asc' } },
        customFields: true
      }
    });
    
    if (!tenant) return res.status(404).json({ error: 'Tenant not found' });
    
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateMyTenant = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user?.tenantId;
    const { name, industry, country, settings } = req.body;

    // Tenant Admin role should be enforced by middleware
    if (req.user?.role !== 'TENANT_ADMIN') {
      return res.status(403).json({ error: 'Only Business Owners can update settings' });
    }

    const tenant = await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        ...(name && { name }),
        ...(industry && { industry }),
        ...(country && { country }),
        ...(settings && { settings })
      }
    });
    
    res.json(tenant);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

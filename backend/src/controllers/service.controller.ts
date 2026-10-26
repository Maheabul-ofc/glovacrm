import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';
import { z } from 'zod';

const serviceSchema = z.object({
  name: z.string().min(1, 'Service name is required'),
  isActive: z.boolean().optional(),
});

export const getServices = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const services = await prisma.service.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(services);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createService = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const validatedData = serviceSchema.parse(req.body);
    
    const service = await prisma.service.create({
      data: {
        tenantId,
        ...validatedData
      }
    });
    
    res.status(201).json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateService = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    
    const validatedData = serviceSchema.partial().parse(req.body);
    
    const service = await prisma.service.update({
      where: { id, tenantId },
      data: validatedData
    });
    
    res.json(service);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteService = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    
    await prisma.service.delete({
      where: { id, tenantId }
    });
    
    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

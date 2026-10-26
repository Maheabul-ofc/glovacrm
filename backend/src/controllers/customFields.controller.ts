import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';
import { z } from 'zod';

const fieldSchema = z.object({
  name: z.string().min(1).regex(/^[a-zA-Z0-9_]+$/, "Only alphanumeric and underscores"),
  label: z.string().min(1),
  type: z.enum(['text', 'number', 'date', 'select', 'multiselect']),
  options: z.any().optional(),
  required: z.boolean().default(false)
});

export const listFields = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const fields = await prisma.customFieldConfig.findMany({
      orderBy: { createdAt: 'asc' }
    });
    
    res.json(fields);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createField = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const validatedData = fieldSchema.parse(req.body);

    const existing = await prisma.customFieldConfig.findUnique({
      where: { tenantId_name: { tenantId, name: validatedData.name } }
    });

    if (existing) {
      return res.status(400).json({ error: 'Field name already exists for this tenant' });
    }

    const field = await prisma.customFieldConfig.create({
      data: validatedData as any
    });

    res.status(201).json(field);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

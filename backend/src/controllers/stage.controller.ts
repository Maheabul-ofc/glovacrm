import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';
import { z } from 'zod';

const stageSchema = z.object({
  name: z.string().min(1),
  position: z.number().int(),
  color: z.string().optional()
});

export const listStages = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const stages = await prisma.pipelineStage.findMany({
      orderBy: { position: 'asc' }
    });
    
    res.json(stages);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const createStage = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const validatedData = stageSchema.parse(req.body);

    const stage = await prisma.pipelineStage.create({
      data: validatedData as any
    });

    res.status(201).json(stage);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateStage = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const { id } = req.params;
    
    const validatedData = stageSchema.partial().parse(req.body);

    const stage = await prisma.pipelineStage.update({
      where: { id: id as string },
      data: validatedData as any
    });

    res.json(stage);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

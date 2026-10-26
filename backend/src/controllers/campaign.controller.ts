import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';
import { campaignQueue } from '../lib/queue';
import { z } from 'zod';

const campaignSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  type: z.enum(['WHATSAPP', 'EMAIL', 'SMS']),
  templateName: z.string().min(1),
  leadIds: z.array(z.string()).min(1) // For MVP we pass static lead IDs
});

export const createCampaign = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const validatedData = campaignSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        tenantId,
        name: validatedData.name,
        description: validatedData.description,
        type: validatedData.type,
        templateName: validatedData.templateName,
        leads: {
          connect: validatedData.leadIds.map(id => ({ id }))
        }
      }
    });

    res.status(201).json(campaign);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listCampaigns = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const campaigns = await prisma.campaign.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const triggerCampaign = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const { id } = req.params;

    const campaign = await prisma.campaign.findUnique({ where: { id: id as string } });
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' });
    if (campaign.status === 'RUNNING' || campaign.status === 'COMPLETED') {
      return res.status(400).json({ error: 'Campaign already running or completed' });
    }

    await prisma.campaign.update({
      where: { id: id as string },
      data: { status: 'RUNNING' }
    });

    await campaignQueue.add('broadcast', {
      tenantId,
      campaignId: id
    });

    res.json({ message: 'Campaign triggered successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';
import { z } from 'zod';

const integrationSchema = z.object({
  provider: z.enum([
    'META_LEAD_ADS',
    'INSTAGRAM',
    'GOOGLE_ADS',
    'INDIAMART',
    'JUSTDIAL',
    'WHATSAPP',
    'TELEGRAM',
    'EXOTEL',
    'TWILIO',
    'INSTAMOJO',
    'RAZORPAY'
  ]),
  config: z.any(),
  isActive: z.boolean().default(true)
});

export const getIntegrations = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const integrations = await prisma.integrationConfig.findMany();
    res.json(integrations);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const saveIntegration = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    const validatedData = integrationSchema.parse(req.body);

    const integration = await prisma.integrationConfig.upsert({
      where: { tenantId_provider: { tenantId, provider: validatedData.provider } },
      update: { config: validatedData.config, isActive: validatedData.isActive },
      create: {
        tenantId,
        provider: validatedData.provider,
        config: validatedData.config,
        isActive: validatedData.isActive
      }
    });

    res.json(integration);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

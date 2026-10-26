import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';
import { z } from 'zod';
import { assignLeadManual, assignLeadRoundRobin } from '../services/assignment.service';

const leadSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().optional(),
  phone: z.string().min(10, 'Valid phone number is required'),
  altPhone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  companyName: z.string().optional(),
  designation: z.string().optional(),
  source: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'URGENT']).optional(),
  customData: z.record(z.string(), z.any()).optional(),
  notes: z.string().optional(),
  assignedToId: z.string().uuid().optional(),
  stageId: z.string().uuid().optional(),
  status: z.string().optional(),
  conversionChance: z.number().min(0).max(5).optional(),
  serviceName: z.string().optional(),
  businessDetails: z.string().optional(),
  revenueAmount: z.number().optional(),
  cancelReason: z.string().optional(),
  inquiryDate: z.preprocess((arg) => {
    if (arg === '' || arg == null) return undefined;
    return new Date(arg as string);
  }, z.date().optional()),
  nextFollowUpAt: z.preprocess((arg) => {
    if (arg === '' || arg == null) return undefined;
    return new Date(arg as string);
  }, z.date().optional()),
  initialNotes: z.string().optional(),
  campaignId: z.string().optional(),
});

export const createLead = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    // Validate request body
    const validatedData = leadSchema.parse(req.body);

    const lead = await prisma.lead.create({
      data: validatedData as any
    });

    // Log Activity
    await prisma.leadActivity.create({
      data: {
        leadId: lead.id,
        tenantId,
        userId: req.user!.userId,
        type: 'STATUS_CHANGE',
        description: 'Lead created manually',
        metadata: { source: 'API' }
      }
    });

    res.status(201).json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const bulkCreateLeads = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    // Expects an array of leads
    const { leads } = req.body;
    
    if (!Array.isArray(leads) || leads.length === 0) {
      return res.status(400).json({ error: 'Invalid payload: expected an array of leads' });
    }

    // Validate all leads
    const validatedLeads = z.array(leadSchema).parse(leads);

    const createdLeads = await prisma.lead.createMany({
      data: validatedLeads as any,
      skipDuplicates: true // Useful if we have unique constraints like phone/email later
    });

    res.status(201).json({ 
      message: `Successfully imported ${createdLeads.count} leads`,
      count: createdLeads.count 
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed on one or more rows', details: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listLeads = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    
    // Extract query params for filtering and pagination
    const { page = '1', limit = '20', search, stageId, priority, source, assignedToId, hasFollowUp, campaignId, serviceName, status, conversionChance, sort } = req.query as Record<string, string>;
    
    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    // Build the where clause
    const where: any = {};
    if (stageId) where.stageId = stageId;
    if (priority) where.priority = priority;
    if (source) where.source = source;
    if (assignedToId) where.assignedToId = assignedToId;
    if (campaignId) where.campaignId = campaignId;
    if (serviceName) where.serviceName = serviceName;
    if (status) where.status = status;
    if (conversionChance) where.conversionChance = parseInt(conversionChance, 10);
    
    if (hasFollowUp === 'true') {
      where.nextFollowUpAt = { not: null };
    }
    
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string } },
        { email: { contains: search as string, mode: 'insensitive' } }
      ];
    }

    const [leads, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take: limitNum,
        orderBy: { createdAt: sort === 'oldest' ? 'asc' : 'desc' },
        include: {
          assignedTo: { select: { id: true, firstName: true, lastName: true } },
          stage: true,
          tags: { include: { tag: true } }
        }
      }),
      prisma.lead.count({ where })
    ]);

    res.json({
      data: leads,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum)
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLead = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    const lead = await prisma.lead.findUnique({
      where: { id: id as string },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        stage: true,
        tags: { include: { tag: true } },
        activities: {
          orderBy: { createdAt: 'desc' },
          include: { user: { select: { firstName: true, lastName: true } } }
        }
      }
    });

    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    
    res.json(lead);
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLead = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    const validatedData = leadSchema.partial().parse(req.body);

    const lead = await prisma.lead.update({
      where: { id: id as string },
      data: validatedData as any
    });

    res.json(lead);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: (error as any).errors });
    }
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const deleteLead = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    await prisma.lead.delete({
      where: { id: id as string }
    });

    res.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const assignLead = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const id = req.params.id as string;
    const { method, assignedToId } = req.body;

    let lead;
    if (method === 'MANUAL') {
      if (!assignedToId) return res.status(400).json({ error: 'assignedToId is required for manual assignment' });
      lead = await assignLeadManual(tenantId, id as string, assignedToId, req.user!.userId);
    } else if (method === 'ROUND_ROBIN') {
      lead = await assignLeadRoundRobin(tenantId, id as string);
    } else {
      return res.status(400).json({ error: 'Invalid assignment method' });
    }

    res.json(lead);
  } catch (error: any) {
    console.error(error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
};

export const scheduleFollowUp = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    const { nextFollowUpAt, note } = req.body;

    if (!nextFollowUpAt) {
      return res.status(400).json({ error: 'nextFollowUpAt is required' });
    }

    const lead = await prisma.lead.update({
      where: { id: id as string },
      data: { nextFollowUpAt: new Date(nextFollowUpAt) }
    });

    if (note) {
      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: id as string,
          userId: req.user!.userId,
          type: 'NOTE',
          description: note,
          metadata: { isFollowUpNote: true }
        }
      });
    }

    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const updateLeadStatus = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    const { status, notes, revenueAmount, cancelReason } = req.body;

    if (!status) {
      return res.status(400).json({ error: 'Status is required' });
    }

    const data: any = { status };
    if (status === 'CONVERTED' && revenueAmount !== undefined) {
      data.revenueAmount = revenueAmount;
    }
    if (status === 'CLOSED' && cancelReason !== undefined) {
      data.cancelReason = cancelReason;
    }

    const lead = await prisma.lead.update({
      where: { id },
      data
    });

    await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId: id,
        userId: req.user!.userId,
        type: 'STATUS_CHANGE',
        description: notes ? `Status changed to ${status}. Notes: ${notes}` : `Status changed to ${status}`,
        metadata: { newStatus: status, oldStatus: lead.status }
      }
    });

    res.json(lead);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const getLeadHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    const activities = await prisma.leadActivity.findMany({
      where: { leadId: id, tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true } }
      }
    });

    res.json(activities);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const addConversationNote = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    const { notes } = req.body;

    if (!notes) {
      return res.status(400).json({ error: 'Notes are required' });
    }

    const activity = await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId: id,
        userId: req.user!.userId,
        type: 'NOTE',
        description: notes
      }
    });

    res.status(201).json(activity);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};


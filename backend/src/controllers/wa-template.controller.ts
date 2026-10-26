import { Request, Response } from 'express';
import { z } from 'zod';
import { getTenantPrisma, prisma } from '../lib/prisma';
import { getWhatsAppProvider } from '../services/whatsapp.service';

// Helper to extract variables
function extractVariables(content: string): string[] {
  const matches = [...content.matchAll(/\{\{(\w+)\}\}/g)];
  return Array.from(new Set(matches.map((m) => m[1])));
}

const categorySchema = z.object({
  name: z.string().min(1, 'Name is required'),
  color: z.string().optional(),
});

export const listCategories = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const tPrisma = getTenantPrisma(tenantId);

    const categories = await tPrisma.whatsAppTemplateCategory.findMany({
      orderBy: { name: 'asc' },
    });

    res.json({ data: categories });
  } catch (error) {
    console.error('Error listing categories:', error);
    res.status(500).json({ error: 'Failed to list categories' });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const tPrisma = getTenantPrisma(tenantId);
    
    const validatedData = categorySchema.parse(req.body);

    const category = await tPrisma.whatsAppTemplateCategory.create({
      data: validatedData as any,
    });

    res.status(201).json({ data: category });
  } catch (error) {
    console.error('Error creating category:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: 'Failed to create category' });
  }
};

export const updateCategory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    
    const updateSchema = categorySchema.partial();
    const validatedData = updateSchema.parse(req.body);

    const category = await tPrisma.whatsAppTemplateCategory.update({
      where: { id },
      data: validatedData as any,
    });

    res.json({ data: category });
  } catch (error) {
    console.error('Error updating category:', error);
    res.status(500).json({ error: 'Failed to update category' });
  }
};

export const deleteCategory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    await tPrisma.whatsAppTemplateCategory.delete({
      where: { id },
    });

    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error);
    res.status(500).json({ error: 'Failed to delete category' });
  }
};

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  content: z.string().min(1, 'Content is required'),
  categoryId: z.string().optional(),
});

export const listTemplates = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const tPrisma = getTenantPrisma(tenantId);
    
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;
    
    const search = req.query.search as string;
    const categoryId = req.query.categoryId as string;
    const statusQuery = req.query.status as string;

    const where: any = {};

    if (req.user!.role === 'TELECALLER') {
      where.status = 'ACTIVE';
    } else if (statusQuery) {
      where.status = statusQuery;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (categoryId) {
      where.categoryId = categoryId;
    }

    const [total, data] = await Promise.all([
      tPrisma.whatsAppTemplate.count({ where }),
      tPrisma.whatsAppTemplate.findMany({
        where,
        skip,
        take: limit,
        include: {
          category: true, createdBy: { select: { firstName: true, lastName: true } }, lastUpdatedBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { updatedAt: 'desc' },
      }),
    ]);

    res.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Error listing templates:', error);
    res.status(500).json({ error: 'Failed to list templates' });
  }
};

export const createTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const tPrisma = getTenantPrisma(tenantId);
    
    const validatedData = templateSchema.parse(req.body);
    const variables = extractVariables(validatedData.content);

    const waTemplateName = validatedData.name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now();

    const template = await tPrisma.$transaction(async (tx: any) => {
      const newTemplate = await tx.whatsAppTemplate.create({
        data: {
          name: validatedData.name,
          content: validatedData.content,
          categoryId: validatedData.categoryId,
          variables,
          version: 1,
          createdById: userId,
          lastUpdatedById: userId,
          waTemplateName,
          waStatus: 'PENDING',
        },
      });

      await tx.whatsAppTemplateVersion.create({
        data: {
          templateId: newTemplate.id,
          content: newTemplate.content,
          version: newTemplate.version,
          createdById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'CREATE',
          entityType: 'TEMPLATE',
          entityId: newTemplate.id,
          userId,
          tenantId,
          details: { name: newTemplate.name },
        },
      });

      return newTemplate;
    });

    res.status(201).json({ data: template });
  } catch (error) {
    console.error('Error creating template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: 'Failed to create template' });
  }
};

export const getTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    const template = await tPrisma.whatsAppTemplate.findUnique({
      where: { id },
      include: {
        category: true, createdBy: { select: { firstName: true, lastName: true } }, lastUpdatedBy: { select: { firstName: true, lastName: true } },
      },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    res.json({ data: template });
  } catch (error) {
    console.error('Error getting template:', error);
    res.status(500).json({ error: 'Failed to get template' });
  }
};

const updateTemplateSchema = templateSchema.partial();

export const updateTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    const validatedData = updateTemplateSchema.parse(req.body);

    const template = await tPrisma.$transaction(async (tx: any) => {
      const existing = await tx.whatsappTemplate.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error('Template not found');
      }

      await tx.whatsappTemplateVersion.create({
        data: {
          templateId: existing.id,
          content: existing.content,
          version: existing.version,
          createdById: existing.lastUpdatedById,
        },
      });

      const updatedVariables = validatedData.content 
        ? extractVariables(validatedData.content)
        : existing.variables;

      const updatedTemplate = await tx.whatsappTemplate.update({
        where: { id },
        data: {
          ...validatedData,
          variables: updatedVariables,
          version: { increment: 1 },
          lastUpdatedById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'UPDATE',
          entityType: 'TEMPLATE',
          entityId: existing.id,
          userId,
          tenantId,
          details: { updatedFields: Object.keys(validatedData) },
        },
      });

      return updatedTemplate;
    });

    res.json({ data: template });
  } catch (error) {
    console.error('Error updating template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    if (error instanceof Error && error.message === 'Template not found') {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Failed to update template' });
  }
};

export const deleteTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    await tPrisma.$transaction(async (tx: any) => {
      await tx.whatsappTemplate.update({
        where: { id },
        data: {
          status: 'DELETED', lastUpdatedById: userId },
      });

      await tx.auditLog.create({
        data: {
          action: 'DELETE',
          entityType: 'TEMPLATE',
          entityId: id,
          userId,
          tenantId,
        },
      });
    });

    res.json({ message: 'Template deleted successfully' });
  } catch (error) {
    console.error('Error deleting template:', error);
    res.status(500).json({ error: 'Failed to delete template' });
  }
};

export const toggleTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    const result = await tPrisma.$transaction(async (tx: any) => {
      const existing = await tx.whatsappTemplate.findUnique({
        where: { id },
      });

      if (!existing) {
        throw new Error('Template not found');
      }

      const newStatus = existing.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';

      const updated = await tx.whatsappTemplate.update({
        where: { id },
        data: {
          status: newStatus, lastUpdatedById: userId },
      });

      await tx.auditLog.create({
        data: {
          action: 'TOGGLE_STATUS',
          entityType: 'TEMPLATE',
          entityId: id,
          userId,
          tenantId,
          details: { status: newStatus },
        },
      });

      return updated;
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error toggling template:', error);
    if (error instanceof Error && error.message === 'Template not found') {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Failed to toggle template status' });
  }
};

export const getVersionHistory = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    const versions = await tPrisma.whatsAppTemplateVersion.findMany({
      where: { templateId: id },
      orderBy: { version: 'desc' },
      /* removed include */
    });

    res.json({ data: versions });
  } catch (error) {
    console.error('Error fetching version history:', error);
    res.status(500).json({ error: 'Failed to fetch version history' });
  }
};

export const previewTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    const { leadId } = req.body;

    const template = await tPrisma.whatsAppTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const currentUser = await prisma.user.findUnique({ where: { id: req.user!.userId } });

    let lead: any = null;
    if (leadId) {
      lead = await tPrisma.lead.findUnique({ where: { id: leadId } });
    }

    let resolvedContent = template.content;
    const variables: Record<string, string> = {};

    const resolveVar = (key: string, value: string) => {
      resolvedContent = resolvedContent.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
      variables[key] = value;
    };

    const customerName = lead ? `${lead.firstName} ${lead.lastName || ''}`.trim() : 'John Doe';
    resolveVar('customer_name', customerName);

    resolveVar('business_name', tenant?.name || 'Your Business');

    const followupDate = lead?.nextFollowUpAt 
      ? new Date(lead.nextFollowUpAt).toLocaleString() 
      : (lead ? 'N/A' : new Date().toLocaleString());
    resolveVar('followup_date', followupDate);

    const telecallerName = currentUser ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'Jane Smith';
    resolveVar('telecaller_name', telecallerName);

    resolveVar('manager_name', 'N/A');

    resolveVar('lead_status', lead?.status || 'NEW');

    res.json({
      data: {
          original: template.content,
        resolved: resolvedContent,
        variables,
      }
    });
  } catch (error) {
    console.error('Error previewing template:', error);
    res.status(500).json({ error: 'Failed to preview template' });
  }
};

const sendTemplateSchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
  finalContent: z.string().optional(),
});

export const useTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    
    const validatedData = sendTemplateSchema.parse(req.body);
    const { leadId, finalContent } = validatedData;

    const template = await tPrisma.whatsAppTemplate.findUnique({
      where: { id },
    });

    if (!template) {
      return res.status(404).json({ error: 'Template not found' });
    }

    const lead = await tPrisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      return res.status(404).json({ error: 'Lead not found' });
    }

    if (!lead.phone) {
      return res.status(400).json({ error: 'Lead does not have a phone number' });
    }

    let contentToSend = finalContent;
    let components: any[] = [];

    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const currentUser = await prisma.user.findUnique({ where: { id: userId } });

    const resolveVar = (key: string) => {
      switch (key) {
        case 'customer_name': return `${lead.firstName} ${lead.lastName || ''}`.trim();
        case 'business_name': return tenant?.name || 'Business';
        case 'followup_date': return lead.nextFollowUpAt ? new Date(lead.nextFollowUpAt).toLocaleString() : 'N/A';
        case 'telecaller_name': return currentUser ? `${currentUser.firstName} ${currentUser.lastName || ''}`.trim() : 'Telecaller';
        case 'manager_name': return 'N/A';
        case 'lead_status': return lead.status || 'N/A';
        default: return 'N/A';
      }
    };

    if (!contentToSend) {
      let resolvedContent = template.content;
      const matches = [...template.content.matchAll(/\{\{(\w+)\}\}/g)];
      
      matches.forEach(match => {
        const val = resolveVar(match[1]);
        resolvedContent = resolvedContent.replace(new RegExp(`\\{\\{${match[1]}\\}\\}`, 'g'), val);
      });
      contentToSend = resolvedContent;
    }

    // Prepare components for Meta API using original template variables order
    const variableMatches = [...template.content.matchAll(/\{\{(\w+)\}\}/g)];
    const parameters = variableMatches.map(match => {
      return { type: 'text', text: resolveVar(match[1]) };
    });
    components = parameters.length > 0 ? [{ type: 'body', parameters }] : [];

    const provider = await getWhatsAppProvider(tenantId);
    await provider.sendMessage(
      lead.phone, 
      template.waTemplateName || 'hello_world', 
      template.waLanguage || 'en_US', 
      components
    );

    const result = await tPrisma.$transaction(async (tx: any) => {
      const activity = await tx.leadActivity.create({
        data: {
          leadId,
          userId,
          type: 'WHATSAPP',
          description: contentToSend,
        },
      });

      await tx.whatsAppMessage.create({
        data: {
          leadId,
          direction: 'OUTBOUND',
          status: 'SENT',
          messageType: 'TEMPLATE',
          content: contentToSend!,
        },
      });

      await tx.lead.update({
        where: { id: leadId },
        data: {
          lastContactedAt: new Date() },
      });

      return activity;
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error using template:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: (error as any).errors });
    }
    res.status(500).json({ error: 'Failed to send template message' });
  }
};

export const syncMetaTemplate = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const tPrisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;

    const result = await tPrisma.$transaction(async (tx: any) => {
      const template = await tx.whatsAppTemplate.findUnique({
        where: { id },
      });

      if (!template) {
        throw new Error('Template not found');
      }

      const updated = await tx.whatsAppTemplate.update({
        where: { id },
        data: {
          waStatus: 'APPROVED',
          lastUpdatedById: userId,
        },
      });

      await tx.auditLog.create({
        data: {
          action: 'SYNC_META',
          entityType: 'TEMPLATE',
          entityId: id,
          userId,
          tenantId,
          details: { status: 'APPROVED' },
        },
      });

      return updated;
    });

    res.json({ data: result });
  } catch (error) {
    console.error('Error syncing meta template:', error);
    if (error instanceof Error && error.message === 'Template not found') {
      return res.status(404).json({ error: 'Template not found' });
    }
    res.status(500).json({ error: 'Failed to sync template with Meta' });
  }
};


import { Request, Response } from 'express';
import { getTenantPrisma, prisma } from '../lib/prisma';
import { getWhatsAppProvider } from '../services/whatsapp.service';

export const sendMessage = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { leadId, toPhone, content, isTemplate, templateName, components } = req.body;

    if (!leadId || !toPhone || (!content && !isTemplate)) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    const prisma = getTenantPrisma(tenantId);
    let provider;
    
    try {
      provider = await getWhatsAppProvider(tenantId);
    } catch (e) {
      // Mock for MVP
      const ProviderMock = require('../services/whatsapp.service').MetaWhatsAppProvider;
      provider = new ProviderMock({});
    }

    let providerMessageId;
    if (isTemplate && templateName) {
      providerMessageId = await provider.sendMessage(toPhone, templateName, 'en_US');
    } else {
      providerMessageId = await provider.sendMessage(toPhone, content);
    }

    // Save Message Record
    const message = await prisma.whatsAppMessage.create({
      data: {
        tenantId,
        leadId,
        direction: 'OUTBOUND',
        status: 'SENT',
        messageType: isTemplate ? 'TEMPLATE' : 'TEXT',
        content: content || `Template: ${templateName}`,
        providerMessageId
      }
    });

    // Log Activity
    await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId,
        userId: req.user!.userId,
        type: 'WHATSAPP',
        description: `WhatsApp message sent`,
        metadata: { messageId: message.id }
      }
    });

    res.status(200).json({ status: 'success', data: message });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/whatsapp/messages?leadId=...
 */
export const getMessages = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const { leadId } = req.query;

    if (!leadId) {
      return res.status(400).json({ error: 'leadId is required' });
    }

    const prisma = getTenantPrisma(tenantId);
    const messages = await prisma.whatsAppMessage.findMany({
      where: { leadId: leadId as string },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ data: messages });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * GET /api/whatsapp/conversations — Lists leads with WhatsApp activity
 */
export const getConversations = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);

    // Fetch leads that have at least one WhatsApp message
    const leadsWithMessages = await prisma.lead.findMany({
      where: {
        whatsappMessages: {
          some: {},
        },
      },
      include: {
        whatsappMessages: {
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
      take: 50,
    });

    // If no leads have WhatsApp messages yet, return recent leads for quick chat initiation
    if (leadsWithMessages.length === 0) {
      const recentLeads = await prisma.lead.findMany({
        take: 20,
        orderBy: { createdAt: 'desc' },
      });
      return res.json({
        data: recentLeads.map((l) => ({
          lead: l,
          lastMessage: null,
        })),
      });
    }

    const data = leadsWithMessages.map((lead) => ({
      lead: {
        id: lead.id,
        firstName: lead.firstName,
        lastName: lead.lastName,
        phone: lead.phone,
        status: lead.status,
        companyName: lead.companyName,
      },
      lastMessage: lead.whatsappMessages[0] || null,
    }));

    res.json({ data });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleWhatsAppWebhook = async (req: Request, res: Response) => {
  try {
    if (req.method === 'GET') {
      // Hub challenge verification
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      if (mode && token === process.env.WHATSAPP_VERIFY_TOKEN) {
        return res.status(200).send(challenge);
      }
      return res.status(403).send('Forbidden');
    }

    // Handle POST messages/statuses
    const body = req.body;
    if (body.object === 'whatsapp_business_account') {
      for (const entry of body.entry) {
        for (const change of entry.changes) {
          if (change.value.messages) {
            // It's an incoming message
            for (const msg of change.value.messages) {
              const from = msg.from; // Phone number
              const text = msg.text?.body;
              
              if (text) {
                console.log(`[WhatsApp Incoming] From: ${from}, Message: ${text}`);
                const cleanPhone = from.replace(/\D/g, '').slice(-10);
                const lead = await prisma.lead.findFirst({
                  where: { phone: { contains: cleanPhone } },
                });
                if (lead) {
                  await prisma.whatsAppMessage.create({
                    data: {
                      tenantId: lead.tenantId,
                      leadId: lead.id,
                      direction: 'INBOUND',
                      status: 'DELIVERED',
                      messageType: 'TEXT',
                      content: text,
                      providerMessageId: msg.id,
                    },
                  });
                  await prisma.leadActivity.create({
                    data: {
                      tenantId: lead.tenantId,
                      leadId: lead.id,
                      type: 'WHATSAPP',
                      description: `Incoming WhatsApp: "${text.substring(0, 60)}${text.length > 60 ? '...' : ''}"`,
                    },
                  });
                }
              }
            }
          }
        }
      }
    }

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error('WhatsApp Webhook Error:', error);
    res.status(500).send('Server Error');
  }
};

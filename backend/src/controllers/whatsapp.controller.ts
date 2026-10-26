import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';
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
                // In production, resolve tenant by matching the receiving phone number against IntegrationConfig
                // For MVP, just log the incoming message
                console.log(`[WhatsApp Incoming] From: ${from}, Message: ${text}`);
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

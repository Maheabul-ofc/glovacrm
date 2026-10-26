import { Worker, Job } from 'bullmq';
import { redisConnection, campaignQueue } from '../lib/queue';
import { getTenantPrisma } from '../lib/prisma';
import { getWhatsAppProvider } from '../services/whatsapp.service';

export const campaignWorker = new Worker('campaigns', async (job: Job) => {
  const { tenantId, campaignId } = job.data;
  console.log(`Starting campaign broadcast for ${campaignId}`);

  try {
    const prisma = getTenantPrisma(tenantId);
    
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { leads: true } // Or fetch leads based on targetAudience criteria
    });

    if (!campaign || campaign.status !== 'RUNNING') return;

    let provider;
    try {
      provider = await getWhatsAppProvider(tenantId);
    } catch (e) {
      // Mock for MVP
      const ProviderMock = require('../services/whatsapp.service').WhatsAppCloudProvider;
      provider = new ProviderMock({});
    }

    let sentCount = 0;
    
    // Broadcast loop (in production, batch this or spawn child jobs per lead)
    for (const lead of campaign.leads) {
      if (!lead.phone) continue;
      
      try {
        const messageId = await provider.sendTemplate(lead.phone, campaign.templateName || 'default_template', []);
        
        await prisma.whatsAppMessage.create({
          data: {
            tenantId,
            leadId: lead.id,
            direction: 'OUTBOUND',
            status: 'SENT',
            messageType: 'TEMPLATE',
            content: `Campaign Broadcast: ${campaign.templateName}`,
            providerMessageId: messageId
          }
        });
        
        sentCount++;
      } catch (err) {
        console.error(`Failed to send campaign message to ${lead.phone}`, err);
      }
    }

    // Update campaign metrics and status
    await prisma.campaign.update({
      where: { id: campaignId },
      data: {
        status: 'COMPLETED',
        metrics: { sent: sentCount, total: campaign.leads.length }
      }
    });

    return { status: 'success', sent: sentCount };
  } catch (error) {
    console.error(`Campaign worker error: `, error);
    throw error;
  }
}, { connection: redisConnection });

campaignWorker.on('completed', (job) => {
  console.log(`Campaign ${job.id} completed successfully`);
});

campaignWorker.on('error', (err) => {
  console.warn('[Campaign Worker] Redis warning:', err.message);
});

import { Worker, Job } from 'bullmq';
import { redisConnection, followUpQueue } from '../lib/queue';
import { prisma } from '../lib/prisma';

// This worker processes a job that scans for due follow-ups
export const followUpWorker = new Worker('follow-ups', async (job: Job) => {
  console.log(`[FollowUp Worker] Running scan for due follow-ups...`);

  try {
    const now = new Date();
    
    // Find leads where nextFollowUpAt is in the past and not null
    const dueLeads = await prisma.lead.findMany({
      where: {
        nextFollowUpAt: {
          lte: now
        }
      },
      select: { id: true, tenantId: true, assignedToId: true, nextFollowUpAt: true }
    });

    if (dueLeads.length === 0) return;

    console.log(`[FollowUp Worker] Found ${dueLeads.length} due leads.`);

    // Process them
    for (const lead of dueLeads) {
      if (!lead.assignedToId) continue;

      // Create an activity notification
      await prisma.leadActivity.create({
        data: {
          tenantId: lead.tenantId,
          leadId: lead.id,
          userId: lead.assignedToId,
          type: 'REMINDER',
          description: `Follow-up reminder is due for this lead.`,
          metadata: { dueAt: lead.nextFollowUpAt }
        }
      });

      // Clear the nextFollowUpAt field so it doesn't trigger again
      await prisma.lead.update({
        where: { id: lead.id },
        data: { nextFollowUpAt: null }
      });
    }

    console.log(`[FollowUp Worker] Successfully processed ${dueLeads.length} follow-ups.`);
  } catch (error) {
    console.error(`[FollowUp Worker] Error processing follow-ups:`, error);
    throw error;
  }
}, { connection: redisConnection });

followUpWorker.on('error', (err) => {
  console.warn('[FollowUp Worker] Redis warning:', err.message);
});

// Schedule the repeatable job (runs every minute)
const scheduleFollowUpCron = async () => {
  await followUpQueue.add('scan-due-reminders', {}, {
    repeat: {
      pattern: '* * * * *', // Every minute
    }
  } as any);
};

scheduleFollowUpCron().catch(console.error);

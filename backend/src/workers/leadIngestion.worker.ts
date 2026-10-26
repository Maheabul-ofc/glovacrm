import { Worker, Job } from 'bullmq';
import { redisConnection } from '../lib/queue';
import { getTenantPrisma, prisma } from '../lib/prisma';
import { assignLeadRoundRobin } from '../services/assignment.service';

export const leadIngestionWorker = new Worker('lead-ingestion', async (job: Job) => {
  const { tenantId, source, payload } = job.data;
  console.log(`Processing lead from ${source} for tenant ${tenantId}`);

  try {
    const tenantPrisma = getTenantPrisma(tenantId);

    // 1. Normalization (Basic example)
    let firstName = 'Unknown';
    let lastName = '';
    // 2. Normalize Payload based on source
    let normalizedData: any = {};
    
    if (source === 'META_LEAD_ADS') {
      // Logic to fetch lead data from Meta Graph API using payload.leadgen_id
      normalizedData = {
        firstName: payload.full_name?.split(' ')[0] || 'Meta Lead',
        lastName: payload.full_name?.split(' ')[1] || '',
        phone: payload.phone_number,
        email: payload.email,
        source: 'FACEBOOK'
      };
    } else if (source === 'GOOGLE_ADS') {
      normalizedData = {
        firstName: payload.user_column_data?.find((c: any) => c.column_id === 'FIRST_NAME')?.string_value || 'Google Lead',
        phone: payload.user_column_data?.find((c: any) => c.column_id === 'PHONE_NUMBER')?.string_value,
        source: 'GOOGLE'
      };
    } else if (source === 'INDIAMART') {
      normalizedData = {
        firstName: payload.SENDERNAME,
        phone: payload.SENDERMOBILE,
        email: payload.SENDEREMAIL,
        companyName: payload.SENDERCOMPANY,
        city: payload.SENDERCITY,
        source: 'PORTAL'
      };
    } else if (source === 'JUSTDIAL') {
      normalizedData = {
        firstName: payload.lead_name || 'JustDial Lead',
        phone: payload.lead_contact,
        email: payload.lead_email,
        city: payload.lead_city,
        source: 'PORTAL'
      };
    } else if (source === '99ACRES') {
      normalizedData = {
        firstName: payload.Name || '99Acres Lead',
        phone: payload.Phone,
        email: payload.Email,
        notes: `Project: ${payload.ProjectName}`,
        source: 'PORTAL'
      };
    } else if (source === 'MAGICBRICKS') {
      normalizedData = {
        firstName: payload.name || 'MagicBricks Lead',
        phone: payload.mobile,
        email: payload.email,
        notes: `Property ID: ${payload.propertyId}`,
        source: 'PORTAL'
      };
    } else {
      normalizedData = payload; // Fallback
    }

    const phone = normalizedData.phone;

    // 2. Deduplication check (very basic)
    if (phone) {
      const existing = await tenantPrisma.lead.findFirst({
        where: { phone, tenantId }
      });
      if (existing) {
        console.log(`Lead ${phone} already exists, skipping or updating.`);
        // Note: For MVP, we skip. In production, we might update or create duplicate flag.
        return { status: 'skipped', reason: 'duplicate' };
      }
    }

    // 3. Create Lead
    const newLead = await tenantPrisma.lead.create({
      data: {
        tenantId,
        firstName: normalizedData.firstName || 'Unknown',
        lastName: normalizedData.lastName || '',
        phone: phone || '0000000000',
        email: normalizedData.email || '',
        source: normalizedData.source || 'OTHER',
        sourceId: payload.id || null,
        companyName: normalizedData.companyName || null,
        notes: normalizedData.notes || null,
        customData: normalizedData.city ? { city: normalizedData.city } : {},
      }
    });

    // 4. Activity Log
    await tenantPrisma.leadActivity.create({
      data: {
        leadId: newLead.id,
        tenantId,
        type: 'STATUS_CHANGE',
        description: `Lead ingested from ${source}`,
        metadata: { source }
      }
    });

    // 5. Assignment (Round Robin)
    try {
      await assignLeadRoundRobin(tenantId, newLead.id);
    } catch (assignmentError) {
      console.error('Failed to auto-assign lead', assignmentError);
    }

    return { status: 'success', leadId: newLead.id };
  } catch (error) {
    console.error(`Error processing job ${job.id}`, error);
    throw error; // Will be retried by BullMQ
  }
}, { connection: redisConnection });

leadIngestionWorker.on('completed', (job) => {
  console.log(`Job ${job.id} completed successfully`);
});

leadIngestionWorker.on('failed', (job, err) => {
  console.log(`Job ${job?.id} failed with ${err.message}`);
});

leadIngestionWorker.on('error', (err) => {
  console.warn('[LeadIngestion Worker] Redis warning:', err.message);
});

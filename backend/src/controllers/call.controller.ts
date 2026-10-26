import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';
import { getTelephonyProvider } from '../services/telephony.service';
import { z } from 'zod';

export const initiateCall = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    let { leadId, toPhone, fromPhone } = req.body;

    if (!toPhone && !leadId) {
      return res.status(400).json({ error: 'Missing phone number or leadId' });
    }

    const prisma = getTenantPrisma(tenantId);

    // Auto-resolve Lead by phone if leadId is missing
    if (!leadId && toPhone) {
      let lead = await prisma.lead.findFirst({
        where: { tenantId, phone: toPhone }
      });
      if (!lead) {
        // Create an Unknown Lead
        lead = await prisma.lead.create({
          data: {
            tenantId,
            firstName: 'Unknown',
            lastName: 'Lead',
            phone: toPhone,
            status: 'NEW',
            source: 'MANUAL',
          }
        });
      }
      leadId = lead.id;
    } else if (leadId && !toPhone) {
      const lead = await prisma.lead.findUnique({ where: { id: leadId } });
      if (lead) {
        toPhone = lead.phone;
      }
    }

    if (!fromPhone) {
      // Mock fromPhone if not provided by the UI
      fromPhone = '+919999999999';
    }

    // Get Provider
    const provider = await getTelephonyProvider(tenantId);

    // Call Provider
    const providerCallId = await provider.initiateCall(fromPhone, toPhone);

    // Save Call Record
    let providerName = 'EXOTEL';
    if (provider.constructor.name === 'TwilioProvider') providerName = 'TWILIO';
    if (provider.constructor.name === 'AndroidAppProvider') providerName = 'ANDROID_APP';

    const call = await prisma.call.create({
      data: {
        tenantId,
        leadId,
        userId,
        provider: providerName,
        providerCallId,
        direction: 'OUTBOUND',
        status: 'INITIATED'
      }
    });

    // Log Activity
    await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId,
        userId,
        type: 'CALL',
        description: `Outbound call initiated via ${providerName}`,
        metadata: { callId: call.id }
      }
    });

    res.status(200).json({ status: 'success', data: call });
  } catch (error: any) {
    console.error(error);
    if (error.message && (error.message.includes('Telephony provider not configured') || error.message.includes('credentials missing'))) {
      return res.status(400).json({ error: error.message });
    }
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const listCalls = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const search = req.query.search as string;
    const leadId = req.query.leadId as string;

    let whereClause: any = {};
    // Support filtering by leadId (for Lead detail Calls Tab)
    if (leadId) whereClause.leadId = leadId;
    if (search) {
      whereClause.OR = [
        { lead: { phone: { contains: search } } },
        { lead: { firstName: { contains: search, mode: 'insensitive' } } },
        { lead: { lastName: { contains: search, mode: 'insensitive' } } }
      ];
    }

    const calls = await prisma.call.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        lead: {
          select: { firstName: true, lastName: true, phone: true }
        },
        user: {
          select: { firstName: true, lastName: true }
        }
      }
    });

    const formattedCalls = calls.map(c => ({
      ...c,
      phoneNumber: c.lead?.phone || ''
    }));

    res.json({ data: formattedCalls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const handleCallWebhook = async (req: Request, res: Response) => {
  try {
    // Public Webhook for Exotel/Twilio to post status updates
    const tenantId = req.query.tenantId as string;
    const { CallSid, CallStatus, Duration, RecordingUrl } = req.body;
    
    if (!tenantId || !CallSid) return res.status(400).send('Bad Request');

    const prisma = getTenantPrisma(tenantId);
    
    await prisma.call.update({
      where: { providerCallId: CallSid },
      data: {
        status: CallStatus || 'COMPLETED',
        duration: parseInt(Duration) || 0,
        recordingUrl: RecordingUrl || null
      }
    });

    res.status(200).send('OK');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal server error');
  }
};

/**
 * Mobile Sync Endpoints
 * Used by the Android App to fetch pending calls and report results
 */
export const getPendingMobileCalls = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const prisma = getTenantPrisma(tenantId);

    // Fetch calls initiated by this user that are meant for the Android App
    const pendingCalls = await prisma.call.findMany({
      where: {
        tenantId,
        userId,
        provider: 'ANDROID_APP',
        status: 'INITIATED'
      },
      include: {
        lead: {
          select: { phone: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Mark them as IN_PROGRESS since the app is picking them up
    if (pendingCalls.length > 0) {
      await prisma.call.updateMany({
        where: { id: { in: pendingCalls.map(c => c.id) } },
        data: { status: 'IN_PROGRESS' }
      });
    }

    res.json({ data: pendingCalls });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

export const syncMobileCallResult = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const { callId, status, duration } = req.body;

    if (!callId || !status) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }

    await prisma.call.update({
      where: { id: callId },
      data: {
        status: status,
        duration: parseInt(duration) || 0,
      }
    });

    res.json({ status: 'success' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};



/**
 * Deep-Link Manual Call Logger
 */
export const logManualCall = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    let { toPhone, status, duration, leadId } = req.body;

    if ((!toPhone && !leadId) || !status) {
      return res.status(400).json({ error: 'Missing lead, phone number, or status' });
    }

    const prisma = getTenantPrisma(tenantId);
    let finalLeadId = leadId;

    if (!finalLeadId) {
      // Auto-resolve Lead by phone
      let lead = await prisma.lead.findFirst({
        where: { tenantId, phone: toPhone }
      });
      
      if (!lead) {
        // Create an Unknown Lead
        lead = await prisma.lead.create({
          data: {
            tenantId,
            firstName: 'Unknown',
            lastName: 'Lead',
            phone: toPhone,
            status: 'NEW',
            source: 'MANUAL',
          }
        });
      }
      finalLeadId = lead.id;
    }

    const recordingUrl = req.file ? `/uploads/${req.file.filename}` : undefined;

    // Save Call Record
    const call = await prisma.call.create({
      data: {
        tenantId,
        leadId: finalLeadId,
        userId,
        provider: 'MANUAL',
        providerCallId: 'manual-' + Date.now(),
        direction: 'OUTBOUND',
        status: status,
        duration: parseInt(duration) || 0,
        recordingUrl: recordingUrl
      }
    });

    // Log Activity
    await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId: finalLeadId,
        userId,
        type: 'CALL',
        description: 'Manual call logged as ' + status,
        metadata: { callId: call.id, duration }
      }
    });

    res.status(200).json({ status: 'success', data: call });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * Update a call record — used by frontend timer to save duration after call ends
 */
export const updateCall = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    const { status, duration, notes } = req.body;

    const call = await prisma.call.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(duration !== undefined && { duration: parseInt(String(duration)) }),
        ...(notes !== undefined && { notes }),
      },
    });

    res.json({ data: call });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

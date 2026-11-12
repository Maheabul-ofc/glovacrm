import { Request, Response } from 'express';
import { getTenantPrisma } from '../lib/prisma';
import { getTelephonyProvider } from '../services/telephony.service';

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

    const whereClause: any = {};
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
 * Deep-Link Manual Call Logger (DISABLED for anti-scam protection)
 */
export const logManualCall = async (_req: Request, res: Response) => {
  return res.status(403).json({
    error: 'Manual call logging is disabled to prevent call tampering. Please make calls through the GlovaCRM Android app for automatic OS-verified call tracking.',
  });
};

/**
 * Update a call record — locked against duration or completion tampering.
 * Only allows adding post-call notes and refining unanswered reasons (for 0s calls).
 */
export const updateCall = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const prisma = getTenantPrisma(tenantId);
    const id = req.params.id as string;
    const { status, duration, notes } = req.body;

    const existing = await prisma.call.findFirst({ where: { id } });
    if (!existing) {
      return res.status(404).json({ error: 'Call record not found' });
    }

    // Never allow modifying duration
    if (duration !== undefined && parseInt(String(duration), 10) !== existing.duration) {
      return res.status(403).json({
        error: 'Call duration is locked and cannot be edited.',
      });
    }

    const updateData: { status?: string; notes?: string } = {};

    if (status && status !== existing.status) {
      const requested = String(status).toUpperCase();
      // Completed calls with talk time cannot be changed; 0s calls can NEVER be marked COMPLETED
      if (existing.duration > 0 || existing.status === 'COMPLETED') {
        return res.status(403).json({
          error: 'Completed call status is locked by OS Call Log verification.',
        });
      }
      if (requested === 'COMPLETED') {
        return res.status(403).json({
          error: 'Cannot mark a 0-second unanswered call as COMPLETED.',
        });
      }
      if (['MISSED', 'NO_ANSWER', 'BUSY', 'FAILED'].includes(requested)) {
        updateData.status = requested;
      }
    }

    if (notes !== undefined) {
      updateData.notes = String(notes);
    }

    const call = await prisma.call.update({
      where: { id },
      data: updateData,
    });

    if (notes && String(notes).trim()) {
      await prisma.leadActivity.create({
        data: {
          tenantId,
          leadId: existing.leadId,
          userId,
          type: 'NOTE',
          description: `Call note: ${String(notes).trim()}`,
          metadata: { callId: existing.id, fromPostCall: true },
        },
      });
    }

    res.json({ data: call });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

/**
 * POST /api/calls/auto-log
 * Called by the GlovaCRM Android app after auto-detecting call completion from Android Call Log.
 * Tamper-proof & idempotent via callKey / providerCallId.
 */
export const autoLogCall = async (req: Request, res: Response) => {
  try {
    const tenantId = req.user!.tenantId;
    const userId = req.user!.userId;
    const {
      phone,
      status,
      duration,
      direction = 'OUTBOUND',
      leadId,
      notes,
      callKey,
      providerCallId,
      callLogType,
      detectedFrom = 'ANDROID_CALL_LOG',
    } = req.body;

    if (!phone && !leadId) {
      return res.status(400).json({ error: 'Missing phone number or leadId' });
    }

    if (!status) {
      return res.status(400).json({ error: 'Missing call status' });
    }

    const parsedDuration = Math.max(0, parseInt(String(duration ?? 0), 10) || 0);
    const rawStatus = String(status).toUpperCase();

    // Enforce anti-scam invariant: 0s can NEVER be COMPLETED; >0s is COMPLETED
    let normalizedStatus: string;
    if (parsedDuration > 0) {
      normalizedStatus = 'COMPLETED';
    } else if (['BUSY', 'REJECTED'].includes(rawStatus)) {
      normalizedStatus = 'BUSY';
    } else if (['FAILED', 'BLOCKED'].includes(rawStatus)) {
      normalizedStatus = 'FAILED';
    } else if (rawStatus === 'NO_ANSWER') {
      normalizedStatus = 'NO_ANSWER';
    } else {
      normalizedStatus = 'MISSED';
    }

    const prisma = getTenantPrisma(tenantId);
    const effectiveCallKey =
      (typeof callKey === 'string' && callKey.trim()) ||
      (typeof providerCallId === 'string' && providerCallId.trim()) ||
      `auto-${Date.now()}-${userId.slice(0, 8)}`;

    // Idempotency check so mobile + web retries never duplicate a call
    const existingCall = await prisma.call.findFirst({
      where: { providerCallId: effectiveCallKey },
    });
    if (existingCall) {
      return res.status(200).json({
        status: 'success',
        message: 'Call already auto-logged',
        data: {
          id: existingCall.id,
          callId: existingCall.id,
          leadId: existingCall.leadId,
          status: existingCall.status,
          duration: existingCall.duration,
          provider: existingCall.provider,
          autoLogged: true,
          deduplicated: true,
        },
      });
    }

    let finalLeadId = leadId as string | undefined;
    if (finalLeadId) {
      const leadExists = await prisma.lead.findFirst({ where: { id: finalLeadId } });
      if (!leadExists) finalLeadId = undefined;
    }

    // Auto-resolve lead by normalized phone number if leadId wasn't supplied
    if (!finalLeadId && phone) {
      const digitsOnly = String(phone).replace(/\D/g, '');
      const last10 = digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly;
      const last4 = digitsOnly.slice(-4);

      let lead = await prisma.lead.findFirst({
        where: {
          OR: [
            { phone: String(phone).trim() },
            ...(last10.length >= 7 ? [{ phone: { endsWith: last10 } }] : []),
          ],
        },
      });

      // Fallback digit-normalized match for formatted DB numbers like "+91 98765-43210"
      if (!lead && last4.length === 4) {
        const candidates = await prisma.lead.findMany({
          where: { phone: { contains: last4 } },
          take: 25,
        });
        lead =
          candidates.find((c) => {
            const cDigits = (c.phone || '').replace(/\D/g, '');
            const cLast10 = cDigits.length >= 10 ? cDigits.slice(-10) : cDigits;
            return cLast10 === last10 || cDigits.endsWith(last10);
          }) || null;
      }

      if (!lead) {
        lead = await prisma.lead.create({
          data: {
            tenantId,
            firstName: 'Auto',
            lastName: 'Detected',
            phone: String(phone).trim(),
            status: 'NEW',
            source: 'MANUAL',
            notes: 'Auto-created from Android call detection',
          },
        });
      }
      finalLeadId = lead.id;
    }

    if (!finalLeadId) {
      return res.status(400).json({ error: 'Could not resolve lead for call' });
    }

    const call = await prisma.call.create({
      data: {
        tenantId,
        leadId: finalLeadId,
        userId,
        provider: 'ANDROID_AUTO',
        providerCallId: effectiveCallKey,
        direction: String(direction).toUpperCase(),
        status: normalizedStatus,
        duration: parsedDuration,
        notes: notes || null,
      },
    });

    // Update lead lastContactedAt
    await prisma.lead.update({
      where: { id: finalLeadId },
      data: { lastContactedAt: new Date() },
    }).catch(() => {});

    const durationStr =
      call.duration > 0
        ? `${Math.floor(call.duration / 60)}m ${call.duration % 60}s`
        : '0s';

    await prisma.leadActivity.create({
      data: {
        tenantId,
        leadId: finalLeadId,
        userId,
        type: 'CALL',
        description: `Auto-detected call (${normalizedStatus}) · Verified Duration: ${durationStr}`,
        metadata: {
          callId: call.id,
          duration: call.duration,
          status: normalizedStatus,
          provider: 'ANDROID_AUTO',
          detectedFrom,
          callLogType: callLogType ?? null,
          autoLogged: true,
        },
      },
    });

    res.status(201).json({
      status: 'success',
      message: 'Call auto-logged successfully',
      data: {
        id: call.id,
        callId: call.id,
        leadId: finalLeadId,
        status: normalizedStatus,
        duration: call.duration,
        provider: 'ANDROID_AUTO',
        autoLogged: true,
      },
    });
  } catch (error: any) {
    console.error('[AutoLog] Error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

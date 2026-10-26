import { Request, Response } from 'express';
import { leadIngestionQueue } from '../lib/queue';

// Simulate webhook receiving from multiple sources
export const handleMetaWebhook = async (req: Request, res: Response) => {
  try {
    // 1. Meta Webhook Verification
    if (req.method === 'GET') {
      const mode = req.query['hub.mode'];
      const token = req.query['hub.verify_token'];
      const challenge = req.query['hub.challenge'];
      
      // In production, compare token with tenant's DB config
      if (mode && token) {
        if (mode === 'subscribe') {
          return res.status(200).send(challenge);
        }
      }
      return res.sendStatus(403);
    }

    // 2. Handle POST payload
    const body = req.body;
    
    // Simplistic handling of Meta payload (Assume tenantId is passed in query for now, or mapped via PageId)
    const tenantId = req.query.tenantId as string;
    
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    // Push to Queue for processing
    await leadIngestionQueue.add('meta-lead', {
      tenantId,
      source: 'META_LEAD_ADS',
      payload: body // In reality, we fetch the lead from Meta API using LeadgenId
    });

    res.status(200).send('EVENT_RECEIVED');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server Error');
  }
};

export const handleIndiaMartWebhook = async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    if (!tenantId) {
      return res.status(400).json({ error: 'tenantId is required' });
    }

    // IndiaMART usually sends data via GET query parameters, but we support POST too
    const payload = req.method === 'GET' ? req.query : req.body;

    // Push to queue
    await leadIngestionQueue.add('indiamart-lead', {
      tenantId,
      source: 'INDIAMART',
      payload
    });

    res.status(200).json({ status: 'success' });
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

export const handleGoogleAdsWebhook = async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId as string;
    const googleKey = req.query.key as string; // simple verification

    if (!tenantId || !googleKey) {
      return res.status(400).json({ error: 'tenantId and key are required' });
    }

    // Push to queue
    await leadIngestionQueue.add('google-lead', {
      tenantId,
      source: 'GOOGLE_ADS',
      payload: req.body
    });

    res.status(200).json({ status: 'success' });
  } catch (error) {
    res.status(500).send('Server Error');
  }
};

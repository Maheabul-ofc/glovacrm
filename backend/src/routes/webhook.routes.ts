import { Router } from 'express';
import { handleMetaWebhook, handleIndiaMartWebhook, handleGoogleAdsWebhook } from '../controllers/webhook.controller';

const router = Router();

// Notice: Webhooks are public endpoints (no requireAuth)
// They use their own security (signatures, tokens)

router.get('/meta', handleMetaWebhook);
router.post('/meta', handleMetaWebhook);

router.get('/indiamart', handleIndiaMartWebhook);
router.post('/indiamart', handleIndiaMartWebhook);
router.post('/google-ads', handleGoogleAdsWebhook);

export default router;

import { Router } from 'express';
import { sendMessage, getMessages, getConversations, handleWhatsAppWebhook } from '../controllers/whatsapp.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Internal API
router.post('/send', requireAuth, sendMessage);
router.get('/messages', requireAuth, getMessages);
router.get('/conversations', requireAuth, getConversations);

// External Webhook (Public)
router.get('/webhook', handleWhatsAppWebhook); // For verification
router.post('/webhook', handleWhatsAppWebhook); // For receiving messages/statuses

export default router;

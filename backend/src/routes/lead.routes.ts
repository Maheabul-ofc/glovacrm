import { Router } from 'express';
import { createLead, bulkCreateLeads, listLeads, getLead, updateLead, deleteLead, assignLead, scheduleFollowUp, updateLeadStatus, getLeadHistory, addConversationNote } from '../controllers/lead.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All lead routes require authentication
router.use(requireAuth);

router.post('/', createLead);
router.post('/bulk', bulkCreateLeads);
router.get('/', listLeads);
router.get('/:id', getLead);
router.patch('/:id', updateLead);
router.post('/:id/assign', assignLead);
router.post('/:id/follow-up', scheduleFollowUp);
router.patch('/:id/status', updateLeadStatus);
router.get('/:id/history', getLeadHistory);
router.post('/:id/notes', addConversationNote);
router.delete('/:id', deleteLead);

export default router;

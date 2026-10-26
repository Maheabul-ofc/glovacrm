import { Router } from 'express';
import { createCampaign, listCampaigns, triggerCampaign } from '../controllers/campaign.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['TENANT_ADMIN', 'SUPER_ADMIN']));

router.get('/', listCampaigns);
router.post('/', createCampaign);
router.post('/:id/trigger', triggerCampaign);

export default router;

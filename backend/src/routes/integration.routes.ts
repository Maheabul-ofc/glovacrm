import { Router } from 'express';
import { getIntegrations, saveIntegration } from '../controllers/integration.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);
router.use(requireRole(['TENANT_ADMIN', 'SUPER_ADMIN']));

router.get('/', getIntegrations);
router.post('/', saveIntegration);

export default router;

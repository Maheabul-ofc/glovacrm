import { Router } from 'express';
import { listStages, createStage, updateStage } from '../controllers/stage.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', listStages);
router.post('/', requireRole(['TENANT_ADMIN', 'SUPER_ADMIN']), createStage);
router.patch('/:id', requireRole(['TENANT_ADMIN', 'SUPER_ADMIN']), updateStage);

export default router;

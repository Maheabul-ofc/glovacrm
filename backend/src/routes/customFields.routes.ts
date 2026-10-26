import { Router } from 'express';
import { listFields, createField } from '../controllers/customFields.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/', listFields);
router.post('/', requireRole(['TENANT_ADMIN', 'SUPER_ADMIN']), createField);

export default router;

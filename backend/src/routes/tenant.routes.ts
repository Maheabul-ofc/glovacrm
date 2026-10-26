import { Router } from 'express';
import { listTenants, getTenant, updateTenantStatus, getMyTenant, updateMyTenant } from '../controllers/tenant.controller';
import { requireAuth, requireRole } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

// Tenant Admin Routes (Business Owner)
router.get('/me', requireRole(['TENANT_ADMIN', 'TEAM_MANAGER', 'TELECALLER']), getMyTenant);
router.patch('/me', requireRole(['TENANT_ADMIN']), updateMyTenant);

// Super Admin Routes
router.get('/', requireRole(['SUPER_ADMIN']), listTenants);
router.get('/:id', requireRole(['SUPER_ADMIN']), getTenant);
router.patch('/:id/status', requireRole(['SUPER_ADMIN']), updateTenantStatus);

export default router;

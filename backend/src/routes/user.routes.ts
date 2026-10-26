import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { listUsers, inviteUser, updateUserStatus } from '../controllers/user.controller';

const router = Router();

router.use(requireAuth);

// Only TENANT_ADMIN and TEAM_MANAGER can manage users
router.use(requireRole(['TENANT_ADMIN', 'TEAM_MANAGER']));

router.get('/', listUsers);
router.post('/invite', inviteUser);
router.patch('/:id/status', updateUserStatus);

export default router;

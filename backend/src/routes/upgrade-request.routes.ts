import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { submitRequest, getAllRequests, approveRequest, rejectRequest } from '../controllers/upgrade-request.controller';

const router = Router();

// Public — anyone can submit a request (no auth needed)
router.post('/', submitRequest);

// Super Admin only
router.get('/', requireAuth, requireRole(['SUPER_ADMIN']), getAllRequests);
router.patch('/:id/approve', requireAuth, requireRole(['SUPER_ADMIN']), approveRequest);
router.patch('/:id/reject', requireAuth, requireRole(['SUPER_ADMIN']), rejectRequest);

export default router;

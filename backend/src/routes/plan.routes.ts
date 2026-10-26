import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { createPlan, getPlans, updatePlan, deletePlan } from '../controllers/plan.controller';

const router = Router();

// Publicly readable so tenants can see pricing
router.get('/', requireAuth, getPlans);

// Super Admin only
router.post('/', requireAuth, requireRole(['SUPER_ADMIN']), createPlan);
router.patch('/:id', requireAuth, requireRole(['SUPER_ADMIN']), updatePlan);
router.delete('/:id', requireAuth, requireRole(['SUPER_ADMIN']), deletePlan);

export default router;

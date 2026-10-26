import { Router } from 'express';
import { getDashboardStats, getFullAnalytics, getReportsData } from '../controllers/analytics.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.use(requireAuth);

router.get('/dashboard', getDashboardStats);
router.get('/full', getFullAnalytics);
router.get('/reports', getReportsData);

export default router;

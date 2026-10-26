import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { listCompanies, createCompany, getCompany, updateCompany, getPlatformStats, deleteCompany } from '../controllers/admin.controller';

const router = Router();

// All routes require Super Admin
router.use(requireAuth);
router.use(requireRole(['SUPER_ADMIN']));

router.get('/stats', getPlatformStats);
router.get('/companies', listCompanies);
router.post('/companies', createCompany);
router.get('/companies/:id', getCompany);
router.patch('/companies/:id', updateCompany);
router.delete('/companies/:id', deleteCompany);

export default router;

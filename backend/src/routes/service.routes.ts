import { Router } from 'express';
import { getServices, createService, updateService, deleteService } from '../controllers/service.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// All service routes require authentication
router.use(requireAuth);

router.get('/', getServices);
router.post('/', createService);
router.patch('/:id', updateService);
router.delete('/:id', deleteService);

export default router;

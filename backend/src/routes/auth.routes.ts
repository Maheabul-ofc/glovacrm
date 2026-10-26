import { Router } from 'express';
import { registerTenant, login, getMe, changePassword } from '../controllers/auth.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

router.post('/register', registerTenant);
router.post('/login', login);
router.get('/me', requireAuth, getMe);
router.post('/change-password', requireAuth, changePassword);

export default router;

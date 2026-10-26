import { Router } from 'express';
import { requireAuth } from '../middleware/auth.middleware';
import { getNotifications, markAsRead, deleteNotification } from '../controllers/notification.controller';

const router = Router();

router.use(requireAuth);

router.get('/', getNotifications);
router.post('/read-all', markAsRead);
router.delete('/:id', deleteNotification);

export default router;

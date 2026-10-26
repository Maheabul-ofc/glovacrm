import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { createOrder, verifyPayment, getTransactions } from '../controllers/payment.controller';

const router = Router();

// Tenant initiates payment
router.post('/create-order', requireAuth, createOrder);

// Tenant confirms payment
router.post('/verify-payment', requireAuth, verifyPayment);

// Super Admin views all transactions
router.get('/transactions', requireAuth, requireRole(['SUPER_ADMIN']), getTransactions);

export default router;

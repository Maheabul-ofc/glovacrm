import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { initiateCall, handleCallWebhook, listCalls, getPendingMobileCalls, syncMobileCallResult, logManualCall, updateCall } from '../controllers/call.controller';
import { requireAuth } from '../middleware/auth.middleware';

const router = Router();

// Configure Multer for local audio uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../public/uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'recording-' + uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ storage });

// Internal API
router.get('/', requireAuth, listCalls);
router.post('/initiate', requireAuth, initiateCall);
router.post('/log', requireAuth, upload.single('recording'), logManualCall);
router.patch('/:id', requireAuth, updateCall);

// Android Mobile Sync API (Requires authenticated user/telecaller)
router.get('/mobile-sync', requireAuth, getPendingMobileCalls);
router.post('/mobile-sync', requireAuth, syncMobileCallResult);

// External Webhook (Public)
router.post('/webhook', handleCallWebhook);

export default router;

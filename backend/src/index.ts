import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import path from 'path';
import authRoutes from './routes/auth.routes';
import tenantRoutes from './routes/tenant.routes';
import leadRoutes from './routes/lead.routes';
import customFieldRoutes from './routes/customFields.routes';
import stageRoutes from './routes/stage.routes';
import webhookRoutes from './routes/webhook.routes';
import integrationRoutes from './routes/integration.routes';
import callRoutes from './routes/call.routes';
import whatsappRoutes from './routes/whatsapp.routes';
import campaignRoutes from './routes/campaign.routes';
import analyticsRoutes from './routes/analytics.routes';
import adminRoutes from './routes/admin.routes';
import notificationRoutes from './routes/notification.routes';
import userRoutes from './routes/user.routes';
import serviceRoutes from './routes/service.routes';
import planRoutes from './routes/plan.routes';
import paymentRoutes from './routes/payment.routes';
import upgradeRequestRoutes from './routes/upgrade-request.routes';
import waTemplateRoutes from './routes/wa-template.routes';

// Initialize Workers
import './workers/leadIngestion.worker';
import './workers/campaign.worker';
import './workers/followUp.worker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(helmet({ crossOriginResourcePolicy: false })); // Allow serving cross-origin files like audio
app.use(cors({
  origin: (origin, callback) => {
    // Allow mobile apps, curl, or server-to-server requests without an origin header
    if (!origin) return callback(null, true);
    // In development or local network, allow all origins
    if (process.env.NODE_ENV !== 'production' || origin.includes('localhost') || origin.includes('192.168.')) {
      return callback(null, true);
    }
    const allowed = [process.env.FRONTEND_URL || 'http://localhost:3000'];
    if (allowed.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// Serve Static Files (Recordings)
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'GlovaCRM API is running' });
});
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', message: 'GlovaCRM API is running' });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/webhooks', webhookRoutes);

// Protected Routes
app.use('/api/leads', leadRoutes);
app.use('/api/stages', stageRoutes);
app.use('/api/tenants', tenantRoutes);
app.use('/api/custom-fields', customFieldRoutes);
app.use('/api/integrations', integrationRoutes);
app.use('/api/calls', callRoutes);
app.use('/api/whatsapp', whatsappRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/plans', planRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/upgrade-requests', upgradeRequestRoutes);
app.use('/api/wa-templates', waTemplateRoutes);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

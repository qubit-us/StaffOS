import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import bodyParser from 'body-parser';
import rateLimit from 'express-rate-limit';
import { logger } from './utils/logger.js';
import authRoutes from './routes/auth.js';
import jobRoutes from './routes/jobs.js';
import candidateRoutes from './routes/candidates.js';
import submissionRoutes from './routes/submissions.js';
import clientRoutes from './routes/clients.js';
import vendorRoutes from './routes/vendors.js';
import clientPortalRoutes from './routes/clientPortal.js';
import publicRoutes from './routes/public.js';
import dashboardRoutes from './routes/dashboard.js';
import adminRoutes from './routes/admin.js';
import auditLogRoutes from './routes/auditLogs.js';
import orgAdminRoutes from './routes/orgAdmin.js';
import { mkdirSync } from 'fs';

// Ensure upload dir exists
try { mkdirSync('./uploads/resumes', { recursive: true }); } catch {}

const app = express();
const PORT = process.env.PORT || 3001;

// Trust Railway/Vercel reverse proxy so rate-limit can read real client IPs
app.set('trust proxy', 1);

// Security
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({
  origin: process.env.FRONTEND_URL || true,
  credentials: true,
}));

// Rate limiting
app.use('/api/auth', rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Too many auth requests, please try again later' } }));
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, max: 500 }));

// Parsing
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true }));

// Static uploads
app.use('/uploads', express.static('./uploads'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/jobs', jobRoutes);
app.use('/api/candidates', candidateRoutes);
app.use('/api/submissions', submissionRoutes);
app.use('/api/clients', clientRoutes);
app.use('/api/vendors', vendorRoutes);
app.use('/api/client-portal', clientPortalRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/audit-logs', auditLogRoutes);
app.use('/api/org-admin', orgAdminRoutes);

// Health
app.get('/health', (_, res) => res.json({ status: 'ok', version: '1.0.0', timestamp: new Date().toISOString() }));

// 404
app.use((_, res) => res.status(404).json({ error: 'Route not found' }));

// Error handler
app.use((err, req, res, next) => {
  logger.error('Unhandled error', { error: err.message, stack: err.stack, path: req.path });
  res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`StaffOS API running on port ${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

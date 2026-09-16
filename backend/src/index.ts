import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';
import { startDeliveryCron } from './cron/deliveryGenerator';

// Route imports
import authRoutes from './routes/auth';
import serviceabilityRoutes from './routes/serviceability';
import planRoutes from './routes/plans';
import subscriptionRoutes from './routes/subscriptions';
import addressRoutes from './routes/addresses';
import paymentRoutes from './routes/payments';
import deliveryRoutes from './routes/deliveries';
import adminRoutes from './routes/admin';

const app = express();

// ── Global Middleware ──
app.use(helmet());
app.use(cors({
  origin: (origin, callback) => {
    // Allow server-to-server or no origin
    if (!origin) return callback(null, true);
    
    // Allow localhost, onrender.com, vercel.app, or custom FRONTEND_URL
    if (
      origin.includes('localhost') ||
      origin.endsWith('.onrender.com') ||
      origin.endsWith('.vercel.app') ||
      origin === process.env.FRONTEND_URL ||
      origin === 'https://elaneeru.com'
    ) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json());
app.use(cookieParser());

// ── Health Check ──
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    brand: config.brandName,
    timestamp: new Date().toISOString(),
    env: config.nodeEnv,
  });
});

// ── API Routes ──
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/serviceability', serviceabilityRoutes);
app.use('/api/v1/plans', planRoutes);
app.use('/api/v1/subscriptions', subscriptionRoutes);
app.use('/api/v1/addresses', addressRoutes);
app.use('/api/v1/payments', paymentRoutes);
app.use('/api/v1/deliveries', deliveryRoutes);
app.use('/api/v1/admin', adminRoutes);

// ── 404 Handler ──
app.use((_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// ── Error Handler ──
app.use(errorHandler);

// ── Start Server ──
app.listen(config.port, () => {
  console.log(`\n🥥 ${config.brandName} API running on port ${config.port}`);
  console.log(`   Environment: ${config.nodeEnv}`);
  console.log(`   Health: http://localhost:${config.port}/api/health\n`);

  // Start delivery cron in production/development
  startDeliveryCron();
});

export default app;

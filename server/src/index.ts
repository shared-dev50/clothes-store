import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';

if (process.env.NODE_ENV !== 'test') {
  dotenv.config();
}

const app = express();
const PORT = Number(process.env.PORT) || 5000;
const HOST = '0.0.0.0';
const rawClientUrl = process.env.CLIENT_URL || 'http://localhost:5173';
const primaryClientOrigin = rawClientUrl.replace(/\/+$/, '');
const extraOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(s => s.trim().replace(/\/+$/, '')).filter(Boolean)
  : [];

// Startup Environment Validation
if (process.env.NODE_ENV === 'production') {
  if (!process.env.DATABASE_URL) {
    console.error('❌ CRITICAL ERROR: DATABASE_URL is not set in environment variables!');
  }
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret') {
    console.warn('⚠️ WARNING: JWT_SECRET is using a default or empty value in production. Set a strong secret in Render.');
  }
}

// Cloudinary Configuration Validation
const requiredCloudinaryEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingCloudinaryEnv = requiredCloudinaryEnv.filter(key => !process.env[key]);
if (missingCloudinaryEnv.length > 0) {
  console.warn(`\n⚠️ WARNING: Cloudinary configuration is missing: ${missingCloudinaryEnv.join(', ')}.`);
  console.warn(`Product image uploads will fail until these are added to the server environment.\n`);
}

// Middleware
const allowedOrigins = Array.from(new Set([
  primaryClientOrigin,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...extraOrigins,
])).filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server, Stripe webhooks, Daraja callbacks)
    if (!origin) {
      return callback(null, true);
    }
    const cleanOrigin = origin.replace(/\/+$/, '');
    if (allowedOrigins.includes(cleanOrigin) || (process.env.NODE_ENV !== 'production' && (cleanOrigin.includes('localhost') || cleanOrigin.includes('127.0.0.1')))) {
      return callback(null, true);
    }
    console.warn(`Blocked by CORS: origin "${origin}" not in allowed origins`);
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  credentials: true,
}));
// Mount stripe webhook BEFORE express.json() so it receives the unparsed raw buffer
import paymentRoutes from './routes/paymentRoutes';
app.use('/api/payments/stripe/webhook', express.raw({ type: '*/*' }));

app.use(express.json());
app.use(cookieParser());

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import orderRoutes from './routes/orderRoutes';
import homepageRoutes from './routes/homepageRoutes';

// Routes (supporting both /health and /api/health for Render health checks)
app.use('/health', healthRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/homepage-settings', homepageRoutes);

import { startReleaseExpiredOrdersJob } from './jobs/releaseExpiredOrders';

// Error Handling
app.use(errorHandler);

if (process.env.NODE_ENV !== 'test') {
  // Cancel expired PENDING_PAYMENT orders and release reserved stock (every minute)
  startReleaseExpiredOrdersJob();

  // Start server binding to 0.0.0.0 for containerized platforms like Render
  app.listen(PORT, HOST, () => {
    console.log(`Server running on http://${HOST}:${PORT}`);
  });
}

export default app;

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import categoryRoutes from './routes/categoryRoutes';
import productRoutes from './routes/productRoutes';
import healthRoutes from './routes/healthRoutes';
import { errorHandler } from './middleware/errorHandler';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

// Cloudinary Configuration Validation
const requiredCloudinaryEnv = ['CLOUDINARY_CLOUD_NAME', 'CLOUDINARY_API_KEY', 'CLOUDINARY_API_SECRET'];
const missingCloudinaryEnv = requiredCloudinaryEnv.filter(key => !process.env[key]);
if (missingCloudinaryEnv.length > 0) {
  console.warn(`\n⚠️ WARNING: Cloudinary configuration is missing: ${missingCloudinaryEnv.join(', ')}.`);
  console.warn(`Product image uploads will fail until these are added to the server/.env file.\n`);
}

// Middleware
app.use(cors({ origin: CLIENT_URL }));
// Mount stripe webhook BEFORE express.json() so it can use express.raw()
import paymentRoutes from './routes/paymentRoutes';
app.use('/api/payments/stripe/webhook', express.raw({ type: 'application/json' }));

app.use(express.json());

import authRoutes from './routes/authRoutes';
import adminRoutes from './routes/adminRoutes';
import orderRoutes from './routes/orderRoutes';

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

import { startOrderExpiryJob } from './jobs/expireOrders';

// Error Handling
app.use(errorHandler);

// Start order expiry job
startOrderExpiryJob();

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

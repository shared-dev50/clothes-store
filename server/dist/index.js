"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const healthRoutes_1 = __importDefault(require("./routes/healthRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
if (process.env.NODE_ENV !== 'test') {
    dotenv_1.default.config();
}
const app = (0, express_1.default)();
// Enable trust proxy for Render / reverse proxies (accurately extracts client IP and protocol)
app.set('trust proxy', 1);
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
app.use((0, cors_1.default)({
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
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
app.use('/api/payments/stripe/webhook', express_1.default.raw({ type: '*/*' }));
app.use(express_1.default.json());
app.use((0, cookie_parser_1.default)());
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
const homepageRoutes_1 = __importDefault(require("./routes/homepageRoutes"));
// Routes (supporting both /health and /api/health for Render health checks)
app.use('/health', healthRoutes_1.default);
app.use('/api/health', healthRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
app.use('/api/homepage-settings', homepageRoutes_1.default);
const releaseExpiredOrders_1 = require("./jobs/releaseExpiredOrders");
// Error Handling
app.use(errorHandler_1.errorHandler);
if (process.env.NODE_ENV !== 'test') {
    // Cancel expired PENDING_PAYMENT orders and release reserved stock (every minute)
    (0, releaseExpiredOrders_1.startReleaseExpiredOrdersJob)();
    // Start server binding to 0.0.0.0 for containerized platforms like Render
    app.listen(PORT, HOST, () => {
        console.log(`Server running on http://${HOST}:${PORT}`);
    });
}
exports.default = app;

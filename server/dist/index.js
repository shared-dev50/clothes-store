"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const categoryRoutes_1 = __importDefault(require("./routes/categoryRoutes"));
const productRoutes_1 = __importDefault(require("./routes/productRoutes"));
const healthRoutes_1 = __importDefault(require("./routes/healthRoutes"));
const errorHandler_1 = require("./middleware/errorHandler");
dotenv_1.default.config();
const app = (0, express_1.default)();
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
app.use((0, cors_1.default)({ origin: CLIENT_URL }));
// Mount stripe webhook BEFORE express.json() so it can use express.raw()
const paymentRoutes_1 = __importDefault(require("./routes/paymentRoutes"));
app.use('/api/payments/stripe/webhook', express_1.default.raw({ type: 'application/json' }));
app.use(express_1.default.json());
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const adminRoutes_1 = __importDefault(require("./routes/adminRoutes"));
const orderRoutes_1 = __importDefault(require("./routes/orderRoutes"));
// Routes
app.use('/api/health', healthRoutes_1.default);
app.use('/api/auth', authRoutes_1.default);
app.use('/api/admin', adminRoutes_1.default);
app.use('/api/categories', categoryRoutes_1.default);
app.use('/api/products', productRoutes_1.default);
app.use('/api/orders', orderRoutes_1.default);
app.use('/api/payments', paymentRoutes_1.default);
const expireOrders_1 = require("./jobs/expireOrders");
// Error Handling
app.use(errorHandler_1.errorHandler);
// Start order expiry job
(0, expireOrders_1.startOrderExpiryJob)();
// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});

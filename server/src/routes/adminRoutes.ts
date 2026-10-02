import { Router } from 'express';
import { getAdminProducts, getAdminProductById, createProduct, updateProduct, deleteProduct, getAdminCategories } from '../controllers/adminProductController';
import { authenticate, authorizeAdmin } from '../middleware/auth';

const router = Router();

// All admin routes must be authenticated and authorized
router.use(authenticate);
router.use(authorizeAdmin);

router.get('/categories', getAdminCategories);
router.get('/products', getAdminProducts);
router.get('/products/:id', getAdminProductById);
router.post('/products', createProduct);
router.put('/products/:id', updateProduct);
router.delete('/products/:id', deleteProduct);

import { getAdminOrders, getAdminOrderById, updateOrderStatus } from '../controllers/orderController';

router.get('/orders', getAdminOrders);
router.get('/orders/:id', getAdminOrderById);
router.put('/orders/:id/status', updateOrderStatus);

export default router;

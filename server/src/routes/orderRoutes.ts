import { Router } from 'express';
import { createOrder, getOrder, cancelOrder, getCustomerOrders } from '../controllers/orderController';
import { authenticate, optionalAuthenticate } from '../middleware/auth';

const router = Router();

// Customer order history endpoints (must be authenticated)
router.get('/my-orders', authenticate, getCustomerOrders);
router.get('/me', authenticate, getCustomerOrders);
router.get('/', authenticate, getCustomerOrders);

router.post('/', optionalAuthenticate, createOrder);
router.get('/:orderNumber', optionalAuthenticate, getOrder);
router.post('/:orderNumber/cancel', optionalAuthenticate, cancelOrder);

export default router;

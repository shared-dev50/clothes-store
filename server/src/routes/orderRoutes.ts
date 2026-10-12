import { Router } from 'express';
import { createOrder, getOrder, cancelOrder } from '../controllers/orderController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.post('/', optionalAuthenticate, createOrder);
router.get('/:orderNumber', optionalAuthenticate, getOrder);
router.post('/:orderNumber/cancel', optionalAuthenticate, cancelOrder);

export default router;

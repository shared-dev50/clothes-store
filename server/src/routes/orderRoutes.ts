import { Router } from 'express';
import { createOrder, getOrder } from '../controllers/orderController';
import { optionalAuthenticate } from '../middleware/auth';

const router = Router();

router.post('/', optionalAuthenticate, createOrder);
router.get('/:orderNumber', optionalAuthenticate, getOrder);

export default router;

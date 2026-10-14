import { Router } from 'express';
import { getHomepageSettings } from '../controllers/homepageController';

const router = Router();

router.get('/', getHomepageSettings);

export default router;

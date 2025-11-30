import { Router } from 'express';
import { fetchStatus } from '../controllers/dashboardController';

const router = Router();

router.get('/status', fetchStatus);

export default router;

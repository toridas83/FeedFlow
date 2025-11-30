import { Router } from 'express';
import { analyzeAttempt } from '../controllers/featureController';

const router = Router();

// Trigger feature extraction for a solve attempt
router.post('/attempts/:id/process', analyzeAttempt);

export default router;

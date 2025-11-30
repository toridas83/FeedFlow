import { Router } from 'express';
import { processProblemSetFeatures } from '../controllers/featureSetController';

const router = Router();

// POST /api/feature/problem-set/:id/process
router.post('/problem-set/:id/process', processProblemSetFeatures);

export default router;

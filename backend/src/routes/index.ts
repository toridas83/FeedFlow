import { Router } from 'express';
import healthRouter from './health';
import authRouter from './auth';
import dashboardRouter from './dashboard';
import snapshotsRouter from './snapshots';
import attemptsRouter from './attempts';
import analysisRouter from './analysis';
import problemsRouter from './problems';
import featureRouter from './feature';

const router = Router();

router.use('/health', healthRouter);
router.use('/auth', authRouter);
router.use('/dashboard', dashboardRouter);
router.use('/snapshots', snapshotsRouter);
router.use('/attempts', attemptsRouter);
router.use('/analysis', analysisRouter);
router.use('/problems', problemsRouter);
router.use('/feature', featureRouter);

export default router;

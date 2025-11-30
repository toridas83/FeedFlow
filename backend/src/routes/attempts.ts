import { Router } from 'express';
import { recordEvents, saveSteps, start, submit } from '../controllers/attemptController';

const router = Router();

router.post('/start', start);
router.post('/:id/steps', saveSteps);
router.post('/:id/events', recordEvents);
router.patch('/:id/submit', submit);

export default router;

import { Router } from 'express';
import { fetchSnapshots, fetchSnapshotDetail } from '../controllers/snapshotController';

const router = Router();

router.get('/', fetchSnapshots);
router.get('/:id', fetchSnapshotDetail);

export default router;

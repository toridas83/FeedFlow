import { Router } from 'express';
import { generateProblems, ensureProblemSet, getCurrentProblemSet, regenerateProblemSet, resetSolves } from '../controllers/problemController';

const router = Router();

// POST /api/problems/generate { grade: '1' | '2' | '3', count?: number }
router.post('/generate', generateProblems);
// POST /api/problems/ensure-set { userId, grade, count? }
router.post('/ensure-set', ensureProblemSet);
// GET /api/problems/current?userId=
router.get('/current', getCurrentProblemSet);
// POST /api/problems/regenerate { userId, grade, count? } -> 기존 데이터 초기화 후 새 문제 생성
router.post('/regenerate', regenerateProblemSet);
// POST /api/problems/reset-solves { userId, problemSetId? } -> 풀이 로그 초기화
router.post('/reset-solves', resetSolves);

export default router;

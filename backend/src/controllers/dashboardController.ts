import { Request, Response } from 'express';
import { getDashboardStatus } from '../services/dashboardService';
import { prisma } from '../models/prisma';

export async function fetchStatus(req: Request, res: Response) {
  const userId = String(req.query.userId || '');
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  // 대시보드 진입 시 사용자의 풀이 로그 초기화
  try {
    console.log('[dashboard] reset solves for user', userId);
    const attemptIds = await prisma.solveAttempt.findMany({
      where: { userId },
      select: { id: true },
    }).then(rows => rows.map(r => r.id));

    if (attemptIds.length) {
      const pf = await prisma.problemFeature.deleteMany({ where: { solveAttemptId: { in: attemptIds } } });
      const ev = await prisma.solveEvent.deleteMany({ where: { solveAttemptId: { in: attemptIds } } });
      const st = await prisma.solveStep.deleteMany({ where: { solveAttemptId: { in: attemptIds } } });
      const at = await prisma.solveAttempt.deleteMany({ where: { id: { in: attemptIds } } });
      console.log('[dashboard] reset complete', { attempts: at.count, steps: st.count, events: ev.count, features: pf.count });
    } else {
      console.log('[dashboard] no attempts to reset for user', userId);
    }
  } catch (err) {
    console.error('[dashboard] reset error', err);
  }

  const status = await getDashboardStatus(userId);
  return res.json(status);
}

import { Request, Response } from 'express';
import { generateProblemSet, ensurePlanForProblemSet, specsFromPlan, saveGeneratedProblem, buildAdaptivePlan } from '../services/problemGenerationService';
import { prisma } from '../models/prisma';

export async function generateProblems(req: Request, res: Response) {
  try {
    const grade = String(req.body.grade || '1') as '1' | '2' | '3';
    const count = Number(req.body.count || 12);
    const problemSetId = req.body.problemSetId as string | undefined;

    // 세트 ID가 없으면 신규 세트를 생성(균등분배 기본 계획 저장)
    let setId = problemSetId;
    if (!setId) {
      const set = await prisma.problemSet.create({
        data: {
          userId: req.body.userId || 'unknown-user',
          title: 'Generated Set',
          status: 'in_progress',
        },
      });
      setId = set.id;
    }

    // 계획이 없으면 균등 분배로 저장
    const plan = await ensurePlanForProblemSet(setId, count);
    const specs = specsFromPlan(plan);
    const problems = await generateProblemSet(grade, specs);

    // 생성 결과 DB 저장
    for (const p of problems) {
      await saveGeneratedProblem(setId, p);
    }

    return res.json({ grade, problemSetId: setId, plan, specs, problems });
  } catch (err) {
    console.error('generateProblems error', err);
    return res.status(500).json({ message: '문제 생성 중 오류가 발생했습니다.' });
  }
}

// 문제 세트가 없으면 생성하고, 있으면 반환 (균등 분배 계획)
export async function ensureProblemSet(req: Request, res: Response) {
  try {
    const grade = String(req.body.grade || '1') as '1' | '2' | '3';
  const count = Number(req.body.count || 12);
  const userId = String(req.body.userId || 'unknown-user');

    // 최신 진행 중 세트 조회
    let set = await prisma.problemSet.findFirst({
      where: { userId, status: 'in_progress' },
      orderBy: { createdAt: 'desc' },
    });

    // 없으면 새로 생성
    if (!set) {
      set = await prisma.problemSet.create({
        data: { userId, title: 'Generated Set', status: 'in_progress' },
      });
    }

    // 기존 문제는 모두 삭제 후 새로 채우기
    await prisma.problem.deleteMany({ where: { problemSetId: set.id } });

    // 계획 확보 후 생성/저장
    const plan = await ensurePlanForProblemSet(set.id, count);
    const specs = specsFromPlan(plan);
    const problems = await generateProblemSet(grade, specs);
    for (const p of problems) {
      await saveGeneratedProblem(set.id, p);
    }

    const stored = await prisma.problemSet.findUnique({
      where: { id: set.id },
      include: { problems: { orderBy: { createdAt: 'asc' } } },
    });
    return res.json({ problemSetId: set.id, plan, problems: stored?.problems || [] });
  } catch (err) {
    console.error('ensureProblemSet error', err);
    return res.status(500).json({ message: '문제 세트 확보 중 오류가 발생했습니다.' });
  }
}

// 문제 세트 재생성: 계획 초기화 후 문제 12개 생성/저장
export async function regenerateProblemSet(req: Request, res: Response) {
  try {
    const gradeInput = String(req.body.grade || '') as '1' | '2' | '3';
    const count = Number(req.body.count || 12);
    const userId = String(req.body.userId || 'unknown-user');

    // 사용자의 학년 정보를 우선 적용 (없으면 요청값, 둘 다 없으면 1)
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const grade = (user?.grade as '1' | '2' | '3' | undefined) || gradeInput || '1';

    // 새 계획(정답률 기반)은 기존 풀이 데이터를 사용하므로 초기화 전에 생성
    const plan = await buildAdaptivePlan(userId, count);

    // 진행 중 세트만 정리(완료된 세트/리포트는 보존)
    let set = await prisma.problemSet.findFirst({
      where: { userId, status: 'in_progress' },
      orderBy: { createdAt: 'desc' },
    });
    if (!set) {
      set = await prisma.problemSet.create({
        data: { userId, title: 'Generated Set', status: 'in_progress' },
      });
    }

    // 기존/이전 계획은 먼저 정리 후 새로운 계획을 저장한다 (solve_attempts 초기화 전에 수행)
    await prisma.setGenerationPlan.deleteMany({ where: { userId, problemSetId: { not: set.id } } });
    await prisma.setGenerationPlan.upsert({
      where: { problemSetId: set.id },
      update: {
        userId,
        planJson: plan,
        source: plan.source,
        applied: false,
      },
      create: {
        problemSetId: set.id,
        userId,
        planJson: plan,
        source: plan.source,
        applied: false,
      },
    });

    // 사용자의 문제 ID를 확보(과거 userId가 비어 있어도 문제세트가 사용자 소유이면 포함)
    const userProblems = await prisma.problem.findMany({
      where: { OR: [{ userId }, { problemSet: { userId } }] },
      select: { id: true },
    });
    const problemIds = userProblems.map((p) => p.id);

    // 관련된 시도/로그/피처를 문제 ID/사용자 기반으로 선삭제하여 FK 충돌 방지
    const relatedAttempts = await prisma.solveAttempt.findMany({
      where: {
        OR: [
          { userId },
          problemIds.length ? { problemId: { in: problemIds } } : undefined,
          { problemSetId: set.id },
        ].filter(Boolean) as any,
      },
      select: { id: true },
    });
    const attemptIds = relatedAttempts.map((a) => a.id);

    if (attemptIds.length) {
      await prisma.problemFeature.deleteMany({ where: { solveAttemptId: { in: attemptIds } } });
      await prisma.solveEvent.deleteMany({ where: { solveAttemptId: { in: attemptIds } } });
      await prisma.solveStep.deleteMany({ where: { solveAttemptId: { in: attemptIds } } });
      await prisma.solveAttempt.deleteMany({ where: { id: { in: attemptIds } } });
    }

    // 문제/피처 정리 (문제에 연결된 모든 피처 제거 후 문제 삭제)
    if (problemIds.length) {
      await prisma.problemFeature.deleteMany({ where: { problemId: { in: problemIds } } });
      await prisma.problem.deleteMany({ where: { id: { in: problemIds } } });
    }

    // 새 계획을 기반으로 문제 생성/저장 (정답률 기반)
    const specs = specsFromPlan(plan);
    const problems = await generateProblemSet(grade, specs);
    for (const p of problems) {
      await saveGeneratedProblem(set.id, p, grade);
    }

    const stored = await prisma.problemSet.findUnique({
      where: { id: set.id },
      include: { problems: { orderBy: { createdAt: 'asc' } } },
    });
    return res.json({ problemSetId: set.id, plan, problems: stored?.problems || [] });
  } catch (err) {
    console.error('regenerateProblemSet error', err);
    return res.status(500).json({ message: '문제 세트 재생성 중 오류가 발생했습니다.' });
  }
}

// 진행 중 풀이 데이터 초기화 (attempt/steps/events/features) – 문제/세트는 유지
export async function resetSolves(req: Request, res: Response) {
  try {
    console.log('[reset-solves] start global reset');
    const pf = await prisma.problemFeature.deleteMany({});
    console.log('[reset-solves] problem_features deleted', pf.count);
    const ev = await prisma.solveEvent.deleteMany({});
    console.log('[reset-solves] solve_events deleted', ev.count);
    const st = await prisma.solveStep.deleteMany({});
    console.log('[reset-solves] solve_steps deleted', st.count);
    const at = await prisma.solveAttempt.deleteMany({});
    console.log('[reset-solves] solve_attempts deleted', at.count);

    console.log('[reset-solves] completed');
    return res.json({ ok: true, clearedAttempts: at.count, clearedSteps: st.count, clearedEvents: ev.count, clearedFeatures: pf.count });
  } catch (err) {
    console.error('resetSolves error', err);
    // 실패해도 200으로 응답해 프론트가 멈추지 않도록 함
    return res.json({ ok: false, message: '풀이 데이터 초기화 중 오류가 발생했습니다.', error: String(err) });
  }
}
// 파괴적 작업 없이 기존 세트/문제 조회만 수행
export async function getCurrentProblemSet(req: Request, res: Response) {
  try {
    const userIdRaw = (req.query.userId as string | undefined) || (req.body.userId as string | undefined);
    if (!userIdRaw) return res.json({ problemSetId: null, problems: [] });
    const userId = String(userIdRaw);
    const set = await prisma.problemSet.findFirst({
      where: { userId, status: 'in_progress' },
      orderBy: { createdAt: 'desc' },
      include: { problems: { orderBy: { createdAt: 'asc' } } },
    });
    if (!set) return res.json({ problemSetId: null, problems: [] });
    return res.json({ problemSetId: set.id, problems: set.problems });
  } catch (err) {
    console.error('getCurrentProblemSet error', err);
    return res.status(500).json({ message: '문제 세트 조회 중 오류가 발생했습니다.' });
  }
}

import { Request, Response } from 'express';
import { computeGptFeaturesForProblemSet } from '../services/featureGptService';
import { generateDiagnosticReport } from '../services/reportService';
import { prisma } from '../models/prisma';
import { buildAdaptivePlan } from '../services/problemGenerationService';
import { aggregateSetFeatures } from '../services/featureExtractionService';

export async function processProblemSetFeatures(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const set = await prisma.problemSet.findUnique({ where: { id }, select: { id: true, userId: true } });
    if (!set) return res.status(404).json({ message: 'Problem set not found' });

    // 1) 12문항 완료 후 다음 세트를 위한 계획 갱신/저장
    const plan = await buildAdaptivePlan(set.userId, 12);
    // 이전 계획은 모두 제거하고 최신 계획만 남긴다
    await prisma.setGenerationPlan.deleteMany({ where: { userId: set.userId, problemSetId: { not: id } } });
    await prisma.setGenerationPlan.upsert({
      where: { problemSetId: id },
      update: {
        userId: set.userId,
        planJson: plan,
        source: plan.source,
        applied: false,
      },
      create: {
        problemSetId: id,
        userId: set.userId,
        planJson: plan,
        source: plan.source,
        applied: false,
      },
    });

    // 2) 피처 추출(LLM 기반 포함) → 세트 단위 집계 순으로 실행
    await computeGptFeaturesForProblemSet(id);
    await aggregateSetFeatures(id);

    // 3) 진단 리포트 생성
    await generateDiagnosticReport(id);
    return res.json({ ok: true, problemSetId: id });
  } catch (err) {
    console.error('processProblemSetFeatures error', err);
    return res.status(500).json({ message: '세트 피처 추출 중 오류가 발생했습니다.' });
  }
}

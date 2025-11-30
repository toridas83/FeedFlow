import { prisma } from '../models/prisma';

export async function getDashboardStatus(userId: string) {
  const latestSet = await prisma.problemSet.findFirst({
    where: { userId, diagnosisText: { not: null } },
    orderBy: { diagnosisCreatedAt: 'desc' },
    select: { diagnosisText: true, diagnosisCreatedAt: true },
  });

  const latestAttempt = await prisma.solveAttempt.findFirst({
    where: { userId },
    orderBy: { startedAt: 'desc' },
    select: { startedAt: true },
  });

  const pendingSet = await prisma.problemSet.findFirst({
    where: { userId, diagnosisText: null }, // 아직 진단 리포트가 없는 세트가 있으면 대기중으로 간주
    select: { id: true },
  });

  return {
    // 최근 진단 리포트 발행 시각을 우선 사용, 없으면 최근 풀이 시각
    lastStudyDate: latestSet?.diagnosisCreatedAt?.toISOString() ?? latestAttempt?.startedAt.toISOString() ?? null,
    lastSnapshotSummary: latestSet?.diagnosisText ?? '',
    pendingProblemSet: Boolean(pendingSet),
  };
}

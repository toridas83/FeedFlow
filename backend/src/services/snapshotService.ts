import { prisma } from '../models/prisma';

export async function listSnapshots(userId: string) {
  const sets = await prisma.problemSet.findMany({
    where: { userId, diagnosisText: { not: null } },
    orderBy: { diagnosisCreatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      diagnosisText: true,
      diagnosisCreatedAt: true,
      createdAt: true,
    },
  });

  return sets.map((s) => ({
    id: s.id,
    title: s.title,
    createdAt: (s.diagnosisCreatedAt ?? s.createdAt).toISOString(),
    summary: s.diagnosisText ?? '',
  }));
}

export async function getSnapshotDetail(userId: string, id: string) {
  const set = await prisma.problemSet.findFirst({
    where: { id, userId },
    select: {
      id: true,
      title: true,
      diagnosisText: true,
      diagnosisCreatedAt: true,
      createdAt: true,
    },
  });

  if (!set) return null;

  return {
    id: set.id,
    title: set.title,
    createdAt: (set.diagnosisCreatedAt ?? set.createdAt).toISOString(),
    reportContent: set.diagnosisText ?? '',
    summary: set.diagnosisText ?? '',
  };
}


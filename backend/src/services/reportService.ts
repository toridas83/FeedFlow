import { prisma } from '../models/prisma';
import { getOpenAIClient } from './assistantClient';
import { config } from '../config/env';

type FeatureId = number;
type GroupKey =
  | 'G1_concept_representation'
  | 'G2_procedural_logic'
  | 'G3_metacognition'
  | 'G4_persistence_pace'
  | 'G5_strategy_resource';

const REVERSE_FEATURES: Set<FeatureId> = new Set([2, 8, 9, 11, 12, 14, 16, 19, 21, 23, 26, 30]);
const GROUPS: Record<GroupKey, FeatureId[]> = {
  G1_concept_representation: [2, 3, 13, 20, 23, 24],
  G2_procedural_logic: [4, 5, 6, 7, 10, 18, 22, 25, 28],
  G3_metacognition: [1, 8, 11, 12, 19, 21, 29],
  G4_persistence_pace: [14, 15, 17, 26, 27],
  G5_strategy_resource: [9, 16, 30],
};

export async function generateDiagnosticReport(problemSetId: string) {
  const assistantId = config.openai.assistants.report;
  if (!assistantId) throw new Error('OPENAI_ASSISTANT_ID_REPORT is not set');
  const client = getOpenAIClient();

  // 문제/시도/피처 수집
  const problems = await prisma.problem.findMany({ where: { problemSetId }, orderBy: { createdAt: 'asc' } });
  const attempts = await prisma.solveAttempt.findMany({ where: { problemSetId }, orderBy: { startedAt: 'asc' } });
  // 세트 단위 피처만 사용 (집계/역변환 완료된 값)
  const features = await prisma.problemFeature.findMany({ where: { problemSetId, scope: 'set' } });
  const set = await prisma.problemSet.findUnique({ where: { id: problemSetId }, include: { user: true } });

  const featureScores = aggregateFeatureScores(features);
  const groupScores = computeGroupScores(featureScores);
  const questionInfo = problems.map((p, idx) => {
    const attempt = attempts.find((a) => a.problemId === p.id);
    return {
      number: idx + 1,
      learning_stage: p.learningStage || null,
      evaluation_area: p.evaluationArea || null,
      content_area: p.contentArea || null,
      difficulty: p.difficulty || null,
      is_correct: attempt?.result === 'correct' || false,
    };
  });

  const payload = {
    feature_scores: featureScores,
    group_scores: groupScores,
    questions: questionInfo,
    user_grade: set?.user?.grade || null,
  };

  const userContent = JSON.stringify(payload);
  const thread = await client.beta.threads.create();
  await client.beta.threads.messages.create(thread.id, { role: 'user', content: userContent });
  let run = await client.beta.threads.runs.create(thread.id, { assistant_id: assistantId });
  while (run.status === 'queued' || run.status === 'in_progress') {
    await new Promise((r) => setTimeout(r, 500));
    run = await client.beta.threads.runs.retrieve(thread.id, run.id);
  }
  if (run.status !== 'completed') {
    throw new Error(`Report assistant failed: ${run.status}`);
  }
  const messages = await client.beta.threads.messages.list(thread.id);
  const msg = messages.data.find((m: any) => m.role === 'assistant');
  const reportText = msg?.content?.[0]?.text?.value?.trim();
  if (!reportText) throw new Error('Report text not found');

  await prisma.problemSet.update({
    where: { id: problemSetId },
    data: {
      diagnosisText: reportText,
      diagnosisCreatedAt: new Date(),
      status: 'completed',
    },
  });
}

function aggregateFeatureScores(features: any[]) {
  const result: Record<number, number> = {};
  if (!features.length) return result;
  const f = features[0]; // scope=set 단일
  for (let i = 1; i <= 30; i++) {
    const key = `f${i}`;
    const val = f[key];
    if (val === null || val === undefined) continue;
    const num = Number(val);
    result[i] = num;
  }
  return result;
}

function computeGroupScores(featureScores: Record<number, number>) {
  const groupScores: Record<GroupKey, number> = {} as any;
  (Object.keys(GROUPS) as GroupKey[]).forEach((g) => {
    const vals = GROUPS[g]
      .map((fid) => {
        const v = featureScores[fid];
        if (v === undefined) return null;
        return v; // 이미 집계 시 역변환 완료
      })
      .filter((v) => v !== null) as number[];
    groupScores[g] = vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
  });
  return groupScores;
}

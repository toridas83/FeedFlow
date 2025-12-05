import { prisma } from '../models/prisma';
import { getOpenAIClient } from './assistantClient';
import { config } from '../config/env';

interface GptFeaturePayload {
  problem_text: string;
  correct_option: string;
  student_answer: { option: string; is_correct: boolean };
  solution_steps: Array<{ index: number; content: string }>;
}

export async function computeGptFeaturesForProblemSet(problemSetId: string) {
  const assistantId = config.openai.assistants.featureExtract;
  if (!assistantId) throw new Error('OPENAI_ASSISTANT_ID_FEATURE_EXTRACT is not set');
  const client = getOpenAIClient();

  const attempts = await prisma.solveAttempt.findMany({
    where: { problemSetId },
    include: {
      problem: true,
      solveSteps: { orderBy: { stepIndex: 'asc' } },
      solveEvents: {
        where: { eventType: 'EVAL_RESULT' },
        orderBy: { clientTimestamp: 'desc' },
      },
    },
  });

  for (const attempt of attempts) {
    console.log('[feature-gpt] start', { attemptId: attempt.id, problemId: attempt.problemId });
    const payload = buildPayload(attempt);
    if (!payload) continue;
    const featureValues = await callAssistant(client, assistantId, payload);
    if (!featureValues) continue;

    await prisma.problemFeature.upsert({
      where: { solveAttemptId: attempt.id },
      create: {
        id: attempt.id,
        userId: attempt.userId,
        problemId: attempt.problemId,
        problemSetId: attempt.problemSetId,
        solveAttemptId: attempt.id,
        modelVersion: 'analysis_gpt_v1',
        ...mapFeatures(featureValues),
      },
      update: {
        ...mapFeatures(featureValues),
        updatedAt: new Date(),
      },
    });
    console.log('[feature-gpt] done', { attemptId: attempt.id, problemId: attempt.problemId });
  }
}

function buildPayload(attempt: any): GptFeaturePayload | null {
  const problem = attempt.problem;
  const steps = attempt.solveSteps || [];
  const evalEvent = attempt.solveEvents?.[0];
  const studentOption = evalEvent?.payloadJson?.selectedOption ?? evalEvent?.payloadJson?.option ?? '';
  const studentAnswer = studentOption ? studentOption.toString() : '';

  if (!problem?.content) return null;
  return {
    problem_text: problem.content,
    correct_option: problem.answer || '',
    student_answer: {
      option: studentAnswer,
      is_correct: attempt.result === 'correct',
    },
    solution_steps: steps.map((s: any) => ({
      index: s.stepIndex,
      content: s.content || '',
    })),
  };
}

async function callAssistant(client: any, assistantId: string, payload: GptFeaturePayload): Promise<Record<string, number> | null> {
  const userContent = JSON.stringify(payload);
  const thread = await client.beta.threads.create();
  await client.beta.threads.messages.create(thread.id, { role: 'user', content: userContent });
  let run = await client.beta.threads.runs.create(thread.id, { assistant_id: assistantId });
  while (run.status === 'queued' || run.status === 'in_progress') {
    await new Promise((r) => setTimeout(r, 500));
    run = await client.beta.threads.runs.retrieve(thread.id, run.id);
  }
  if (run.status !== 'completed') {
    console.error('feature GPT run failed', run.status);
    return null;
  }
  const messages = await client.beta.threads.messages.list(thread.id);
  const assistantMsg = messages.data.find((m: any) => m.role === 'assistant');
  if (!assistantMsg?.content?.[0]?.text?.value) return null;
  try {
    const parsed = JSON.parse(assistantMsg.content[0].text.value.trim());
    return parsed.feature_values || null;
  } catch (e) {
    console.error('feature GPT parse error', e);
    return null;
  }
}

function mapFeatures(values: Record<string, number>) {
  const mapped: any = {};
  Object.entries(values).forEach(([key, val]) => {
    const k = key.startsWith('f') ? key : `f${key}`;
    // 안전장치: 0~1 범위로 클램프
    const num = Number(val);
    mapped[k as keyof typeof mapped] = Number.isFinite(num) ? Math.min(1, Math.max(0, num)) : null;
  });
  return mapped;
}

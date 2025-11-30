import { prisma } from '../models/prisma';
import { getOpenAIClient, getAssistantIdByGrade } from './assistantClient';

type LearningStage = '기본' | '실생활응용';
type EvaluationArea = '계산' | '이해' | '추론' | '문제해결';
type ContentArea = '수와 연산' | '도형과 측정' | '변화와 관계' | '자료와 가능성';
type Difficulty = 1 | 2 | 3;

export interface ProblemSpec {
  learningStage: LearningStage;
  evaluationArea: EvaluationArea;
  contentArea: ContentArea;
  difficulty: Difficulty;
}

export interface GeneratedProblem {
  spec: ProblemSpec;
  content: string;
  questionTopicName?: string | null;
  questionText?: string | null;
  answer?: string | null;
  solution?: string | null;
  proceduralHint?: string | null;
}

export interface PlanJson {
  total_items: number;
  learning_stage_counts: Record<LearningStage, number>;
  evaluation_area_counts: Record<EvaluationArea, number>;
  content_area_counts: Record<ContentArea, number>;
  difficulty_counts: Record<Difficulty, number>;
  source?: string;
  generated_at?: string;
}

// Equal-mix planner: 분포 정보를 모르면 균등하게 섞는다.
export function buildEqualPlan(count = 12): PlanJson {
  const stages: LearningStage[] = ['기본', '실생활응용'];
  const evals: EvaluationArea[] = ['계산', '이해', '추론', '문제해결'];
  const contents: ContentArea[] = ['수와 연산', '도형과 측정', '변화와 관계', '자료와 가능성'];
  const diffs: Difficulty[] = [1, 2, 3];

  // 균등하게 분배하되, count를 넘어가지 않도록 라운드로빈으로 채운다.
  const initCounts = <T extends string | number>(arr: T[]): Record<T, number> => {
    const map: Record<string, number> = {};
    arr.forEach((k) => (map[k] = 0));
    return map as Record<T, number>;
  };

  const plan: PlanJson = {
    total_items: count,
    learning_stage_counts: initCounts(stages),
    evaluation_area_counts: initCounts(evals),
    content_area_counts: initCounts(contents),
    difficulty_counts: initCounts(diffs),
    source: 'equal_default',
    generated_at: new Date().toISOString(),
  };

  for (let i = 0; i < count; i++) {
    plan.learning_stage_counts[stages[i % stages.length]] += 1;
    plan.evaluation_area_counts[evals[i % evals.length]] += 1;
    plan.content_area_counts[contents[i % contents.length]] += 1;
    plan.difficulty_counts[diffs[i % diffs.length]] += 1;
  }

  return plan;
}

// 오류율 기반 가중치로 비율 결정 (최근 학습 데이터)
function weightsFromAccuracy<T extends string>(
  categories: T[],
  correctByCat: Record<T, number>,
  totalByCat: Record<T, number>,
  totalItems: number,
  minWeight = 0.1
): Record<T, number> {
  const weights: Record<T, number> = {} as Record<T, number>;
  categories.forEach((cat) => {
    const total = totalByCat[cat] || 0;
    const acc = total > 0 ? (correctByCat[cat] || 0) / total : 0.5;
    const errorRate = 1 - acc;
    weights[cat] = errorRate + minWeight;
  });

  const sum = Object.values(weights).reduce((a, b) => a + b, 0) || categories.length;
  const floatCounts: Record<T, number> = {} as Record<T, number>;
  categories.forEach((cat) => {
    floatCounts[cat] = totalItems * (weights[cat] / sum);
  });

  const intCounts: Record<T, number> = {} as Record<T, number>;
  categories.forEach((cat) => (intCounts[cat] = Math.floor(floatCounts[cat])));
  let diff = totalItems - Object.values(intCounts).reduce((a, b) => a + b, 0);
  const sortedCats = [...categories].sort((a, b) => (floatCounts[b] - intCounts[b]) - (floatCounts[a] - intCounts[a]));
  while (diff > 0) {
    const cat = sortedCats.shift();
    if (!cat) break;
    intCounts[cat] += 1;
    diff -= 1;
  }
  return intCounts;
}

export async function buildAdaptivePlan(userId: string, totalItems = 12): Promise<PlanJson> {
  // 최근 완료된 세트 기준으로 적응형 분포를 계산한다. 없으면 전체 히스토리, 그것도 없으면 균등.
  const latestCompleted = await prisma.problemSet.findFirst({
    where: { userId, status: 'completed' },
    orderBy: { createdAt: 'desc' },
  });

  const attempts = await prisma.solveAttempt.findMany({
    where: latestCompleted ? { userId, problemSetId: latestCompleted.id } : { userId },
    include: { problem: true },
  });
  if (!attempts.length) return buildEqualPlan(totalItems);

  const evals: EvaluationArea[] = ['계산', '이해', '추론', '문제해결'];
  const contents: ContentArea[] = ['수와 연산', '도형과 측정', '변화와 관계', '자료와 가능성'];
  const stages: LearningStage[] = ['기본', '실생활응용'];
  const diffs: Difficulty[] = [1, 2, 3];

  const makeCounters = <T extends string>(cats: T[]) => ({
    correct: cats.reduce((m, c) => ({ ...m, [c]: 0 }), {} as Record<T, number>),
    total: cats.reduce((m, c) => ({ ...m, [c]: 0 }), {} as Record<T, number>),
  });

  const evalCounters = makeCounters(evals);
  const contentCounters = makeCounters(contents);
  const stageCounters = makeCounters(stages);
  const diffCounters = makeCounters(diffs.map(String) as unknown as Difficulty[]);

  attempts.forEach((a) => {
    const isCorrect = a.result === 'correct';
    const p = a.problem;
    if (p?.evaluationArea && evalCounters.total[p.evaluationArea as EvaluationArea] !== undefined) {
      evalCounters.total[p.evaluationArea as EvaluationArea] += 1;
      if (isCorrect) evalCounters.correct[p.evaluationArea as EvaluationArea] += 1;
    }
    if (p?.contentArea && contentCounters.total[p.contentArea as ContentArea] !== undefined) {
      contentCounters.total[p.contentArea as ContentArea] += 1;
      if (isCorrect) contentCounters.correct[p.contentArea as ContentArea] += 1;
    }
    if (p?.learningStage && stageCounters.total[p.learningStage as LearningStage] !== undefined) {
      stageCounters.total[p.learningStage as LearningStage] += 1;
      if (isCorrect) stageCounters.correct[p.learningStage as LearningStage] += 1;
    }
    if (p?.difficulty) {
      const d = Number(p.difficulty) as Difficulty;
      if (diffCounters.total[d] !== undefined) {
        diffCounters.total[d] += 1;
        if (isCorrect) diffCounters.correct[d] += 1;
      }
    }
  });

  return {
    total_items: totalItems,
    learning_stage_counts: weightsFromAccuracy(stages, stageCounters.correct, stageCounters.total, totalItems),
    evaluation_area_counts: weightsFromAccuracy(evals, evalCounters.correct, evalCounters.total, totalItems),
    content_area_counts: weightsFromAccuracy(contents, contentCounters.correct, contentCounters.total, totalItems),
    difficulty_counts: weightsFromAccuracy(diffs, diffCounters.correct, diffCounters.total, totalItems),
    source: 'adaptive_from_accuracy',
    generated_at: new Date().toISOString(),
  };
}

// plan_json -> 12개 스펙 생성
export function specsFromPlan(plan: PlanJson): ProblemSpec[] {
  const specs: ProblemSpec[] = [];
  const total = plan.total_items;
  const ls = Object.entries(plan.learning_stage_counts) as [LearningStage, number][];
  const evals = Object.entries(plan.evaluation_area_counts) as [EvaluationArea, number][];
  const contents = Object.entries(plan.content_area_counts) as [ContentArea, number][];
  const diffs = Object.entries(plan.difficulty_counts) as [Difficulty, number][];

  // 라운드로빈으로 counts를 소진하며 스펙 생성
  let i = 0;
  while (specs.length < total) {
    const s = ls[i % ls.length][0];
    const e = evals[i % evals.length][0];
    const c = contents[i % contents.length][0];
    const d = diffs[i % diffs.length][0];
    specs.push({ learningStage: s, evaluationArea: e, contentArea: c, difficulty: d });
    i += 1;
  }
  return specs;
}

// plan을 DB에 보관 (세트별 1개)
export async function ensurePlanForProblemSet(problemSetId: string, totalItems = 12, forceNew = false): Promise<PlanJson> {
  if (!forceNew) {
    const existing = await prisma.setGenerationPlan.findUnique({ where: { problemSetId } });
    if (existing) return existing.planJson as PlanJson;
  }

  const plan = buildEqualPlan(totalItems);
  await prisma.setGenerationPlan.create({
    data: {
      problemSetId,
      userId: (await prisma.problemSet.findUnique({ where: { id: problemSetId } }))?.userId || 'unknown-user',
      planJson: plan,
      source: plan.source,
      applied: false,
    },
  });
  return plan;
}

export async function generateProblemForSpec(grade: '1' | '2' | '3', spec: ProblemSpec): Promise<GeneratedProblem> {
  const assistantId = getAssistantIdByGrade(grade);
  if (!assistantId) {
    throw new Error('Assistant ID for grade not configured');
  }
  const client = getOpenAIClient();

  const userContent =
    `학습단계: ${spec.learningStage}\n` +
    `평가영역: ${spec.evaluationArea}\n` +
    `내용영역: ${spec.contentArea}\n` +
    `난이도: ${spec.difficulty}`;

  // threads/runs API (use positional params to avoid [object Object] issues)
  const thread = await client.beta.threads.create();
  await client.beta.threads.messages.create(thread.id, {
    role: 'user',
    content: userContent,
  });

  let run = await client.beta.threads.runs.create(thread.id, {
    assistant_id: assistantId,
  });

  while (run.status === 'queued' || run.status === 'in_progress') {
    await new Promise((r) => setTimeout(r, 500));
    run = await client.beta.threads.runs.retrieve(thread.id, run.id);
  }

  if (run.status !== 'completed') {
    throw new Error(`Assistant run failed: ${run.status}`);
  }

  const messages = await client.beta.threads.messages.list(thread.id);
  const assistantMsg = messages.data.find((m) => m.role === 'assistant');
  if (!assistantMsg || !assistantMsg.content?.[0]?.text?.value) {
    throw new Error('Assistant response not found');
  }

  const raw = assistantMsg.content[0].text.value.trim();

  // 헬퍼: 코드펜스/설명 텍스트 속 JSON을 안전하게 추출
  const extractJson = (input: string): any | null => {
    // ```json ... ``` 제거
    const fenceMatch = input.match(/```json\s*([\s\S]*?)```/i);
    const candidate = fenceMatch ? fenceMatch[1] : input;
    // 가장 먼저 나타나는 { 부터 마지막 } 까지 부분만 파싱 시도
    const firstBrace = candidate.indexOf('{');
    const lastBrace = candidate.lastIndexOf('}');
    if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) return null;
    const slice = candidate.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(slice);
    } catch {
      return null;
    }
  };

  const parsed = extractJson(raw);

  // 기대 형태: JSON {"question_topic_name": "...", "question_text": "...", "answer": "...", "solution": "...", "procedural_hint": "..."}
  if (parsed && typeof parsed === 'object') {
    return {
      spec,
      content: parsed.question_text || raw,
      questionTopicName: parsed.question_topic_name ?? null,
      questionText: parsed.question_text ?? null,
      answer: parsed.answer ?? null,
      solution: parsed.solution ?? null,
      proceduralHint: parsed.procedural_hint ?? null,
    };
  }

  // 파싱 실패 시 원문 전체가 content로 가지 않도록 best-effort로 필드 분리 (현재 raw 그대로 저장)
  return {
    spec,
    content: raw,
    questionTopicName: null,
    questionText: raw,
    answer: null,
    solution: null,
    proceduralHint: null,
  };
}

export async function generateProblemSet(
  grade: '1' | '2' | '3',
  specs: ProblemSpec[]
): Promise<GeneratedProblem[]> {
  const MAX_RETRY = 3;

  const isValid = (p: GeneratedProblem) =>
    Boolean(p.questionText || p.content) && Boolean(p.answer);

  const results: GeneratedProblem[] = [];
  for (let idx = 0; idx < specs.length; idx++) {
    const spec = specs[idx];
    let attempt = 0;
    let generated: GeneratedProblem | null = null;
    while (attempt < MAX_RETRY) {
      console.log(`[problem-gen] (${idx + 1}/${specs.length}) try ${attempt + 1}/${MAX_RETRY}`);
      const candidate = await generateProblemForSpec(grade, spec);
      if (isValid(candidate)) {
        generated = candidate;
        break;
      }
      attempt += 1;
    }
    if (!generated) {
      throw new Error(`Problem generation failed after ${MAX_RETRY} attempts at index ${idx + 1}`);
    }
    results.push(generated);
  }
  return results;
}

export async function saveGeneratedProblem(problemSetId: string, data: GeneratedProblem, grade?: string | null) {
  const set = await prisma.problemSet.findUnique({ where: { id: problemSetId }, include: { user: true } });
  await prisma.problem.create({
    data: {
      problemSetId,
      userId: set?.userId || 'unknown-user',
      content: data.content,
      questionTopic: data.questionTopicName || null,
      answer: data.answer || '',
      solution: data.solution || null,
      proceduralHint: data.proceduralHint || null,
      learningStage: data.spec.learningStage,
      evaluationArea: data.spec.evaluationArea,
      contentArea: data.spec.contentArea,
      difficulty: String(data.spec.difficulty),
      // 사용자가 설정한 학년을 우선 저장하여 추후 보고서/필터에 활용
      grade: grade || set?.user?.grade || null,
    },
  });
}

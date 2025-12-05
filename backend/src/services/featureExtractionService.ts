import { prisma } from '../models/prisma';
// NOTE: 현재 단계에서는 per-problem raw feature만 적재하고,
// 세트 전체(12문항) 완료 시 최종 30개 feature는 외부 분석/리포트 모듈에서 처리할 예정입니다.
import { cuid } from '@paralleldrive/cuid2';

interface FeatureComputationContext {
  durationMs: number;
  startMs: number;
  submitMs: number | null;
  firstInputMs: number | null;
  firstInputDelaySec: number | null;
  events: Array<{
    eventType: string;
    clientTimestamp: number | null;
    stepIndex: number | null;
    payload?: any;
  }>;
  steps: Array<{
    stepIndex: number;
    createdAt: number;
    updatedAt: number;
    isDeleted: boolean;
    content: string;
  }>;
  problem?: {
    evaluationArea?: string | null;
    contentArea?: string | null;
  };
  expectedScore?: number | null;
  selfConfidence?: number | null;
  result?: string | null;
  hintUsed: boolean;
}

const MODEL_VERSION = 'analysis_mvp_ts_v1_raw';

// Main entry: compute & store feature results for an attempt
export async function computeAndStoreFeatures(attemptId: string) {
  const attempt = await prisma.solveAttempt.findUnique({
    where: { id: attemptId },
    include: {
      solveEvents: true,
      solveSteps: true,
      problem: true,
    },
  });
  if (!attempt) throw new Error('Attempt not found');

  const ctx = buildContext(attempt);
  const f17 = await computeF17(attempt, ctx);
  const f16 = await computeF16(attempt, ctx);
  const rawFeatures = computeRawFeatures(ctx, f17, f16);

  await prisma.problemFeature.upsert({
    where: { solveAttemptId: attempt.id },
    create: mapToProblemFeatureRow(attempt, rawFeatures),
    update: mapToProblemFeatureRow(attempt, rawFeatures),
  });
}

// 세트 단위 집계 (예: F1 스케일링 후 평균)
export async function aggregateSetFeatures(problemSetId: string) {
  const set = await prisma.problemSet.findUnique({ where: { id: problemSetId }, select: { id: true, userId: true } });
  if (!set) return;

  const rows = await prisma.problemFeature.findMany({
    where: { problemSetId, scope: 'attempt' },
    select: {
      f1: true,
      f2: true,
      f3: true,
      f4: true,
      f5: true,
      f6: true,
      f8: true,
      f9: true,
      f10: true,
      f11: true,
      f12: true,
      f13: true,
      f14: true,
      f15: true,
      f16: true,
      f17: true,
      f18: true,
      f20: true,
      f21: true,
      f22: true,
      f23: true,
      f24: true,
      f25: true,
      f26: true,
      f27: true,
      f28: true,
      f29: true,
      f30: true,
    },
  });
  if (!rows.length) return;

  // F1: min-max normalize within set, then 평균
  let f1Avg: number | null = null;
  const f1vals = rows.map((r) => (r.f1 == null ? null : Number(r.f1))).filter((v): v is number => v !== null);
  if (f1vals.length) {
    const min = Math.min(...f1vals);
    const max = Math.max(...f1vals);
    const norm = f1vals.map((v) => (max > min ? (v - min) / (max - min) : 0));
    f1Avg = norm.reduce((a, b) => a + b, 0) / norm.length;
  }

  // F2: 단순 평균
  let f2Avg: number | null = null;
  const f2vals = rows.map((r) => (r.f2 == null ? null : Number(r.f2))).filter((v): v is number => v !== null);
  if (f2vals.length) {
    f2Avg = f2vals.reduce((a, b) => a + b, 0) / f2vals.length;
  }

  // F3: 개념 오류 비율 평균
  let f3Avg: number | null = null;
  const f3vals = rows.map((r) => (r.f3 == null ? null : Number(r.f3))).filter((v): v is number => v !== null);
  if (f3vals.length) {
    f3Avg = f3vals.reduce((a, b) => a + b, 0) / f3vals.length;
  }

  // F4: 절차적 오류 비율 평균
  let f4Avg: number | null = null;
  const f4vals = rows.map((r) => (r.f4 == null ? null : Number(r.f4))).filter((v): v is number => v !== null);
  if (f4vals.length) {
    f4Avg = f4vals.reduce((a, b) => a + b, 0) / f4vals.length;
  }

  // F5: 논리적 비약 비율 평균
  let f5Avg: number | null = null;
  const f5vals = rows.map((r) => (r.f5 == null ? null : Number(r.f5))).filter((v): v is number => v !== null);
  if (f5vals.length) {
    f5Avg = f5vals.reduce((a, b) => a + b, 0) / f5vals.length;
  }

  // F6: 비정규 경로 비율 평균 (detour ratio)
  let f6Avg: number | null = null;
  const f6vals = rows.map((r) => (r.f6 == null ? null : Number(r.f6))).filter((v): v is number => v !== null);
  if (f6vals.length) {
    f6Avg = f6vals.reduce((a, b) => a + b, 0) / f6vals.length;
  }

  // F8: 첫 힌트 시점 비율 평균
  let f8Avg: number | null = null;
  const f8vals = rows.map((r) => (r.f8 == null ? null : Number(r.f8))).filter((v): v is number => v !== null);
  if (f8vals.length) {
    f8Avg = f8vals.reduce((a, b) => a + b, 0) / f8vals.length;
  }

  // F10: 단계 간 숙고 시간 편차 평균
  let f10Avg: number | null = null;
  const f10vals = rows.map((r) => (r.f10 == null ? null : Number(r.f10))).filter((v): v is number => v !== null);
  if (f10vals.length) {
    f10Avg = f10vals.reduce((a, b) => a + b, 0) / f10vals.length;
  }

  // F11: 정답 후 반성 시간 비율 평균
  let f11Avg: number | null = null;
  const f11vals = rows.map((r) => (r.f11 == null ? null : Number(r.f11))).filter((v): v is number => v !== null);
  if (f11vals.length) {
    f11Avg = f11vals.reduce((a, b) => a + b, 0) / f11vals.length;
  }

  // F12: 자기 수정 비율 평균
  let f12Avg: number | null = null;
  const f12vals = rows.map((r) => (r.f12 == null ? null : Number(r.f12))).filter((v): v is number => v !== null);
  if (f12vals.length) {
    f12Avg = f12vals.reduce((a, b) => a + b, 0) / f12vals.length;
  }

  // F13: 과잉 일반화 오류 비율 평균 (LLM 태깅 기반)
  let f13Avg: number | null = null;
  const f13vals = rows.map((r) => (r.f13 == null ? null : Number(r.f13))).filter((v): v is number => v !== null);
  if (f13vals.length) {
    f13Avg = f13vals.reduce((a, b) => a + b, 0) / f13vals.length;
  }

  // F14: 포기 전 시도/초기화 비율 평균
  let f14Avg: number | null = null;
  const f14vals = rows.map((r) => (r.f14 == null ? null : Number(r.f14))).filter((v): v is number => v !== null);
  if (f14vals.length) {
    f14Avg = f14vals.reduce((a, b) => a + b, 0) / f14vals.length;
  }

  // F15: 복잡성 회피 여부 평균(LLM 태깅 기반 0/1)
  let f15Avg: number | null = null;
  const f15vals = rows.map((r) => (r.f15 == null ? null : Number(r.f15))).filter((v): v is number => v !== null);
  if (f15vals.length) {
    f15Avg = f15vals.reduce((a, b) => a + b, 0) / f15vals.length;
  }

  // F16: 유사 영역 과거 정답률(지식 활용) 평균
  let f16Avg: number | null = null;
  const f16vals = rows.map((r) => (r.f16 == null ? null : Number(r.f16))).filter((v): v is number => v !== null);
  if (f16vals.length) {
    f16Avg = f16vals.reduce((a, b) => a + b, 0) / f16vals.length;
  }

  // F17: 반응 속도 변화 지수 평균
  let f17Avg: number | null = null;
  const f17vals = rows.map((r) => (r.f17 == null ? null : Number(r.f17))).filter((v): v is number => v !== null);
  if (f17vals.length) {
    f17Avg = f17vals.reduce((a, b) => a + b, 0) / f17vals.length;
  }

  // F18: 불필요한 입력 비율 평균
  let f18Avg: number | null = null;
  const f18vals = rows.map((r) => (r.f18 == null ? null : Number(r.f18))).filter((v): v is number => v !== null);
  if (f18vals.length) {
    f18Avg = f18vals.reduce((a, b) => a + b, 0) / f18vals.length;
  }

  // F20: 문장→식 변환 오류 비율 평균
  let f20Avg: number | null = null;
  const f20vals = rows.map((r) => (r.f20 == null ? null : Number(r.f20))).filter((v): v is number => v !== null);
  if (f20vals.length) {
    f20Avg = f20vals.reduce((a, b) => a + b, 0) / f20vals.length;
  }

  // F21: 유도된 오류 회복 탄력성 (힌트 사용 시 정답 여부 비율)
  let f21Avg: number | null = null;
  const f21vals = rows.map((r) => (r.f21 == null ? null : Number(r.f21))).filter((v): v is number => v !== null);
  if (f21vals.length) {
    f21Avg = f21vals.reduce((a, b) => a + b, 0) / f21vals.length;
  }

  // F22: 비표준 풀이 비율 평균
  let f22Avg: number | null = null;
  const f22vals = rows.map((r) => (r.f22 == null ? null : Number(r.f22))).filter((v): v is number => v !== null);
  if (f22vals.length) {
    f22Avg = f22vals.reduce((a, b) => a + b, 0) / f22vals.length;
  }

  // F23: 개념 구조 이탈 여부 비율 평균
  let f23Avg: number | null = null;
  const f23vals = rows.map((r) => (r.f23 == null ? null : Number(r.f23))).filter((v): v is number => v !== null);
  if (f23vals.length) {
    f23Avg = f23vals.reduce((a, b) => a + b, 0) / f23vals.length;
  }

  // F24: 기호/변수 재정의 빈도 평균
  let f24Avg: number | null = null;
  const f24vals = rows.map((r) => (r.f24 == null ? null : Number(r.f24))).filter((v): v is number => v !== null);
  if (f24vals.length) {
    f24Avg = f24vals.reduce((a, b) => a + b, 0) / f24vals.length;
  }

  // F25: 반복 오류 패턴 비율 평균 (버그 패턴 / 전체 오류)
  let f25Avg: number | null = null;
  const f25vals = rows.map((r) => (r.f25 == null ? null : Number(r.f25))).filter((v): v is number => v !== null);
  if (f25vals.length) {
    f25Avg = f25vals.reduce((a, b) => a + b, 0) / f25vals.length;
  }

  // F26: 입력 주기 불균형도 평균
  let f26Avg: number | null = null;
  const f26vals = rows.map((r) => (r.f26 == null ? null : Number(r.f26))).filter((v): v is number => v !== null);
  if (f26vals.length) {
    f26Avg = f26vals.reduce((a, b) => a + b, 0) / f26vals.length;
  }

  // F27: 풀이 중단 후 재개 시간 비율 평균
  let f27Avg: number | null = null;
  const f27vals = rows.map((r) => (r.f27 == null ? null : Number(r.f27))).filter((v): v is number => v !== null);
  if (f27vals.length) {
    f27Avg = f27vals.reduce((a, b) => a + b, 0) / f27vals.length;
  }

  // F28: 최적 경로 도달 시간 비율 평균
  let f28Avg: number | null = null;
  const f28vals = rows.map((r) => (r.f28 == null ? null : Number(r.f28))).filter((v): v is number => v !== null);
  if (f28vals.length) {
    f28Avg = f28vals.reduce((a, b) => a + b, 0) / f28vals.length;
  }

  // F29: 오류/힌트 후 재입력 지연 시간 (세트 내 min-max 정규화 후 평균)
  let f29Avg: number | null = null;
  const f29raw = rows.map((r) => (r.f29 == null ? null : Number(r.f29))).filter((v): v is number => v !== null);
  if (f29raw.length) {
    const min = Math.min(...f29raw);
    const max = Math.max(...f29raw);
    const norm = f29raw.map((v) => (max > min ? (v - min) / (max - min) : 0));
    f29Avg = norm.reduce((a, b) => a + b, 0) / norm.length;
  }

  // F30: 시도 대비 정답률 추이 (앞 vs 뒤 구간 비교)
  let f30Score: number | null = null;
  const attemptsOrdered = await prisma.solveAttempt.findMany({
    where: { problemSetId },
    orderBy: { startedAt: 'asc' },
    select: { result: true },
  });
  if (attemptsOrdered.length >= 2) {
    const mid = Math.floor(attemptsOrdered.length / 2);
    const firstHalf = attemptsOrdered.slice(0, mid);
    const secondHalf = attemptsOrdered.slice(mid);
    const rate = (list: typeof attemptsOrdered) =>
      list.length ? list.filter((a) => a.result === 'correct').length / list.length : 0;
    const r1 = rate(firstHalf);
    const r2 = rate(secondHalf);
    // 정답률이 좋아질수록 1에 가깝게, 같으면 0.5, 나빠지면 0~0.5
    const diff = r2 - r1;
    f30Score = clamp(0.5 + diff / 2);
  }
  // F19: 세트 메타인지 일치도 (최신 예상점수 vs 세트 실제 정답률)
  const attemptsForSet = await prisma.solveAttempt.findMany({
    where: { problemSetId },
    select: { expectedScore: true, result: true, submittedAt: true },
    orderBy: { submittedAt: 'desc' },
  });
  let f19Set: number | null = null;
  if (attemptsForSet.length) {
    const latestExpected = attemptsForSet.find((a) => a.expectedScore != null)?.expectedScore;
    const total = attemptsForSet.length;
    const correct = attemptsForSet.filter((a) => a.result === 'correct').length;
    if (latestExpected != null && total > 0) {
      const expectedNorm = Number(latestExpected) / 100;
      const actual = correct / total;
      f19Set = clamp(1 - Math.abs(expectedNorm - actual));
    }
  }

  // F9: 힌트 유형 선호도(가장 많이 사용한 유형 비율) 평균
  let f9Avg: number | null = null;
  const f9vals = rows.map((r) => (r.f9 == null ? null : Number(r.f9))).filter((v): v is number => v !== null);
  if (f9vals.length) {
    f9Avg = f9vals.reduce((a, b) => a + b, 0) / f9vals.length;
  }

  // Risk inversion for specified features
  const invert = (v: number | null) => (v == null ? null : clamp(1 - v));
  f2Avg = invert(f2Avg);
  f8Avg = invert(f8Avg);
  f9Avg = invert(f9Avg);
  f11Avg = invert(f11Avg);
  f12Avg = invert(f12Avg);
  f14Avg = invert(f14Avg);
  f16Avg = invert(f16Avg);
  f19Set = invert(f19Set);
  f21Avg = invert(f21Avg);
  f23Avg = invert(f23Avg);
  f26Avg = invert(f26Avg);
  f30Score = invert(f30Score);

  const id = `set-${problemSetId}`;
  await prisma.problemFeature.upsert({
    where: { id },
    create: {
      id,
      userId: set.userId,
      problemSetId: set.id,
      scope: 'set',
      modelVersion: 'set_agg_v1',
      f1: f1Avg,
      f2: f2Avg,
      f3: f3Avg,
      f4: f4Avg,
      f5: f5Avg,
      f6: f6Avg,
      f8: f8Avg,
      f9: f9Avg,
      f10: f10Avg,
      f11: f11Avg,
      f12: f12Avg,
      f13: f13Avg,
      f14: f14Avg,
      f15: f15Avg,
      f16: f16Avg,
      f17: f17Avg,
      f18: f18Avg,
      f20: f20Avg,
      f21: f21Avg,
      f22: f22Avg,
      f23: f23Avg,
      f24: f24Avg,
      f25: f25Avg,
      f26: f26Avg,
      f27: f27Avg,
      f28: f28Avg,
      f29: f29Avg,
      f30: f30Score,
      f19: f19Set,
    },
    update: {
      userId: set.userId,
      problemSetId: set.id,
      scope: 'set',
      modelVersion: 'set_agg_v1',
      f1: f1Avg,
      f2: f2Avg,
      f3: f3Avg,
      f4: f4Avg,
      f5: f5Avg,
      f6: f6Avg,
      f9: f9Avg,
      f10: f10Avg,
      f11: f11Avg,
      f12: f12Avg,
      f13: f13Avg,
      f14: f14Avg,
      f15: f15Avg,
      f16: f16Avg,
      f17: f17Avg,
      f18: f18Avg,
      f20: f20Avg,
      f21: f21Avg,
      f22: f22Avg,
      f23: f23Avg,
      f24: f24Avg,
      f25: f25Avg,
      f26: f26Avg,
      f27: f27Avg,
      f28: f28Avg,
      f29: f29Avg,
      f30: f30Score,
      f19: f19Set,
      updatedAt: new Date(),
    },
  });
}

function toMs(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  return new Date(date).getTime();
}

function buildContext(attempt: any): FeatureComputationContext {
  const startMs = toMs(attempt.startedAt)!;
  const submitMs = toMs(attempt.submittedAt);
  const firstInputMs = toMs(attempt.firstInputAt);
  const durationMs = submitMs && submitMs > startMs ? submitMs - startMs : 1;
  const firstInputDelaySec = firstInputMs ? Math.max(0, firstInputMs - startMs) / 1000 : null;

  const events = (attempt.solveEvents || []).map((e: any) => ({
    eventType: e.eventType,
    clientTimestamp: toMs(e.clientTimestamp) ?? toMs(e.serverTimestamp),
    stepIndex: e.stepIndex,
    payload: e.payloadJson || {},
  }));

  const steps = (attempt.solveSteps || []).map((s: any) => ({
    stepIndex: s.stepIndex,
    createdAt: toMs(s.createdAt)!,
    updatedAt: toMs(s.updatedAt)!,
    isDeleted: s.isDeleted,
    content: s.content || '',
  }));

  const hintUsed = events.some((e) => e.eventType === 'HINT_CLICK');

  return {
    durationMs,
    startMs,
    submitMs,
    firstInputMs,
    firstInputDelaySec,
    events,
    steps,
    problem: {
      evaluationArea: attempt.problem?.evaluationArea,
      contentArea: attempt.problem?.contentArea,
    },
    expectedScore: attempt.expectedScore,
    selfConfidence: attempt.selfConfidence,
    result: attempt.result,
    hintUsed,
  };
}

// Raw features (0~1). Missing ones are omitted.
function computeRawFeatures(
  ctx: FeatureComputationContext,
  f17Override?: number | null,
  f16Override?: number | null
): Record<number, number> {
  const feats: Record<number, number> = {};
  const { durationMs, startMs, submitMs, firstInputMs, events, steps, expectedScore, selfConfidence, result } = ctx;
  const dur = durationMs || 1;

  // 1) 문제 이해 초기 숙고 시간 (0~1 비율: 최초 입력까지 시간 / 전체 시간)
  if (firstInputMs) {
    const rawSec = Math.max(0, firstInputMs - startMs);
    feats[1] = clamp(rawSec / dur);
  }

  // 7) 전략적 막다른 길 빈도: STRATEGY_RESET 이벤트 우선, 없으면 STEP_DELETED/STEP_CREATED 합으로 근사
  const strategyResetCount =
    events.filter((e) => e.eventType === 'STRATEGY_RESET').length ||
    events.filter((e) => e.eventType === 'STEP_DELETED' || e.eventType === 'STEP_CREATED').length;
  if (steps.length && strategyResetCount) {
    feats[7] = clamp(strategyResetCount / steps.length);
  }

  // 8) 힌트 요청 시점 비율 (첫 힌트가 없으면 1로 처리)
  const hintEvents = events.filter((e) => e.eventType === 'HINT_CLICK' && e.clientTimestamp);
  if (submitMs) {
    if (hintEvents.length) {
      const firstHint = Math.min(...hintEvents.map((e) => e.clientTimestamp as number));
      feats[8] = clamp((firstHint - startMs) / dur);
    } else {
      feats[8] = 1; // 힌트를 안 쓰면 최대치로 기록
    }
  }

  // 9) 힌트 유형 균형
  if (hintEvents.length) {
    const concept = hintEvents.filter((e) => e.payload?.hint_type === 'concept').length;
    const procedure = hintEvents.filter((e) => e.payload?.hint_type === 'procedure').length;
    const calc = hintEvents.filter((e) => e.payload?.hint_type === 'calc').length;
    const other = hintEvents.filter((e) => !['concept', 'procedure', 'calc'].includes(e.payload?.hint_type)).length;
    const total = concept + procedure || hintEvents.length;
    const totalAll = concept + procedure + calc + other;
    if (totalAll > 0) {
      const maxRatio = Math.max(concept, procedure, calc, other) / totalAll;
      feats[9] = clamp(maxRatio); // 선호도가 가장 높은 힌트 유형의 비율
    }
  }

  // 10) 단계 간 시간 간격 변동(편차)
  if (steps.length > 1) {
    const sorted = [...steps].sort((a, b) => a.createdAt - b.createdAt);
    const intervals = sorted.slice(1).map((s, i) => s.createdAt - sorted[i].createdAt);
    const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const variance = intervals.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / intervals.length;
    const std = Math.sqrt(variance);
    feats[10] = clamp(std / (durationMs || 1)); // 전체 시간 대비 표준편차 비율
  }

  // 11) 정답 후 반성 활동: 마지막 입력(키 입력/스텝 업데이트) 이후 제출까지 소요 비율
  if (submitMs) {
    const lastKey = events
      .filter((e) => e.eventType === 'KEY_INPUT' && e.clientTimestamp)
      .map((e) => e.clientTimestamp as number);
    const lastUpdateStep = steps.length ? Math.max(...steps.map((s) => s.updatedAt)) : startMs;
    const lastActivity = lastKey.length ? Math.max(...lastKey) : lastUpdateStep;
    feats[11] = clamp((submitMs - lastActivity) / dur);
  }

  // 12) 자기 수정 빈도 (update/delete 대비 step 수)
  const updates = events.filter((e) => e.eventType === 'STEP_UPDATED').length;
  const deletes = events.filter((e) => e.eventType === 'STEP_DELETED').length;
  // 시스템 피드백(힌트 클릭) 근처는 제외하고 계산(간단히: 전체 카운트만 사용, 추후 정교화 가능)
  if (steps.length) feats[12] = clamp((updates + deletes) / steps.length);

  // 14) 포기 전 시도/수정 횟수 = (STEP_UPDATED + STEP_DELETED + STEP_CREATED) / step_count
  if (steps.length) {
    const edits =
      events.filter((e) => ['STEP_UPDATED', 'STEP_DELETED', 'STEP_CREATED'].includes(e.eventType)).length;
    feats[14] = clamp(edits / steps.length);
  }

  // 16) 이전 지식 활용 정도 (유사 영역 과거 정답률 기반)
  if (f16Override != null) {
    feats[16] = clamp(f16Override);
  }

  // 17) 반응 속도 변화 (첫 입력 vs 전체 시간)
  if (f17Override != null) {
    feats[17] = clamp(f17Override);
  } else if (firstInputMs && submitMs) {
    feats[17] = clamp((firstInputMs - startMs) / dur);
  }

  // 18) 불필요한 입력 비율 (삭제된 스텝 비율)
  if (steps.length) {
    const deleted = steps.filter((s) => s.isDeleted).length;
    feats[18] = clamp(deleted / steps.length);
  }

  // 19) 메타인지 일치도 (예상점수 vs 실제)
  if (expectedScore != null && result) {
    const actual = result === 'correct' ? 1 : 0;
    feats[19] = clamp(Math.abs(actual - (Number(expectedScore) / 100)));
  }

  // 21) 회복 탄력성 (힌트 사용 후 정답 여부)
  if (result) {
    const recovered = ctx.hintUsed && result === 'correct';
    feats[21] = recovered ? 0 : 1; // 위험도용 raw (reverse에서 뒤집힘)
  }

  // 26) 입력 리듬 안정성 (KEY_INPUT 간격 변동)
  const keyEvents = events.filter((e) => e.eventType === 'KEY_INPUT' && e.clientTimestamp);
  if (keyEvents.length > 1) {
    const sorted = keyEvents.sort((a, b) => (a.clientTimestamp! - b.clientTimestamp!));
    const intervals = sorted.slice(1).map((e, i) => (e.clientTimestamp! - sorted[i].clientTimestamp!));
    feats[26] = variation(intervals);
  }

  // 27) 최장 비활성 구간 비율 (FOCUS_OUT/IN)
  const focusPairs = pairs(events.filter((e) => e.eventType === 'FOCUS_OUT' || e.eventType === 'FOCUS_IN'));
  if (focusPairs.length && submitMs) {
    const maxGap = Math.max(...focusPairs.map(([out, inn]) => (inn ?? submitMs) - out));
    feats[27] = clamp(maxGap / dur);
  }

  // 29) 오류/힌트 후 재입력 지연
  const triggerTimes = events
    .filter((e) => ['HINT_CLICK', 'EVAL_RESULT'].includes(e.eventType) && e.clientTimestamp)
    .map((e) => e.clientTimestamp as number);
  if (triggerTimes.length && keyEvents.length) {
    const delays: number[] = [];
    triggerTimes.forEach((t) => {
      const nextKey = keyEvents.find((e) => (e.clientTimestamp as number) > t);
      if (nextKey?.clientTimestamp) delays.push(nextKey.clientTimestamp - t);
    });
    if (delays.length) feats[29] = clamp(delays.reduce((a, b) => a + b, 0) / delays.length / dur);
  }

  // 나머지 미계산 피처는 생략 (analyzeFeatures에서 없는 값은 무시)
  return feats;
}

function clamp(v: number) {
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

function variation(values: number[]): number {
  if (!values.length) return 0;
  const mean = values.reduce((a, b) => a + b, 0) / values.length;
  if (mean === 0) return 0;
  const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
  return clamp(Math.sqrt(variance) / mean); // CV
}

async function computeF17(attempt: any, ctx: FeatureComputationContext): Promise<number | null> {
  if (!ctx.firstInputDelaySec) return null;
  // 동일 user, 동일 영역(내용/평가 중 하나라도 일치) 과거 시도 기준
  const attempts = await prisma.solveAttempt.findMany({
    where: {
      userId: attempt.userId,
      id: { not: attempt.id },
      problem: {
        OR: [
          { evaluationArea: ctx.problem?.evaluationArea || undefined },
          { contentArea: ctx.problem?.contentArea || undefined },
        ],
      },
      firstInputAt: { not: null },
      startedAt: { lt: attempt.startedAt },
    },
    orderBy: { startedAt: 'asc' },
    include: { problem: true },
  });

  const delays = attempts
    .map((a) => {
      const s = toMs(a.startedAt);
      const f = toMs(a.firstInputAt);
      return s && f && f > s ? (f - s) / 1000 : null;
    })
    .filter((v): v is number => v !== null);

  if (!delays.length) return null;
  const avgPrev = delays.reduce((a, b) => a + b, 0) / delays.length;
  return avgPrev > 0 ? clamp(avgPrev / ctx.firstInputDelaySec) : null;
}

// f16: 이전 지식 활용 정도 (유사 영역 과거 정답률)
async function computeF16(attempt: any, ctx: FeatureComputationContext): Promise<number | null> {
  const areaFilter =
    ctx.problem?.evaluationArea || ctx.problem?.contentArea
      ? {
          problem: {
            OR: [
              ctx.problem?.evaluationArea ? { evaluationArea: ctx.problem?.evaluationArea } : undefined,
              ctx.problem?.contentArea ? { contentArea: ctx.problem?.contentArea } : undefined,
            ].filter(Boolean) as any,
          },
        }
      : {};

  const past = await prisma.solveAttempt.findMany({
    where: {
      userId: attempt.userId,
      id: { not: attempt.id },
      startedAt: { lt: attempt.startedAt },
      ...areaFilter,
    },
    select: { result: true },
  });
  if (!past.length) return null;
  const correct = past.filter((p) => p.result === 'correct').length;
  return past.length ? correct / past.length : null;
}

function pairs(events: { eventType: string; clientTimestamp: number | null }[]) {
  const sorted = events.filter((e) => e.clientTimestamp).sort((a, b) => (a.clientTimestamp! - b.clientTimestamp!));
  const result: Array<[number, number | null]> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (sorted[i].eventType === 'FOCUS_OUT') {
      const out = sorted[i].clientTimestamp!;
      const nextIn = sorted.slice(i + 1).find((e) => e.eventType === 'FOCUS_IN');
      result.push([out, nextIn?.clientTimestamp ?? null]);
    }
  }
  return result;
}

function mapToProblemFeatureRow(attempt: any, f: Record<number, number>) {
  return {
    id: attempt.id, // reuse attempt id for feature row
    userId: attempt.userId,
    problemId: attempt.problemId,
    problemSetId: attempt.problemSetId,
    solveAttemptId: attempt.id,
    modelVersion: MODEL_VERSION,
    f1: f[1] ?? null, f2: f[2] ?? null, f3: f[3] ?? null, f4: f[4] ?? null, f5: f[5] ?? null,
    f6: f[6] ?? null, f7: f[7] ?? null, f8: f[8] ?? null, f9: f[9] ?? null, f10: f[10] ?? null,
    f11: f[11] ?? null, f12: f[12] ?? null, f13: f[13] ?? null, f14: f[14] ?? null, f15: f[15] ?? null,
    f16: f[16] ?? null, f17: f[17] ?? null, f18: f[18] ?? null, f19: f[19] ?? null, f20: f[20] ?? null,
    f21: f[21] ?? null, f22: f[22] ?? null, f23: f[23] ?? null, f24: f[24] ?? null, f25: f[25] ?? null,
    f26: f[26] ?? null, f27: f[27] ?? null, f28: f[28] ?? null, f29: f[29] ?? null, f30: f[30] ?? null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

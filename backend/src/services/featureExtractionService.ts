import { prisma } from '../models/prisma';
// NOTE: 현재 단계에서는 per-problem raw feature만 적재하고,
// 세트 전체(12문항) 완료 시 최종 30개 feature는 외부 분석/리포트 모듈에서 처리할 예정입니다.

interface FeatureComputationContext {
  durationMs: number;
  startMs: number;
  submitMs: number | null;
  firstInputMs: number | null;
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
    },
  });
  if (!attempt) throw new Error('Attempt not found');

  const ctx = buildContext(attempt);
  const rawFeatures = computeRawFeatures(ctx);

  await prisma.problemFeature.upsert({
    where: { solveAttemptId: attempt.id },
    create: mapToProblemFeatureRow(attempt, rawFeatures),
    update: mapToProblemFeatureRow(attempt, rawFeatures),
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
    events,
    steps,
    expectedScore: attempt.expectedScore,
    selfConfidence: attempt.selfConfidence,
    result: attempt.result,
    hintUsed,
  };
}

// Raw features (0~1). Missing ones are omitted.
function computeRawFeatures(ctx: FeatureComputationContext): Record<number, number> {
  const feats: Record<number, number> = {};
  const { durationMs, startMs, submitMs, firstInputMs, events, steps, expectedScore, selfConfidence, result } = ctx;
  const dur = durationMs || 1;

  // 1) 문제 이해 초기 숙고 시간
  if (firstInputMs) {
    feats[1] = clamp((firstInputMs - startMs) / dur);
  }

  // 8) 힌트 요청 시점 비율
  const hintEvents = events.filter((e) => e.eventType === 'HINT_CLICK' && e.clientTimestamp);
  if (hintEvents.length && submitMs) {
    const firstHint = Math.min(...hintEvents.map((e) => e.clientTimestamp as number));
    feats[8] = clamp((firstHint - startMs) / dur);
  }

  // 9) 힌트 유형 균형
  if (hintEvents.length) {
    const concept = hintEvents.filter((e) => e.payload?.hint_type === 'concept').length;
    const procedure = hintEvents.filter((e) => e.payload?.hint_type === 'procedure').length;
    const total = concept + procedure || hintEvents.length;
    const imbalance = total ? Math.abs(concept - procedure) / total : 0;
    feats[9] = clamp(imbalance);
  }

  // 10) 단계 간 시간 간격 변동
  if (steps.length > 1) {
    const sorted = [...steps].sort((a, b) => a.createdAt - b.createdAt);
    const intervals = sorted.slice(1).map((s, i) => s.createdAt - sorted[i].createdAt);
    feats[10] = variation(intervals);
  }

  // 11) 정답 후 반성 활동 (마지막 업데이트 이후 비율)
  if (submitMs) {
    const lastUpdate = steps.length ? Math.max(...steps.map((s) => s.updatedAt)) : startMs;
    feats[11] = clamp((submitMs - lastUpdate) / dur);
  }

  // 12) 자기 수정 빈도 (update/delete 대비 step 수)
  const updates = events.filter((e) => e.eventType === 'STEP_UPDATED').length;
  const deletes = events.filter((e) => e.eventType === 'STEP_DELETED').length;
  if (steps.length) feats[12] = clamp((updates + deletes) / steps.length);

  // 14) 포기 전 시도 횟수 (포기 시 step 수를 간이 스케일)
  if (result === 'gave_up') {
    feats[14] = clamp(steps.length / 10);
  }

  // 17) 반응 속도 변화 (첫 입력 vs 전체 시간)
  if (firstInputMs && submitMs) {
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

# analysis_model.py

from __future__ import annotations
from dataclasses import dataclass
from typing import List, Optional, Dict, Literal, Tuple
import statistics

#%%
# =========================
# 0. 데이터 구조 정의
# =========================

# 문항 단위 feature 25개
# (세트 단위 전용: f9, f17, f21, f25, f30 은 없음)
@dataclass
class ProblemFeature25:
    f1: float
    f2: float
    f3: float
    f4: float
    f5: float
    f6: float
    f7: float
    f8: float
    f10: float
    f11: float
    f12: float
    f13: float
    f14: float
    f15: float
    f16: float
    f18: float
    f19: float
    f20: float
    f22: float
    f23: float
    f24: float
    f26: float
    f27: float
    f28: float
    f29: float


# 힌트 사용 로그 (세트 전용 feature에 필요)
@dataclass
class HintUsage:
    problem_index: int                # 0-based index
    hint_type: Literal["concept", "procedure"]
    timestamp: float                  # 초 단위 (세트 시작 기준 상대시간 등)


# 문항 메타 정보 (풀이시간, 정답 여부, 힌트 사용 여부 등)
@dataclass
class ProblemMeta:
    problem_index: int
    solve_time: float                 # 이 문제 풀이에 걸린 전체 시간(초)
    correct: bool
    hint_used: bool


# 오류 이벤트 (패턴 ID 기준)
@dataclass
class ErrorEvent:
    problem_index: int
    pattern_id: str                   # 예: "dist_law", "ineq_sign", ...


# 세트 전용 로그 묶음
@dataclass
class RawLogForSet:
    hints: List[HintUsage]
    problems_meta: List[ProblemMeta]
    errors: List[ErrorEvent]


# 현재 세트 입력
@dataclass
class CurrentSetInput:
    user_id: str
    grade: Literal["M1", "M2", "M3"]  # 중1/2/3
    set_id: str
    problems: List[ProblemFeature25]  # 문항별 feature 25개
    raw_logs: RawLogForSet            # 세트 전용 feature 계산용 로그


# 세트 단위 feature 30개 (모두 숫자 하나로 정리)
@dataclass
class SetFeature30:
    f1: float
    f2: float
    f3: float
    f4: float
    f5: float
    f6: float
    f7: float
    f8: float
    f9: float     # 힌트 유형 편향도(0~1) 등으로 숫자화
    f10: float
    f11: float
    f12: float
    f13: float
    f14: float
    f15: float
    f16: float
    f17: float
    f18: float
    f19: float
    f20: float
    f21: float
    f22: float
    f23: float
    f24: float
    f25: float
    f26: float
    f27: float
    f28: float
    f29: float
    f30: float


# 정규화된 점수(각 feature별 0~100)
NormalizedScores = Dict[str, float]


@dataclass
class GroupScores:
    difficulty_index: float      # 난이도/부담
    concept_rep_index: float     # 개념/표현 부담
    strategy_meta_index: float   # 전략/메타인지 부담


@dataclass
class NextSetConfig:
    challenge_mode: Literal["easier", "similar", "harder"]
    challenge_comment: str
    focus_topics: List[str]
    hint_mode: Literal["guided_delayed", "normal", "encourage_use"]
    explanation_detail: Literal["low", "normal", "high"]
    reflection_enabled: bool


@dataclass
class ReportSummary:
    strengths: List[str]
    weaknesses: List[str]
    changes_vs_prev: List[str]


@dataclass
class AnalysisResult:
    set_features: SetFeature30
    normalized: NormalizedScores
    groups: GroupScores
    next_config: NextSetConfig
    report_summary: ReportSummary

#%%
# =========================
# 1. 세트 요약 feature 계산
# =========================

def safe_mean(values: List[float], default: float = 0.0) -> float:
    vals = [v for v in values if v is not None]
    if not vals:
        return default
    return float(statistics.mean(vals))


def aggregate_problem_features(problems: List[ProblemFeature25]) -> Dict[str, float]:
    """
    문항 단위 feature 25개를 세트 단위로 집계해서
    f1, f2, ..., f29 중 25개에 해당하는 값만 계산한다.
    (f9, f17, f21, f25, f30은 제외)
    """
    if not problems:
        # 비어 있으면 전부 0으로
        return {f"f{k}": 0.0 for k in [1,2,3,4,5,6,7,8,10,11,12,13,14,15,16,18,19,20,22,23,24,26,27,28,29]}

    # 단순 평균 기반 집계 (필요하면 여기서 가중 평균/비율 등으로 세분화)
    def avg(attr: str) -> float:
        return safe_mean([getattr(p, attr) for p in problems])

    set_f: Dict[str, float] = {}

    set_f["f1"]  = avg("f1")
    set_f["f2"]  = avg("f2")
    set_f["f3"]  = avg("f3")
    set_f["f4"]  = avg("f4")
    set_f["f5"]  = avg("f5")
    set_f["f6"]  = avg("f6")
    set_f["f7"]  = avg("f7")
    set_f["f8"]  = avg("f8")
    set_f["f10"] = avg("f10")
    set_f["f11"] = avg("f11")
    set_f["f12"] = avg("f12")
    set_f["f13"] = avg("f13")
    set_f["f14"] = avg("f14")
    set_f["f15"] = avg("f15")
    set_f["f16"] = avg("f16")
    set_f["f18"] = avg("f18")
    set_f["f19"] = avg("f19")
    set_f["f20"] = avg("f20")
    set_f["f22"] = avg("f22")
    set_f["f23"] = avg("f23")
    set_f["f24"] = avg("f24")
    set_f["f26"] = avg("f26")
    set_f["f27"] = avg("f27")
    set_f["f28"] = avg("f28")
    set_f["f29"] = avg("f29")

    # TODO: f3, f4, f18 등은 "단계 수 기반 비율"로 집계하고 싶다면
    # 여기서 raw(개별 단계 수)를 받아서 따로 계산하는 로직으로 변경하면 됨.

    return set_f

#%%
# =========================
# 2. 세트 전용 feature 5개 계산
# =========================

def compute_set_only_features(raw_logs: RawLogForSet) -> Dict[str, float]:
    """
    f9, f17, f21, f25, f30 계산.
    - f9: 힌트 유형 편향도 (0~1)
    - f17: 반응 속도 변화 지수 (앞/뒤 평균 시간 비교)
    - f21: 힌트 사용 이후 정답률
    - f25: 동일 미시 오류 패턴 재발 비율
    - f30: 정답률 추이 기울기
    """
    # f9: 힌트 유형 편향도
    concept_count = sum(1 for h in raw_logs.hints if h.hint_type == "concept")
    procedure_count = sum(1 for h in raw_logs.hints if h.hint_type == "procedure")
    total_hint = concept_count + procedure_count
    if total_hint == 0:
        f9 = 0.0
    else:
        # 개념 vs 절차 중 어느 한쪽으로 얼마나 치우쳤는지 (0=균형, 1=완전편향)
        f9 = abs(concept_count - procedure_count) / total_hint

    # f17: 반응 속도 변화 지수 (앞/뒤 문제 풀이시간 변화율)
    metas_sorted = sorted(raw_logs.problems_meta, key=lambda m: m.problem_index)
    n = len(metas_sorted)
    if n >= 2:
        mid = n // 2
        first_half = metas_sorted[:mid]
        second_half = metas_sorted[mid:]
        t1 = safe_mean([m.solve_time for m in first_half], default=1.0)
        t2 = safe_mean([m.solve_time for m in second_half], default=1.0)
        f17 = (t2 - t1) / max(t1, 1e-6)  # 양수=느려짐, 음수=빨라짐
    else:
        f17 = 0.0

    # f21: 힌트 사용 이후 정답률 (힌트를 사용한 문항 중 정답 비율)
    hinted_indices = {m.problem_index for m in metas_sorted if m.hint_used}
    hinted_correct = [m for m in metas_sorted if m.problem_index in hinted_indices and m.correct]
    if not hinted_indices:
        f21 = 1.0  # 힌트 안 썼으면 중립 (혹은 1.0으로 처리)
    else:
        f21 = len(hinted_correct) / len(hinted_indices)

    # f25: 동일 미시 오류 패턴 재발 비율
    # 패턴 ID별로 등장 횟수 세고, 2번 이상 나온 패턴에 속한 오류 수 / 전체 오류 수
    total_errors = len(raw_logs.errors)
    if total_errors == 0:
        f25 = 0.0
    else:
        pattern_counts: Dict[str, int] = {}
        for e in raw_logs.errors:
            pattern_counts[e.pattern_id] = pattern_counts.get(e.pattern_id, 0) + 1
        repeated_error_count = sum(
            1 for e in raw_logs.errors if pattern_counts[e.pattern_id] >= 2
        )
        f25 = repeated_error_count / total_errors

    # f30: 정답률 추이 (문항 index vs 정답(0/1)의 기울기)
    if n >= 2:
        xs = [m.problem_index + 1 for m in metas_sorted]  # 1..N
        ys = [1.0 if m.correct else 0.0 for m in metas_sorted]
        f30 = _linear_regression_slope(xs, ys)
    else:
        f30 = 0.0

    return {
        "f9": f9,
        "f17": f17,
        "f21": f21,
        "f25": f25,
        "f30": f30,
    }


def _linear_regression_slope(xs: List[float], ys: List[float]) -> float:
    """
    단순 선형 회귀 기울기.
    slope = cov(x, y) / var(x)
    """
    if len(xs) != len(ys) or len(xs) < 2:
        return 0.0
    mean_x = statistics.mean(xs)
    mean_y = statistics.mean(ys)
    var_x = sum((x - mean_x) ** 2 for x in xs)
    if var_x == 0:
        return 0.0
    cov_xy = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, ys))
    return cov_xy / var_x

#%%
# =========================
# 3. 정규화(학년 기준)
# =========================

@dataclass
class FeatureStat:
    mean: float
    std: float


GradeStats = Dict[str, Dict[str, FeatureStat]]  # grade -> {"f1": FeatureStat, ...}


def load_grade_stats(grade: str) -> Dict[str, FeatureStat]:
    """
    학년별 feature 통계(평균, 표준편차) 로딩.
    MVP에서는 일단 0,1로 초기화해 두고,
    나중에 실제 데이터로 교체하면 된다.
    """
    feature_keys = [f"f{k}" for k in range(1, 31)]
    # TODO: 실제 배포 시에는 DB나 파일에서 학년별 통계량을 로딩하도록 수정.
    return {key: FeatureStat(mean=0.0, std=1.0) for key in feature_keys}


def feature_is_strength_type(feature_key: str) -> bool:
    """
    값이 클수록 좋은 방향인 feature들.
    (예: f12 자기 수정, f21 힌트 이후 정답률 등)
    나머지는 기본적으로 '위험형'으로 취급.
    """
    strength_features = {
        "f12",  # 자기 수정
        "f16",  # 지식 전이 활용 (적정 범위 내에서)
        "f21",  # 힌트 이후 정답률
        "f30",  # 정답률 추이 (+면 좋아졌다는 뜻)
        # 필요 시 추가
    }
    return feature_key in strength_features


def normalize_features(set_f: SetFeature30, grade_stats: Dict[str, FeatureStat]) -> NormalizedScores:
    """
    각 feature를 학년 기준으로 z-score → 0~100 점수로 변환.
    기본 규칙:
    - 위험형: 점수↑ = 위험↑
    - 강점형: 점수↑ = 강점↑ (부호 반전)
    """
    scores: NormalizedScores = {}

    for k in range(1, 31):
        key = f"f{k}"
        x = getattr(set_f, key)
        stat = grade_stats.get(key, FeatureStat(mean=0.0, std=1.0))

        if stat.std < 1e-6:
            z = 0.0
        else:
            z = (x - stat.mean) / stat.std

        if feature_is_strength_type(key):
            # 강점형은 값이 클수록 좋은 방향이므로,
            # 점수↑ = 강점↑ 로 쓰되, 위험 스코어와 구분만 잘하면 됨.
            score = _clamp(50.0 + 10.0 * z, 0.0, 100.0)
        else:
            # 위험형은 값이 클수록 위험↑
            score = _clamp(50.0 + 10.0 * z, 0.0, 100.0)

        scores[key] = score

    return scores


def _clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))

#%%
# =========================
# 4. 그룹 점수 계산
# =========================

def compute_group_scores(norm: NormalizedScores) -> GroupScores:
    """
    feature별 정규화 점수 → 그룹별 요약 점수.
    간단히 평균으로 묶는다.
    """

    def m(keys: List[str]) -> float:
        vals = [norm[k] for k in keys if k in norm]
        return safe_mean(vals, default=50.0)

    # 난이도/부담 (예시: f3,f4,f6,f14,f18,(100-f21),(100-f30))
    difficulty_index = safe_mean([
        norm.get("f3", 50.0),
        norm.get("f4", 50.0),
        norm.get("f6", 50.0),
        norm.get("f14", 50.0),
        norm.get("f18", 50.0),
        100.0 - norm.get("f21", 50.0),
        100.0 - norm.get("f30", 50.0),
    ], default=50.0)

    # 개념/표현 쪽 부담
    concept_rep_index = m(["f2", "f3", "f13", "f20", "f23", "f24", "f25"])

    # 전략/메타인지 쪽 부담
    # f9는 힌트 편향도(0=균형, 100=극단)를 그대로 사용한다고 가정
    strategy_meta_index = m([
        "f1", "f8", "f9",
        "f11", "f12", "f15", "f16", "f17", "f19", "f21", "f29"
    ])

    return GroupScores(
        difficulty_index=difficulty_index,
        concept_rep_index=concept_rep_index,
        strategy_meta_index=strategy_meta_index,
    )

#%%
# =========================
# 5. 다음 세트 설정값 결정
# =========================

def decide_challenge_mode(
    difficulty_index: float
) -> Tuple[Literal["easier", "similar", "harder"], str]:
    if difficulty_index >= 70.0:
        return "easier", "이번 세트는 학년 기준으로 다소 어려운 편이었습니다."
    elif difficulty_index <= 40.0:
        return "harder", "이번 세트는 학년 기준으로 다소 쉬운 편이었습니다."
    else:
        return "similar", "이번 세트는 학년 기준으로 적절한 수준이었습니다."


FOCUS_MAPPING: Dict[str, str] = {
    "f2":  "문제 요구사항을 재구성/이해하는 연습",
    "f13": "과잉 일반화를 피하고 조건을 주의하는 연습",
    "f20": "문장을 정확히 수식으로 변환하는 연습",
    "f23": "문제 구조에서 벗어나지 않는 풀이 연습",
    "f24": "기호/변수를 일관되게 사용하는 연습",
    "f25": "반복되는 특정 오류 패턴 교정",
}


def pick_focus_topics(norm: NormalizedScores, top_k: int = 3) -> List[str]:
    candidate_keys = list(FOCUS_MAPPING.keys())
    # 점수 높은 순으로 정렬 (위험도 높은 feature를 포커스로 잡는다)
    sorted_keys = sorted(candidate_keys, key=lambda k: norm.get(k, 50.0), reverse=True)
    picked = sorted_keys[:top_k]
    return [FOCUS_MAPPING[k] for k in picked]


def decide_hint_and_reflection(
    norm: NormalizedScores
) -> Tuple[
    Literal["guided_delayed", "normal", "encourage_use"],
    Literal["low", "normal", "high"],
    bool
]:
    # 기본값
    hint_mode: Literal["guided_delayed", "normal", "encourage_use"] = "normal"
    explanation_detail: Literal["low", "normal", "high"] = "normal"
    reflection_enabled: bool = False

    # 힌트를 너무 빨리 쓰고(f8↑), 복잡 단계에서 회피 경향이 강함(f15↑)
    if norm.get("f8", 50.0) > 65.0 and norm.get("f15", 50.0) > 65.0:
        hint_mode = "guided_delayed"
        explanation_detail = "high"

    # 힌트를 거의 안 쓰면서 개념/절차 오류가 많은 경우 → 힌트 사용 권장
    if norm.get("f8", 50.0) < 35.0 and (norm.get("f3", 50.0) > 60.0 or norm.get("f4", 50.0) > 60.0):
        hint_mode = "encourage_use"

    # 메타인지 일치도 나쁨(f19↑) + 재검토 거의 없음(f11↑)
    if norm.get("f19", 50.0) > 60.0 and norm.get("f11", 50.0) > 60.0:
        reflection_enabled = True
        explanation_detail = "high"

    # 자기 수정이 잘 되는 학생이면(f12 점수가 낮다=위험 낮음 → 강점)
    if norm.get("f12", 50.0) < 40.0:
        # 너무 과한 설명은 줄여도 됨
        if explanation_detail == "high":
            explanation_detail = "normal"

    return hint_mode, explanation_detail, reflection_enabled

#%%
# =========================
# 6. 진단 요약 생성
# =========================

def build_report_summary(
    norm: NormalizedScores,
    groups: GroupScores,
    previous: Optional[AnalysisResult]
) -> ReportSummary:
    strengths: List[str] = []
    weaknesses: List[str] = []
    changes: List[str] = []

    # 강점 예시
    if norm.get("f21", 50.0) < 40.0:
        strengths.append("힌트를 활용한 이후에는 정답을 잘 찾아가고 있습니다.")
    if norm.get("f12", 50.0) < 40.0:
        strengths.append("스스로 풀이를 수정하는 자기 점검이 잘 이루어지고 있습니다.")

    # 약점 예시
    if norm.get("f20", 50.0) > 60.0:
        weaknesses.append("문장을 수식으로 옮기는 과정에서 오류가 자주 발생합니다.")
    if norm.get("f24", 50.0) > 60.0:
        weaknesses.append("기호나 변수를 일관되게 사용하는 데 어려움이 있습니다.")
    if norm.get("f25", 50.0) > 60.0:
        weaknesses.append("같은 유형의 오류가 반복되는 경향이 있습니다.")

    # 이전 세트와 비교 (직전 세션만)
    if previous is not None:
        prev_groups = previous.groups
        prev_norm = previous.normalized

        if groups.difficulty_index < prev_groups.difficulty_index - 5.0:
            changes.append("이전 세트보다 이번 세트가 조금 더 편하게 느껴졌습니다.")
        elif groups.difficulty_index > prev_groups.difficulty_index + 5.0:
            changes.append("이전 세트보다 이번 세트가 더 어렵게 느껴졌습니다.")

        if norm.get("f20", 50.0) < prev_norm.get("f20", 50.0) - 5.0:
            changes.append("문장→수식 변환에서의 오류가 줄어들고 있습니다.")
        if norm.get("f25", 50.0) < prev_norm.get("f25", 50.0) - 5.0:
            changes.append("반복되는 오류 패턴이 줄어드는 경향이 보입니다.")

    return ReportSummary(
        strengths=strengths,
        weaknesses=weaknesses,
        changes_vs_prev=changes,
    )

#%%
# =========================
# 7. 메인 엔트리 함수
# =========================

def run_analysis_model(
    current_set: CurrentSetInput,
    previous_summary: Optional[AnalysisResult] = None,
) -> AnalysisResult:
    """
    분석모델 메인 엔트리.
    - current_set: 이번 세트 로그/feature
    - previous_summary: 직전 세트의 AnalysisResult (없으면 None)
    """

    # 1) 문항 단위 → 세트 요약 (25개)
    partial_set = aggregate_problem_features(current_set.problems)

    # 2) 세트 전용 feature 5개 계산
    set_only = compute_set_only_features(current_set.raw_logs)

    # 3) SetFeature30 조립
    # 없는 값은 0.0으로 기본 세팅
    def g(name: str) -> float:
        if name in partial_set:
            return partial_set[name]
        if name in set_only:
            return set_only[name]
        return 0.0

    set_features = SetFeature30(
        f1=g("f1"),
        f2=g("f2"),
        f3=g("f3"),
        f4=g("f4"),
        f5=g("f5"),
        f6=g("f6"),
        f7=g("f7"),
        f8=g("f8"),
        f9=g("f9"),
        f10=g("f10"),
        f11=g("f11"),
        f12=g("f12"),
        f13=g("f13"),
        f14=g("f14"),
        f15=g("f15"),
        f16=g("f16"),
        f17=g("f17"),
        f18=g("f18"),
        f19=g("f19"),
        f20=g("f20"),
        f21=g("f21"),
        f22=g("f22"),
        f23=g("f23"),
        f24=g("f24"),
        f25=g("f25"),
        f26=g("f26"),
        f27=g("f27"),
        f28=g("f28"),
        f29=g("f29"),
        f30=g("f30"),
    )

    # 4) 정규화 (학년 기준)
    grade_stats = load_grade_stats(current_set.grade)
    normalized = normalize_features(set_features, grade_stats)

    # 5) 그룹 점수
    groups = compute_group_scores(normalized)

    # 6) 다음 세트 설정값
    challenge_mode, comment = decide_challenge_mode(groups.difficulty_index)
    focus_topics = pick_focus_topics(normalized)
    hint_mode, explanation_detail, reflection_enabled = decide_hint_and_reflection(normalized)

    next_config = NextSetConfig(
        challenge_mode=challenge_mode,
        challenge_comment=comment,
        focus_topics=focus_topics,
        hint_mode=hint_mode,
        explanation_detail=explanation_detail,
        reflection_enabled=reflection_enabled,
    )

    # 7) 진단 요약
    report_summary = build_report_summary(normalized, groups, previous_summary)

    # 8) 결과 묶기
    return AnalysisResult(
        set_features=set_features,
        normalized=normalized,
        groups=groups,
        next_config=next_config,
        report_summary=report_summary,
    )

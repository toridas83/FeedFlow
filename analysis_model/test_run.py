from analysis_model import (
    run_analysis_model,
    ProblemFeature25,
    RawLogForSet,
    HintUsage,
    ProblemMeta,
    ErrorEvent,
    CurrentSetInput,
)

# ---------------------------------------
# 1) 이전 세트(5문항) feature 정의
#    - 일부 문항은 오류/힌트가 많고, 정답률이 낮다는 느낌으로 구성
# ---------------------------------------
prev_problems = [
    ProblemFeature25(
        f1=5.0, f2=1.2, f3=0.4, f4=0.3, f5=0.1,
        f6=1.6, f7=0.3, f8=0.5, f10=0.1, f11=80.0,
        f12=2.5, f13=0.2, f14=1.2, f15=0.4, f16=0.3,
        f18=0.25, f19=6.0, f20=0.35, f22=0.1, f23=0.2,
        f24=0.10, f26=0.30, f27=0.10, f28=0.20, f29=3.0,
    ),
    ProblemFeature25(
        f1=4.5, f2=1.0, f3=0.5, f4=0.4, f5=0.2,
        f6=1.8, f7=0.4, f8=0.6, f10=0.2, f11=95.0,
        f12=3.0, f13=0.3, f14=1.4, f15=0.5, f16=0.4,
        f18=0.30, f19=7.0, f20=0.40, f22=0.1, f23=0.3,
        f24=0.15, f26=0.35, f27=0.12, f28=0.25, f29=3.5,
    ),
    ProblemFeature25(
        f1=4.0, f2=0.9, f3=0.35, f4=0.25, f5=0.05,
        f6=1.4, f7=0.2, f8=0.4, f10=0.1, f11=70.0,
        f12=2.0, f13=0.15, f14=1.0, f15=0.3, f16=0.2,
        f18=0.20, f19=5.5, f20=0.30, f22=0.0, f23=0.20,
        f24=0.10, f26=0.25, f27=0.08, f28=0.18, f29=2.8,
    ),
    ProblemFeature25(
        f1=6.0, f2=1.3, f3=0.6, f4=0.45, f5=0.2,
        f6=2.0, f7=0.5, f8=0.7, f10=0.3, f11=110.0,
        f12=3.5, f13=0.35, f14=1.6, f15=0.6, f16=0.5,
        f18=0.35, f19=8.0, f20=0.45, f22=0.2, f23=0.4,
        f24=0.20, f26=0.40, f27=0.15, f28=0.30, f29=4.0,
    ),
    ProblemFeature25(
        f1=5.5, f2=1.1, f3=0.45, f4=0.35, f5=0.15,
        f6=1.7, f7=0.3, f8=0.55, f10=0.2, f11=90.0,
        f12=2.8, f13=0.25, f14=1.3, f15=0.45, f16=0.35,
        f18=0.28, f19=6.5, f20=0.38, f22=0.1, f23=0.28,
        f24=0.15, f26=0.32, f27=0.11, f28=0.22, f29=3.2,
    ),
]

# ---------------------------------------
# 2) 이전 세트용 원시 로그 정의
#    - 힌트 많이 사용, 오답과 동일 오류 패턴 재발 등이 포함되도록 구성
# ---------------------------------------
prev_raw_logs = RawLogForSet(
    hints=[
        HintUsage(problem_index=0, hint_type="concept", timestamp=20.0),
        HintUsage(problem_index=1, hint_type="concept", timestamp=30.0),
        HintUsage(problem_index=1, hint_type="concept", timestamp=60.0),
        HintUsage(problem_index=3, hint_type="concept", timestamp=40.0),
        HintUsage(problem_index=3, hint_type="concept", timestamp=90.0),
    ],
    problems_meta=[
        ProblemMeta(problem_index=0, solve_time=95.0, correct=False, hint_used=True),
        ProblemMeta(problem_index=1, solve_time=110.0, correct=False, hint_used=True),
        ProblemMeta(problem_index=2, solve_time=80.0, correct=True, hint_used=False),
        ProblemMeta(problem_index=3, solve_time=120.0, correct=False, hint_used=True),
        ProblemMeta(problem_index=4, solve_time=100.0, correct=True, hint_used=True),
    ],
    errors=[
        # 0번, 1번, 3번에서 같은 패턴(inetop_sign) 반복 → 재발 비율 높은 케이스
        ErrorEvent(problem_index=0, pattern_id="ineq_sign"),
        ErrorEvent(problem_index=0, pattern_id="ineq_sign"),
        ErrorEvent(problem_index=1, pattern_id="ineq_sign"),
        ErrorEvent(problem_index=3, pattern_id="ineq_sign"),
        # 기타 오류
        ErrorEvent(problem_index=1, pattern_id="calc_miss"),
        ErrorEvent(problem_index=3, pattern_id="transcription"),
    ],
)

previous = CurrentSetInput(
    user_id="test_user",
    grade="M2",
    set_id="set_prev",
    problems=prev_problems,
    raw_logs=prev_raw_logs,
)

# ---------------------------------------
# 3) 이전 세트 분석 실행
# ---------------------------------------
prev_result = run_analysis_model(previous, previous_summary=None)

print("\n===== [ PREVIOUS SET RESULT ] =====")
print("\n--- NEXT SET CONFIG ---")
print(prev_result.next_config)

print("\n--- REPORT SUMMARY ---")
print(prev_result.report_summary)

print("\n--- SET FEATURES ---")
print(prev_result.set_features)

print("\n--- NORMALIZED FEATURES ---")
print(prev_result.normalized)

print("\n--- GROUP SCORES ---")
print(prev_result.groups)

# ---------------------------------------
# 4) 현재 세트(5문항) feature 정의
#    - 전반적으로 오류/Detour 감소, 정답률 상승 느낌으로 구성
# ---------------------------------------
curr_problems = [
    ProblemFeature25(
        f1=4.0, f2=1.0, f3=0.25, f4=0.15, f5=0.05,
        f6=1.2, f7=0.2, f8=0.35, f10=0.05, f11=70.0,
        f12=2.0, f13=0.10, f14=0.9, f15=0.25, f16=0.20,
        f18=0.18, f19=5.0, f20=0.25, f22=0.0, f23=0.15,
        f24=0.08, f26=0.22, f27=0.07, f28=0.15, f29=2.5,
    ),
    ProblemFeature25(
        f1=3.8, f2=0.9, f3=0.20, f4=0.12, f5=0.03,
        f6=1.1, f7=0.15, f8=0.30, f10=0.05, f11=65.0,
        f12=1.8, f13=0.08, f14=0.8, f15=0.22, f16=0.18,
        f18=0.16, f19=4.8, f20=0.22, f22=0.0, f23=0.12,
        f24=0.07, f26=0.20, f27=0.06, f28=0.14, f29=2.3,
    ),
    ProblemFeature25(
        f1=4.2, f2=1.0, f3=0.22, f4=0.14, f5=0.04,
        f6=1.15, f7=0.18, f8=0.32, f10=0.06, f11=72.0,
        f12=2.1, f13=0.09, f14=0.85, f15=0.24, f16=0.19,
        f18=0.17, f19=5.2, f20=0.24, f22=0.0, f23=0.14,
        f24=0.08, f26=0.21, f27=0.07, f28=0.15, f29=2.6,
    ),
    ProblemFeature25(
        f1=4.5, f2=1.05, f3=0.28, f4=0.18, f5=0.06,
        f6=1.25, f7=0.20, f8=0.38, f10=0.07, f11=75.0,
        f12=2.3, f13=0.11, f14=0.95, f15=0.26, f16=0.21,
        f18=0.19, f19=5.5, f20=0.27, f22=0.0, f23=0.16,
        f24=0.09, f26=0.23, f27=0.08, f28=0.16, f29=2.7,
    ),
    ProblemFeature25(
        f1=4.1, f2=0.95, f3=0.24, f4=0.16, f5=0.05,
        f6=1.18, f7=0.17, f8=0.34, f10=0.06, f11=68.0,
        f12=2.0, f13=0.09, f14=0.88, f15=0.24, f16=0.19,
        f18=0.18, f19=5.1, f20=0.26, f22=0.0, f23=0.15,
        f24=0.08, f26=0.22, f27=0.07, f28=0.15, f29=2.6,
    ),
]

# ---------------------------------------
# 5) 현재 세트용 원시 로그 정의
#    - 힌트 사용 감소, 정답률 상승, 같은 오류 패턴 재발 감소 느낌
# ---------------------------------------
curr_raw_logs = RawLogForSet(
    hints=[
        HintUsage(problem_index=0, hint_type="concept", timestamp=50.0),
        HintUsage(problem_index=3, hint_type="concept", timestamp=60.0),
    ],
    problems_meta=[
        ProblemMeta(problem_index=0, solve_time=80.0, correct=True, hint_used=True),
        ProblemMeta(problem_index=1, solve_time=70.0, correct=True, hint_used=False),
        ProblemMeta(problem_index=2, solve_time=75.0, correct=True, hint_used=False),
        ProblemMeta(problem_index=3, solve_time=85.0, correct=True, hint_used=True),
        ProblemMeta(problem_index=4, solve_time=78.0, correct=True, hint_used=False),
    ],
    errors=[
        # 동일 패턴 재발 횟수는 확 줄어든 상황
        ErrorEvent(problem_index=0, pattern_id="ineq_sign"),
        ErrorEvent(problem_index=3, pattern_id="calc_miss"),
    ],
)

current = CurrentSetInput(
    user_id="test_user",
    grade="M2",
    set_id="set_curr",
    problems=curr_problems,
    raw_logs=curr_raw_logs,
)

# ---------------------------------------
# 6) 이전 세트 요약을 넣어서 현재 세트 분석 실행
#    ※ previous_summary 자리는 실제 구현에서 정의한 타입에 맞게 조정
#       - 만약 '이전 세트 요약용 타입'이 따로 있다면,
#         prev_result에서 필요한 필드만 뽑아서 채워서 넘기면 됨.
# ---------------------------------------

# 가장 단순한 예시: 이전 run 결과 전체를 그대로 넘겨서 비교에 활용
curr_result = run_analysis_model(current, previous_summary=prev_result)

# 만약 previous_summary가 별도 요약 타입이라면 (예시, 주석 처리):
# from analysis_model import PreviousSetSummary
# prev_summary_for_next = PreviousSetSummary(
#     set_id=previous.set_id,
#     set_features=prev_result.set_features,
#     groups=prev_result.groups,
# )
# curr_result = run_analysis_model(current, previous_summary=prev_summary_for_next)

print("\n===== [ CURRENT SET RESULT ] =====")
print("\n--- NEXT SET CONFIG ---")
print(curr_result.next_config)

print("\n--- REPORT SUMMARY ---")
print(curr_result.report_summary)  # 여기서 changes_vs_prev가 채워졌는지 확인

print("\n--- SET FEATURES ---")
print(curr_result.set_features)

print("\n--- NORMALIZED FEATURES ---")
print(curr_result.normalized)

print("\n--- GROUP SCORES ---")
print(curr_result.groups)

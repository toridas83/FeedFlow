
import { DashboardStatus, Problem, SnapshotDetail, SnapshotSummary, SolutionSubmission, User } from '../types';

const DELAY = 600; // ms to simulate network latency

const mockUser: User = {
  email: 'student@example.com',
  name: '김학생',
  grade: '중학교 2학년',
  isAuthenticated: true,
};

// Updated mock problem with options and hints
const mockProblem: Problem = {
  id: 'prob_101',
  title: '미적분: 다항함수의 도함수 활용',
  description: '함수 f(x) = 3x^3 - 5x^2 + 2x - 7 의 도함수를 구하고, x=2 에서의 접선의 기울기를 구하시오.',
  category: '미적분',
  difficulty: 'Medium',
  options: [
    '15',
    '18',
    '22',
    '26',
    '30'
  ],
  conceptHint: '다항함수의 미분법(Power Rule)을 떠올려보세요. f(x) = ax^n 일 때, f\'(x) = anx^(n-1) 입니다.',
  procedureHint: '1. f\'(x)를 먼저 구하세요.\n2. 구한 도함수 식에 x=2를 대입하여 값을 계산하세요.',
};

const mockSnapshots: SnapshotSummary[] = [
  { id: 'snap_01', title: '진단 리포트 #3', createdAt: '2023-10-25', summary: '대수학 정확도는 향상되었으나, 문제 풀이 속도가 다소 느립니다.' },
  { id: 'snap_02', title: '진단 리포트 #2', createdAt: '2023-10-18', summary: '부호 계산에서 반복적인 실수가 감지되었습니다.' },
  { id: 'snap_03', title: '초기 역량 평가', createdAt: '2023-10-10', summary: '기초 학습 상태 확인 완료. 다항식 연산 집중 학습이 필요합니다.' },
];

const mockSnapshotDetail: SnapshotDetail = {
  ...mockSnapshots[0],
  reportContent: `
# 1. 종합 요약
학생은 미분 공식(Power Rule)에 대해 명확하게 이해하고 있으며, 이를 다항식 문제에 적용하는 데 큰 어려움이 없습니다. 다만, **제한된 시간 내에 복잡한 연산을 수행할 때 단순 산술 오류**가 발생하는 경향이 있습니다.

# 2. 세부 분석

## 강점 영역
- **개념 이해도**: 도함수의 정의와 다항함수 미분법을 정확히 숙지하고 있습니다.
- **그래프 해석**: 함수의 개형을 파악하고 접선의 기울기가 의미하는 기하학적 의미를 잘 이해하고 있습니다.
- **힌트 의존도**: 개념 힌트 없이 스스로 문제를 해결하려는 시도가 돋보입니다.

## 보완 필요 영역
- **계산 정확성**: 3단계 이상의 풀이 과정에서 음수 부호(-) 처리를 할 때 실수가 발생합니다.
- **시간 관리**: 초반 문제에 시간을 많이 사용하여 후반부 문제 풀이 시간이 부족해지는 경향이 있습니다.

# 3. AI 맞춤 학습 제언
정확도는 충분한 수준에 도달했습니다. 이제는 **'패턴 드릴'** 학습을 통해 풀이 속도를 높이는 것을 추천합니다. 특히 음수 연산이 포함된 복잡한 다항식 미분 문제를 타이머를 설정하고 푸는 연습이 유효할 것입니다.
  `.trim(),
};

const mockStatus: DashboardStatus = {
  lastStudyDate: '2023-10-25',
  lastSnapshotSummary: '미적분 기초 영역에서 꾸준한 성장이 보입니다.',
  pendingProblemSet: true,
};

// Helper for delay
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const api = {
  login: async (email: string, password: string): Promise<User> => {
    await wait(DELAY);
    if (password === 'error') throw new Error('잘못된 정보입니다.');
    return { ...mockUser, email };
  },

  register: async (email: string, password: string, name: string, grade: string, consent: boolean): Promise<User> => {
    await wait(DELAY);
    if (!consent) throw new Error('필수 동의 항목을 체크해주세요.');
    return { ...mockUser, email, name, grade };
  },

  getUserStatus: async (): Promise<DashboardStatus> => {
    await wait(DELAY);
    return mockStatus;
  },

  getCurrentProblem: async (index?: number): Promise<Problem> => {
    await wait(DELAY);
    // In a real app, 'index' would fetch different problems.
    // Here we just return the same mock problem but with slightly modified ID to simulate difference.
    return {
      ...mockProblem,
      id: `prob_10${index || 1}`,
      title: `${mockProblem.title} (문제 ${index || 1})`
    };
  },

  submitSolution: async (submission: SolutionSubmission): Promise<boolean> => {
    await wait(DELAY);
    console.log('Solution Submitted:', submission);
    return true;
  },

  // Simulates generating a new report after 12 problems
  generateReport: async (): Promise<string> => {
    await wait(2000); // Longer wait for generation simulation
    return 'snap_new_generated';
  },

  getSnapshots: async (): Promise<SnapshotSummary[]> => {
    await wait(DELAY);
    return mockSnapshots;
  },

  getSnapshotDetail: async (id: string): Promise<SnapshotDetail> => {
    await wait(DELAY);
    if (id === 'snap_new_generated') {
       return {
         id: 'snap_new_generated',
         title: '최신 학습 진단 리포트',
         createdAt: new Date().toLocaleDateString(),
         reportContent: `
# 1. 학습 진단 요약
방금 완료한 12문제에 대한 분석 결과입니다. 학생은 **개념 이해도는 상위 10%** 수준이나, **풀이 절차의 효율성은 85%** 수준으로 나타났습니다.

# 2. 강점 및 약점 분석

## 강점 (Strengths)
- **미분 개념 이해도 최상위**: 문제의 의도를 파악하는 속도가 매우 빠릅니다.
- **힌트 활용 능력**: 불필요한 힌트를 사용하지 않고, 필요할 때만 절차 힌트를 참고하여 자기주도적 학습 능력이 우수합니다.

## 약점 (Weaknesses)
- **단순 계산 실수**: 정답률은 높으나 중간 계산 과정에서 오타나 단순 연산 오류를 수정하는 빈도가 잦습니다.
- **후반부 집중력**: 9번 문제 이후부터 풀이 작성 길이가 급격히 짧아지는 경향이 있어 지구력 보완이 필요합니다.

# 3. 향후 학습 로드맵
정확도는 이미 충분합니다. 다음 단계로는 **속도와 지구력**을 키우는 훈련이 필요합니다. 하루 15분씩 타임 어택 모드로 기본 연산 문제를 푸는 것을 추천합니다.
         `.trim()
       };
    }
    return mockSnapshotDetail;
  },
};

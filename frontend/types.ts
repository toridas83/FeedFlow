
export interface User {
  id: string;
  email: string;
  name?: string;
  grade?: string;
  isAuthenticated: boolean;
}

export interface Problem {
  id: string;
  content?: string;
  title: string;
  description: string;
  category?: string;
  difficulty?: string;
  options?: string[]; // optional when using generated problems
  conceptHint?: string;
  procedureHint?: string;
  questionTopic?: string | null;
  questionTopicName?: string | null;
  solution?: string | null;
  proceduralHint?: string | null;
  learningStage?: string | null;
  evaluationArea?: string | null;
  contentArea?: string | null;
}

export interface SolutionStep {
  id: string;
  content: string;
}

export interface SolutionSubmission {
  problemId: string;
  selectedOption: number; // 0-4
  solutionSteps: string[];
  usedConceptHint: boolean;
  usedProcedureHint: boolean;
  startedAt: string;
  submittedAt: string;
}

export interface SnapshotSummary {
  id: string;
  title: string;
  createdAt: string;
  summary?: string; // Made optional as detail view uses reportContent
}

export interface SnapshotDetail extends SnapshotSummary {
  reportContent: string; // Combined markdown text
}

export interface DashboardStatus {
  lastStudyDate: string;
  lastSnapshotSummary: string;
  pendingProblemSet: boolean;
}

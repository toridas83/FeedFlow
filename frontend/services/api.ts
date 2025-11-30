const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000/api';

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = (data && data.message) || '요청 처리 중 오류가 발생했습니다.';
    throw new Error(message);
  }
  return data as T;
}

export async function login(email: string, password: string) {
  return request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export async function register(email: string, password: string, name?: string, grade?: string) {
  return request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, name, grade }),
  });
}

export async function getUserStatus(userId: string) {
  return request('/dashboard/status?userId=' + encodeURIComponent(userId));
}

export async function getSnapshots(userId: string) {
  return request('/snapshots?userId=' + encodeURIComponent(userId));
}

export async function getSnapshotDetail(userId: string, id: string) {
  return request(`/snapshots/${id}?userId=${encodeURIComponent(userId)}`);
}

// --- Attempt logging ---
export async function startAttempt(payload: {
  userId: string;
  problemId: string;
  problemSetId?: string;
  problem?: { title?: string; description?: string; answer?: string; topic?: string; difficulty?: string; grade?: string };
}) {
  return request('/attempts/start', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function saveAttemptSteps(attemptId: string, steps: Array<{ stepIndex: number; content: string; isDeleted?: boolean; createdAt?: string; updatedAt?: string }>) {
  return request(`/attempts/${attemptId}/steps`, {
    method: 'POST',
    body: JSON.stringify({ steps }),
  });
}

export async function logAttemptEvents(attemptId: string, events: Array<{ eventType: string; stepIndex?: number; payload?: any; clientTimestamp?: string }>) {
  return request(`/attempts/${attemptId}/events`, {
    method: 'POST',
    body: JSON.stringify({ events }),
  });
}

export async function submitAttempt(attemptId: string, payload: { result?: string; submittedAt?: string; expectedScore?: number; selfConfidence?: number; firstInputAt?: string }) {
  return request(`/attempts/${attemptId}/submit`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
}

export async function processAttempt(attemptId: string) {
  return request(`/analysis/attempts/${attemptId}/process`, {
    method: 'POST',
  });
}

export async function processProblemSetFeatures(problemSetId: string) {
  return request(`/feature/problem-set/${problemSetId}/process`, {
    method: 'POST',
  });
}

export async function resetSolves(userId: string, problemSetId?: string) {
  return request('/problems/reset-solves', {
    method: 'POST',
    body: JSON.stringify({ userId, problemSetId }),
  });
}

export async function ensureProblemSet(userId: string, grade: string, count = 12) {
  return request('/problems/ensure-set', {
    method: 'POST',
    body: JSON.stringify({ userId, grade, count }),
  });
}

export async function getCurrentProblemSet(userId: string) {
  return request(`/problems/current?userId=${encodeURIComponent(userId)}`);
}

export async function regenerateProblemSet(userId: string, grade: string, count = 12) {
  return request('/problems/regenerate', {
    method: 'POST',
    body: JSON.stringify({ userId, grade, count }),
  });
}

import { api as mockApi } from './mockApi';
export const api = {
  // auth → backend
  login,
  register,
  // data → backend
  getUserStatus,
  getSnapshots,
  getSnapshotDetail,
  startAttempt,
  saveAttemptSteps,
  logAttemptEvents,
  submitAttempt,
  processAttempt,
  processProblemSetFeatures,
  regenerateProblemSet,
  ensureProblemSet,
  getCurrentProblemSet,
  // legacy/mock fallbacks
  getCurrentProblem: mockApi.getCurrentProblem,
  submitSolution: mockApi.submitSolution,
  generateReport: mockApi.generateReport,
};

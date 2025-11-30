import { Request, Response } from 'express';
import { logEvents, startAttempt, submitAttempt, upsertSteps } from '../services/attemptService';

export async function start(req: Request, res: Response) {
  try {
    const { userId, problemId, problemSetId, problem } = req.body;
    if (!userId || !problemId) return res.status(400).json({ message: 'userId and problemId are required' });
    const attempt = await startAttempt({ userId, problemId, problemSetId, problem });
    return res.status(201).json(attempt);
  } catch (err) {
    console.error('startAttempt error', err);
    return res.status(500).json({ message: '시도 생성에 실패했습니다.' });
  }
}

export async function saveSteps(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { steps } = req.body;
    if (!Array.isArray(steps)) return res.status(400).json({ message: 'steps must be an array' });
    await upsertSteps(id, steps);
    return res.json({ ok: true });
  } catch (err) {
    console.error('saveSteps error', err);
    return res.status(500).json({ message: '단계 저장에 실패했습니다.' });
  }
}

export async function recordEvents(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { events } = req.body;
    if (!Array.isArray(events)) return res.status(400).json({ message: 'events must be an array' });
    await logEvents(id, events);
    return res.json({ ok: true });
  } catch (err) {
    console.error('recordEvents error', err);
    return res.status(500).json({ message: '이벤트 저장에 실패했습니다.' });
  }
}

export async function submit(req: Request, res: Response) {
  try {
    const { id } = req.params;
    const { result, submittedAt, expectedScore, selfConfidence, firstInputAt } = req.body;
    await submitAttempt(id, { result, submittedAt, expectedScore, selfConfidence, firstInputAt });
    return res.json({ ok: true });
  } catch (err) {
    console.error('submitAttempt error', err);
    return res.status(500).json({ message: '시도 완료 저장에 실패했습니다.' });
  }
}

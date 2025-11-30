import { Request, Response } from 'express';
import { computeAndStoreFeatures } from '../services/featureExtractionService';

export async function analyzeAttempt(req: Request, res: Response) {
  const { id } = req.params;
  if (!id) return res.status(400).json({ message: 'attempt id is required' });
  try {
    await computeAndStoreFeatures(id);
    return res.json({ ok: true });
  } catch (err) {
    console.error('analyzeAttempt error', err);
    return res.status(500).json({ message: '피처 계산 중 오류가 발생했습니다.' });
  }
}


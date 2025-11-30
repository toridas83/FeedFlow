import { Request, Response } from 'express';
import { getSnapshotDetail, listSnapshots } from '../services/snapshotService';

export async function fetchSnapshots(req: Request, res: Response) {
  const userId = String(req.query.userId || '');
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  const snapshots = await listSnapshots(userId);
  return res.json(snapshots);
}

export async function fetchSnapshotDetail(req: Request, res: Response) {
  const userId = String(req.query.userId || '');
  const { id } = req.params;
  if (!userId) return res.status(400).json({ message: 'userId is required' });

  const detail = await getSnapshotDetail(userId, id);
  if (!detail) return res.status(404).json({ message: '리포트를 찾을 수 없습니다.' });
  return res.json(detail);
}


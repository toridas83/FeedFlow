import { Request, Response } from 'express';
import { healthCheck } from '../services/healthService';

export async function getHealth(req: Request, res: Response) {
  const status = await healthCheck();
  res.json(status);
}

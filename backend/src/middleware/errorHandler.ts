import { Request, Response, NextFunction } from 'express';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ message: 'Route not found' });
}

export function errorHandler(err: unknown, req: Request, res: Response, next: NextFunction) { // eslint-disable-line @typescript-eslint/no-unused-vars
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  res.status(500).json({ message });
}

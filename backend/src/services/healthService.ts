import { HealthStatus } from '../types/health';

export async function healthCheck(): Promise<HealthStatus> {
  return {
    status: 'ok',
    timestamp: new Date().toISOString(),
    services: {
      api: 'up',
      db: 'not-configured',
      ai: 'not-configured',
    },
  };
}

export interface HealthStatus {
  status: 'ok' | 'degraded' | 'down';
  timestamp: string;
  services: {
    api: 'up';
    db: 'not-configured' | 'up' | 'down';
    ai: 'not-configured' | 'up' | 'down';
  };
}

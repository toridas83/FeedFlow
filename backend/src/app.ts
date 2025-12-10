import express from 'express';
import cors from 'cors';
import router from './routes';
import { errorHandler, notFoundHandler } from './middleware/errorHandler';

// Ensure server timestamps use KST (UTC+9)
process.env.TZ = 'Asia/Seoul';

const app = express();

// Simple request logger
app.use((req, _res, next) => {
  const noisy =
    req.path.startsWith('/api/attempts') ||
    req.path.startsWith('/api/analysis/attempts') ||
    req.path.startsWith('/api/feature/problem-set');
  if (!noisy) {
    console.log(`[req] ${req.method} ${req.path}`);
  }
  next();
});

app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], allowedHeaders: ['Content-Type'] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use('/api', router);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;

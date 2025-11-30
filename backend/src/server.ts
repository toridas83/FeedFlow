import app from './app';
import { config } from './config/env';
import { connectDB, ensureSchema } from './models/db';

const { port, env } = config;

async function start() {
  if (!config.databaseUrl) {
    console.error('DATABASE_URL is not set. Set it in backend/.env (or repo .env) before starting the server.');
    process.exit(1);
  }

  try {
    await ensureSchema();
    await connectDB();
    console.log('Database connected');
  } catch (err) {
    console.error('Database connection failed:', err);
    process.exit(1);
  }

  app.listen(port, () => {
    console.log(`FeedFlow backend running on port ${port} (${env})`);
  });
}

start();

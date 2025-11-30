import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';
import { prisma } from './prisma';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// Ensure Prisma commands run from backend root regardless of where server is started.
const prismaCwd = path.resolve(__dirname, '..', '..');

const shouldPushSchema = (process.env.DB_PUSH_ON_STARTUP ?? 'true').toLowerCase() === 'true';
const allowDataLoss = (process.env.DB_ACCEPT_DATA_LOSS ?? 'true').toLowerCase() === 'true';

export async function ensureSchema() {
  try {
    execSync('npx prisma generate', { stdio: 'inherit', cwd: prismaCwd });
    if (shouldPushSchema) {
      const pushCmd = allowDataLoss
        ? 'npx prisma db push --skip-generate --accept-data-loss'
        : 'npx prisma db push --skip-generate';
      execSync(pushCmd, { stdio: 'inherit', cwd: prismaCwd });
    }
  } catch (err) {
    console.error('Failed to sync Prisma schema/client to DB:', err);
    console.error(
      'If the database does not exist yet, create it manually (e.g., CREATE DATABASE feedflow CHARACTER SET utf8mb4) and rerun the server.'
    );
    throw err;
  }
}

export async function connectDB() {
  // Prisma connects lazily; this ensures the connection is valid.
  await prisma.$connect();
  // Force MySQL session timezone to KST (UTC+9) so timestamps align with Korea time.
  try {
    // 1) 가능한 경우 글로벌 타임존을 UTC+9로 설정 (권한 없으면 무시)
    try {
      await prisma.$executeRawUnsafe(`SET GLOBAL time_zone = '+09:00'`);
      console.log('[db] global time_zone set to +09:00');
    } catch (err) {
      console.warn('[db] no permission to set GLOBAL time_zone; continuing with session-only', err instanceof Error ? err.message : err);
    }
    // 2) 세션 타임존을 KST로 설정
    try {
      await prisma.$executeRawUnsafe(`SET time_zone = 'Asia/Seoul'`);
      console.log('[db] session time_zone set to Asia/Seoul');
    } catch {
      await prisma.$executeRaw`SET time_zone = '+09:00'`;
      console.log('[db] session time_zone set to +09:00 (fallback)');
    }
  } catch (err) {
    console.warn('[db] failed to set session time_zone to +09:00', err);
  }
}

export async function disconnectDB() {
  await prisma.$disconnect();
}

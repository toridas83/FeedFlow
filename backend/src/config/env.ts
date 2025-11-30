import path from 'path';
import dotenv from 'dotenv';

// Load env from backend/.env first, then fallback to repo root .env if present.
const envFiles = [
  path.resolve(process.cwd(), '.env'),
  path.resolve(process.cwd(), '..', '.env'),
];

envFiles.forEach((filePath) => {
  dotenv.config({ path: filePath, override: false });
});

const DEFAULT_PORT = 4000;

if (!process.env.DATABASE_URL) {
  console.warn('DATABASE_URL is not set. DB access will fail until you configure it.');
}

export const config = {
  port: Number(process.env.PORT) || DEFAULT_PORT,
  env: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL || '',
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
    assistants: {
      mathGrade1: process.env.OPENAI_ASSISTANT_ID_MATH_GRADE1 || '',
      mathGrade2: process.env.OPENAI_ASSISTANT_ID_MATH_GRADE2 || '',
      mathGrade3: process.env.OPENAI_ASSISTANT_ID_MATH_GRADE3 || '',
      featureExtract: process.env.OPENAI_ASSISTANT_ID_FEATURE_EXTRACT || '',
      report: process.env.OPENAI_ASSISTANT_ID_REPORT || '',
    },
  },
};

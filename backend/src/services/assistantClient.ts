import OpenAI from 'openai';
import { config } from '../config/env';

let client: OpenAI | null = null;

export function getOpenAIClient() {
  if (client) return client;
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is not set');
  }
  client = new OpenAI({ apiKey: config.openai.apiKey });
  return client;
}

export function getAssistantIdByGrade(grade: '1' | '2' | '3'): string {
  if (grade === '1') return config.openai.assistants.mathGrade1 || '';
  if (grade === '2') return config.openai.assistants.mathGrade2 || '';
  return config.openai.assistants.mathGrade3 || '';
}

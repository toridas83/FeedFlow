import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 3000,
        host: '0.0.0.0',
      },
      plugins: [react()],
      define: {
        'process.env.OPENAI_API_KEY': JSON.stringify(env.OPENAI_API_KEY),
        'process.env.OPENAI_ASSISTANT_ID_MATH_GRADE1': JSON.stringify(env.OPENAI_ASSISTANT_ID_MATH_GRADE1),
        'process.env.OPENAI_ASSISTANT_ID_MATH_GRADE2': JSON.stringify(env.OPENAI_ASSISTANT_ID_MATH_GRADE2),
        'process.env.OPENAI_ASSISTANT_ID_MATH_GRADE3': JSON.stringify(env.OPENAI_ASSISTANT_ID_MATH_GRADE3),
        'process.env.OPENAI_ASSISTANT_ID_FEATURE_EXTRACT': JSON.stringify(env.OPENAI_ASSISTANT_ID_FEATURE_EXTRACT),
        'process.env.OPENAI_ASSISTANT_ID_REPORT': JSON.stringify(env.OPENAI_ASSISTANT_ID_REPORT),
      },
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      }
    };
});

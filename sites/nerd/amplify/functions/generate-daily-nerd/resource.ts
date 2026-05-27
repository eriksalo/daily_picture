import { defineFunction, secret } from '@aws-amplify/backend';

export const generateDailyNerd = defineFunction({
  name: 'generate-daily-nerd',
  entry: './handler.ts',
  schedule: ['0 10 * * ? *'],
  timeoutSeconds: 120,
  memoryMB: 1024,
  runtime: 20,
  environment: {
    GOOGLE_API_KEY: secret('GOOGLE_API_KEY'),
  },
});

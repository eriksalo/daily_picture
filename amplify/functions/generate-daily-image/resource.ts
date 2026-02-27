import { defineFunction, secret } from '@aws-amplify/backend';

export const generateDailyImage = defineFunction({
  name: 'generate-daily-image',
  entry: './handler.ts',
  schedule: ['0 10 * * ? *'], // Daily at 10:00 UTC (3:00 AM MST)
  timeoutSeconds: 120,
  memoryMB: 1024,
  runtime: 20,
  environment: {
    GOOGLE_API_KEY: secret('GOOGLE_API_KEY'),
  },
});

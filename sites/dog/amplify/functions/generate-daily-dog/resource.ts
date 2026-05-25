import { defineFunction, secret } from '@aws-amplify/backend';

export const generateDailyDog = defineFunction({
  name: 'generate-daily-dog',
  entry: './handler.ts',
  schedule: ['0 10 * * ? *'],
  timeoutSeconds: 120,
  memoryMB: 1024,
  runtime: 20,
  environment: {
    GOOGLE_API_KEY: secret('GOOGLE_API_KEY'),
  },
});

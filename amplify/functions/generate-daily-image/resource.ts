import { defineFunction, secret } from '@aws-amplify/backend';

export const generateDailyImage = defineFunction({
  name: 'generate-daily-image',
  entry: './handler.ts',
  schedule: ['0 6 * * ? *'], // Daily at 06:00 UTC
  timeoutSeconds: 120,
  memoryMB: 1024,
  runtime: 20,
  environment: {
    OPENAI_API_KEY: secret('OPENAI_API_KEY'),
  },
  layers: {
    sharp: 'arn:aws:lambda:us-east-1:477361877445:layer:sharp:3',
  },
});

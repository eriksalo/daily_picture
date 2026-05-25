import { defineFunction } from '@aws-amplify/backend';

export const displayApi = defineFunction({
  name: 'display-api',
  entry: './handler.ts',
  timeoutSeconds: 30,
  memoryMB: 256,
  runtime: 20,
});

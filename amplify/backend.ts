import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { generateDailyImage } from './functions/generate-daily-image/resource';
import { displayApi } from './functions/display-api/resource';

const backend = defineBackend({
  auth,
  storage,
  generateDailyImage,
  displayApi,
});

// HTTP API v2 for device endpoints (public, no auth, lower latency + cost)
const apiStack = backend.createStack('api-stack');

const displayIntegration = new HttpLambdaIntegration(
  'DisplayApiIntegration',
  backend.displayApi.resources.lambda,
);

const httpApi = new HttpApi(apiStack, 'DailyPictureHttpApi', {
  apiName: 'dailyPictureApi',
  corsPreflight: {
    allowMethods: [CorsHttpMethod.GET, CorsHttpMethod.POST],
    allowOrigins: ['*'],
    allowHeaders: [
      'Content-Type',
      'X-Device-Id',
      'X-Device-Width',
      'X-Device-Height',
      'X-Device-Grayscale',
      'X-Battery-Voltage',
      'X-Firmware-Version',
      'X-Wifi-Rssi',
    ],
  },
  createDefaultStage: true,
});

// Public GET /api/display - no authorizer = unauthenticated access
httpApi.addRoutes({
  path: '/api/display',
  methods: [HttpMethod.GET],
  integration: displayIntegration,
});

// Public POST /api/generate - trigger image generation manually
const generateIntegration = new HttpLambdaIntegration(
  'GenerateApiIntegration',
  backend.generateDailyImage.resources.lambda,
);

httpApi.addRoutes({
  path: '/api/generate',
  methods: [HttpMethod.POST],
  integration: generateIntegration,
});

// Export API URL for clients
backend.addOutput({
  custom: {
    API: {
      [httpApi.httpApiName!]: {
        endpoint: httpApi.url,
        region: Stack.of(httpApi).region,
        apiName: httpApi.httpApiName,
      },
    },
  },
});

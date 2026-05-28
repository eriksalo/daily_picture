import { defineBackend } from '@aws-amplify/backend';
import { Stack } from 'aws-cdk-lib';
import {
  CorsHttpMethod,
  HttpApi,
  HttpMethod,
} from 'aws-cdk-lib/aws-apigatewayv2';
import { HttpLambdaIntegration } from 'aws-cdk-lib/aws-apigatewayv2-integrations';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { auth } from './auth/resource';
import { storage } from './storage/resource';
import { generateDailyDog } from './functions/generate-daily-dog/resource';
import { displayApi } from './functions/display-api/resource';

const backend = defineBackend({
  auth,
  storage,
  generateDailyDog,
  displayApi,
});

const apiStack = backend.createStack('api-stack');

const displayIntegration = new HttpLambdaIntegration(
  'DisplayApiIntegration',
  backend.displayApi.resources.lambda,
);

const httpApi = new HttpApi(apiStack, 'DailyDogHttpApi', {
  apiName: 'dailyDogApi',
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

httpApi.addRoutes({
  path: '/api/display',
  methods: [HttpMethod.GET],
  integration: displayIntegration,
});

const generateIntegration = new HttpLambdaIntegration(
  'GenerateApiIntegration',
  backend.generateDailyDog.resources.lambda,
);

httpApi.addRoutes({
  path: '/api/generate',
  methods: [HttpMethod.POST],
  integration: generateIntegration,
});

// Allow the generate lambda to invoke itself asynchronously. API Gateway
// caps integration time at 30 s but generation takes 30-60 s; the lambda
// re-invokes itself via InvocationType=Event and returns 202 immediately.
backend.generateDailyDog.resources.lambda.role?.addToPrincipalPolicy(
  new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['lambda:InvokeFunction'],
    resources: [backend.generateDailyDog.resources.lambda.functionArn],
  }),
);

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

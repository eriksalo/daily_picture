import { defineStorage } from '@aws-amplify/backend';
import { generateDailyDog } from '../functions/generate-daily-dog/resource';
import { displayApi } from '../functions/display-api/resource';

export const storage = defineStorage({
  name: 'dailyDogImages',
  access: (allow) => ({
    'images/*': [
      allow.resource(generateDailyDog).to(['read', 'write', 'delete']),
      allow.resource(displayApi).to(['read']),
      allow.guest.to(['read']),
    ],
    'state/*': [
      allow.resource(generateDailyDog).to(['read', 'write', 'delete']),
    ],
  }),
});

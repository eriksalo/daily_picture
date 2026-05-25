import { defineStorage } from '@aws-amplify/backend';
import { generateDailyInsect } from '../functions/generate-daily-insect/resource';
import { displayApi } from '../functions/display-api/resource';

export const storage = defineStorage({
  name: 'dailyInsectImages',
  access: (allow) => ({
    'images/*': [
      allow.resource(generateDailyInsect).to(['read', 'write', 'delete']),
      allow.resource(displayApi).to(['read']),
      allow.guest.to(['read']),
    ],
    'state/*': [
      allow.resource(generateDailyInsect).to(['read', 'write', 'delete']),
    ],
  }),
});

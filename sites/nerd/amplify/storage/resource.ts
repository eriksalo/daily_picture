import { defineStorage } from '@aws-amplify/backend';
import { generateDailyNerd } from '../functions/generate-daily-nerd/resource';
import { displayApi } from '../functions/display-api/resource';

export const storage = defineStorage({
  name: 'dailyNerdImages',
  access: (allow) => ({
    'images/*': [
      allow.resource(generateDailyNerd).to(['read', 'write', 'delete']),
      allow.resource(displayApi).to(['read']),
      allow.guest.to(['read']),
    ],
    'state/*': [
      allow.resource(generateDailyNerd).to(['read', 'write', 'delete']),
    ],
  }),
});

import { defineStorage } from '@aws-amplify/backend';
import { generateDailyImage } from '../functions/generate-daily-image/resource';
import { displayApi } from '../functions/display-api/resource';

export const storage = defineStorage({
  name: 'dailyPictureImages',
  access: (allow) => ({
    'images/*': [
      allow.resource(generateDailyImage).to(['read', 'write', 'delete']),
      allow.resource(displayApi).to(['read']),
      allow.guest.to(['read']),
    ],
  }),
});

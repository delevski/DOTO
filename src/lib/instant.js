// InstantDB configuration for React Native
// Using @instantdb/react which works with Expo
import { init, id } from '@instantdb/react';

const APP_ID = 'a2f65c00-e655-46dd-bd1c-2842dece989d';

export const db = init({ appId: APP_ID });
export { id };

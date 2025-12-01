// InstantDB configuration for React Native
import { init, id } from '@instantdb/react-native';

const APP_ID = 'a2f65c00-e655-46dd-bd1c-2842dece989d';

export const db = init({ appId: APP_ID });
export { id };


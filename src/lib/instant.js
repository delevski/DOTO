// Polyfills must be imported first
import 'react-native-get-random-values';

import { init, id } from '@instantdb/react-native';

// Same APP_ID as web app for shared data
const APP_ID = 'a2f65c00-e655-46dd-bd1c-2842dece989d';

export const db = init({ appId: APP_ID });
export { id };

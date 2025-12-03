// Real InstantDB configuration for React Native
// Connected to the same database as the web app

import 'react-native-get-random-values';
import { init, id } from '@instantdb/react-native';

// InstantDB App ID - reads from environment variable with fallback to production
const APP_ID = process.env.EXPO_PUBLIC_INSTANTDB_APP_ID || 'a2f65c00-e655-46dd-bd1c-2842dece989d';

// Initialize InstantDB
export const db = init({ appId: APP_ID });

// Export id generator for creating new records
export { id };

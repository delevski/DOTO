import { init } from '@instantdb/react';

// InstantDB App ID - can be overridden via environment variable
const APP_ID = import.meta.env.VITE_INSTANTDB_APP_ID || 'a2f65c00-e655-46dd-bd1c-2842dece989d';

export const db = init({ appId: APP_ID });


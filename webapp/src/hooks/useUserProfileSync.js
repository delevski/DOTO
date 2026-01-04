import { useEffect, useRef } from 'react';
import { db } from '../lib/instant';
import { useAuthStore } from '../store/useStore';

/**
 * Hook to sync user profile data from InstantDB to local store
 * This ensures changes made from mobile app are reflected in web app and vice versa
 */
export function useUserProfileSync() {
  const { user, updateProfile } = useAuthStore();
  const lastSyncRef = useRef(null);
  
  // Query user data from InstantDB
  // Note: We query all users and filter client-side to ensure reliability
  // This prevents issues if InstantDB's where clause doesn't work correctly
  const { data: userData, isLoading, error } = db.useQuery(user?.id ? {
    users: {}
  } : null);
  
  // Sync user data when InstantDB data is newer
  useEffect(() => {
    if (isLoading || !user || !userData) return;
    
    // Find the current user from query results (filter client-side for reliability)
    // CRITICAL FIX: Filter by user ID to ensure we only sync the current user's data
    // This prevents syncing the wrong user's profile data
    const dbUser = userData?.users?.find(u => u.id === user.id);
    if (!dbUser) {
      // User not found in query results - this is normal if user doesn't exist in DB yet
      return;
    }
    
    // Compare key fields to detect changes
    const fieldsToSync = ['name', 'avatar', 'bio', 'phone', 'location', 'updatedAt'];
    
    // Check if any field is different
    const hasChanges = fieldsToSync.some(field => {
      // Handle avatar comparison (might be different data URL formats)
      if (field === 'avatar') {
        // If both are empty/null, no change
        if (!dbUser.avatar && !user.avatar) return false;
        // If one is empty and other isn't, there's a change
        if (!dbUser.avatar || !user.avatar) return true;
        // Compare actual values (skip if both start with default pravatar URL)
        if (dbUser.avatar?.includes('pravatar.cc') && user.avatar?.includes('pravatar.cc')) return false;
        // Compare lengths as a quick check (base64 strings)
        if (dbUser.avatar?.length !== user.avatar?.length) return true;
        // For small strings, compare directly
        if ((dbUser.avatar?.length || 0) < 1000) return dbUser.avatar !== user.avatar;
        // For larger strings, compare first and last parts
        return dbUser.avatar?.slice(0, 200) !== user.avatar?.slice(0, 200) ||
               dbUser.avatar?.slice(-200) !== user.avatar?.slice(-200);
      }
      
      // Handle updatedAt comparison
      if (field === 'updatedAt') {
        return false; // We'll use this separately
      }
      
      return dbUser[field] !== user[field];
    });
    
    // Check if DB data is newer
    const dbUpdatedAt = dbUser.updatedAt || 0;
    const localUpdatedAt = user.updatedAt || 0;
    const isDbNewer = dbUpdatedAt > localUpdatedAt;
    
    // Only sync if there are changes AND db is newer (or no local updatedAt)
    if (hasChanges && (isDbNewer || !localUpdatedAt)) {
      // Prevent duplicate syncs
      const syncKey = `${dbUser.id}-${dbUpdatedAt}`;
      if (lastSyncRef.current === syncKey) return;
      lastSyncRef.current = syncKey;
      
      console.log('[ProfileSync] Syncing user data from InstantDB');
      
      // Update local store with DB data
      const updates = {};
      fieldsToSync.forEach(field => {
        if (field !== 'updatedAt' && dbUser[field] !== undefined) {
          updates[field] = dbUser[field];
        }
      });
      
      if (Object.keys(updates).length > 0) {
        updateProfile({
          ...updates,
          updatedAt: dbUpdatedAt,
        });
      }
    }
  }, [userData, isLoading, user, updateProfile]);
  
  return {
    isLoading,
    syncError: error,
  };
}

export default useUserProfileSync;


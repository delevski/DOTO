import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { db, clearInstantDBCache } from '../lib/instant';

const AUTH_KEY = '@doto_auth_user';

// Filter out large fields that shouldn't be stored in AsyncStorage
// AsyncStorage has size limits and large base64 images cause OOM errors
function filterSafeUserData(userData) {
  if (!userData) return null;
  
  const {
    passwordHash,
    posts,           // Don't store posts arrays
    comments,        // Don't store comments arrays
    photos,          // Don't store photo arrays
    likedBy,         // Don't store large arrays
    claimers,        // Don't store large arrays
    ...safeUser
  } = userData;
  
  // Also filter out any nested large objects
  const filtered = { ...safeUser };
  
  // Remove any fields that are arrays longer than 10 items (likely large data)
  Object.keys(filtered).forEach(key => {
    if (Array.isArray(filtered[key]) && filtered[key].length > 10) {
      delete filtered[key];
    }
    // Remove base64 strings (they're usually very long)
    if (typeof filtered[key] === 'string' && filtered[key].length > 10000) {
      delete filtered[key];
    }
  });
  
  return filtered;
}

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize auth state from storage
  initAuth: async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored) {
        // Check size before parsing (prevent OOM)
        if (stored.length > 10000000) { // 10MB limit
          console.warn('Stored user data too large, clearing corrupted data');
          await AsyncStorage.removeItem(AUTH_KEY);
          set({ isLoading: false });
          return;
        }
        
        const user = JSON.parse(stored);
        // Filter the loaded user data to ensure it's safe
        const safeUser = filterSafeUserData(user);
        set({ user: safeUser, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      // If it's a parsing error due to corrupted/large data, clear it
      if (error.message && (error.message.includes('OutOfMemory') || error.message.includes('JSON'))) {
        try {
          await AsyncStorage.removeItem(AUTH_KEY);
          console.log('Cleared corrupted auth data');
        } catch (e) {
          console.error('Failed to clear corrupted auth data:', e);
        }
      }
      set({ isLoading: false });
    }
  },

  // Login user
  login: async (userData) => {
    try {
      // Remove sensitive and large data before storing
      const safeUser = filterSafeUserData(userData);
      
      if (!safeUser) {
        console.error('Invalid user data');
        return false;
      }
      
      const jsonString = JSON.stringify(safeUser);
      
      // Check size before storing (AsyncStorage has ~6MB limit per key)
      if (jsonString.length > 5000000) { // 5MB limit
        console.warn('User data too large for AsyncStorage, storing minimal data');
        // Store only essential fields
        const minimalUser = {
          id: safeUser.id,
          name: safeUser.name,
          email: safeUser.email,
          avatar: safeUser.avatar,
        };
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(minimalUser));
        set({ user: safeUser, isAuthenticated: true }); // Keep full data in memory
      } else {
        await AsyncStorage.setItem(AUTH_KEY, jsonString);
        set({ user: safeUser, isAuthenticated: true });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to save auth state:', error);
      // If it's an OOM error, try storing minimal data
      if (error.message && error.message.includes('OutOfMemory')) {
        try {
          const minimalUser = {
            id: userData?.id,
            name: userData?.name,
            email: userData?.email,
            avatar: userData?.avatar,
          };
          await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(minimalUser));
          set({ user: userData, isAuthenticated: true }); // Keep full data in memory
          return true;
        } catch (e) {
          console.error('Failed to save minimal auth state:', e);
        }
      }
      return false;
    }
  },

  // Update user data
  updateUser: async (updates) => {
    try {
      const currentUser = get().user;
      if (!currentUser) return false;
      
      // Merge updates but filter out large fields
      const filteredUpdates = filterSafeUserData(updates);
      const updatedUser = { ...currentUser, ...filteredUpdates };
      
      // Filter the final user object before storing
      const safeUser = filterSafeUserData(updatedUser);
      
      const jsonString = JSON.stringify(safeUser);
      
      // Check size before storing
      if (jsonString.length > 5000000) { // 5MB limit
        console.warn('User data too large, storing minimal data');
        const minimalUser = {
          id: safeUser.id,
          name: safeUser.name,
          email: safeUser.email,
          avatar: safeUser.avatar,
        };
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(minimalUser));
        set({ user: updatedUser }); // Keep full data in memory
      } else {
        await AsyncStorage.setItem(AUTH_KEY, jsonString);
        set({ user: safeUser });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to update user:', error);
      // If OOM error, try storing minimal data
      if (error.message && error.message.includes('OutOfMemory')) {
        try {
          const currentUser = get().user;
          const minimalUser = {
            id: currentUser?.id,
            name: currentUser?.name,
            email: currentUser?.email,
            avatar: currentUser?.avatar,
          };
          await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(minimalUser));
          set({ user: { ...currentUser, ...updates } }); // Keep full data in memory
          return true;
        } catch (e) {
          console.error('Failed to save minimal user update:', e);
        }
      }
      return false;
    }
  },

  // Logout user
  logout: async () => {
    try {
      // Set state immediately to trigger UI update
      set({ user: null, isAuthenticated: false });
      
      // Clear AsyncStorage auth data
      await AsyncStorage.removeItem(AUTH_KEY);
      
      // Sign out from InstantDB
      try {
        await db.auth.signOut();
      } catch (e) {
        console.warn('InstantDB signOut failed (might not be signed in):', e.message);
      }
      
      // Clear InstantDB cache to free memory
      try {
        await clearInstantDBCache();
      } catch (e) {
        console.warn('Failed to clear InstantDB cache:', e.message);
      }
      
      return true;
    } catch (error) {
      console.error('Failed to logout:', error);
      // Still set the state to logged out even if storage fails
      set({ user: null, isAuthenticated: false });
      return false;
    }
  },
}));


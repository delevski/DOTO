import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = '@doto_auth_user';

export const useAuthStore = create((set, get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,

  // Initialize auth state from storage
  initAuth: async () => {
    try {
      const stored = await AsyncStorage.getItem(AUTH_KEY);
      if (stored) {
        const user = JSON.parse(stored);
        set({ user, isAuthenticated: true, isLoading: false });
      } else {
        set({ isLoading: false });
      }
    } catch (error) {
      console.error('Failed to load auth state:', error);
      set({ isLoading: false });
    }
  },

  // Login user
  login: async (userData) => {
    try {
      // Remove sensitive data before storing
      const { passwordHash, ...safeUser } = userData;
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(safeUser));
      set({ user: safeUser, isAuthenticated: true });
      return true;
    } catch (error) {
      console.error('Failed to save auth state:', error);
      return false;
    }
  },

  // Update user data
  updateUser: async (updates) => {
    try {
      const currentUser = get().user;
      if (!currentUser) return false;
      
      const updatedUser = { ...currentUser, ...updates };
      await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
      set({ user: updatedUser });
      return true;
    } catch (error) {
      console.error('Failed to update user:', error);
      return false;
    }
  },

  // Logout user
  logout: async () => {
    try {
      await AsyncStorage.removeItem(AUTH_KEY);
      set({ user: null, isAuthenticated: false });
      return true;
    } catch (error) {
      console.error('Failed to logout:', error);
      return false;
    }
  },
}));


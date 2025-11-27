import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => {
        // Clear session storage (verification codes, etc.)
        sessionStorage.clear();
        // Clear auth state
        set({ user: null, isAuthenticated: false });
      },
      updateProfile: (updates) => set((state) => ({
        user: state.user ? { ...state.user, ...updates } : null
      })),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export const usePostStore = create(
  persist(
    (set, get) => ({
      // This store is now only used for UI state related to posts, if any.
      // The actual post data and mutations are handled by InstantDB.
      // We might keep some temporary UI state here if needed, but for now it can be minimal.
      posts: [], // Placeholder, not used for persistence anymore
      
      // These actions are kept for compatibility but should be migrated to use db.transact directly in components
      // or rewritten here to use db.transact if we want to keep logic in the store.
      // For this refactor, we've moved the logic to the components as per the previous steps.
      createPost: (postData) => {}, 
      claimPost: (postId) => {},
      unclaimPost: (postId) => {},
      likePost: (postId) => {},
    }),
    {
      name: 'posts-ui-storage', // Renamed to avoid conflict with old data if needed, or just to signify change
      storage: createJSONStorage(() => localStorage),
      skipHydration: true, // We don't need to persist this anymore really
    }
  )
);

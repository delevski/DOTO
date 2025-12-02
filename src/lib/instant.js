// Mock InstantDB for React Native
// This provides the same API as @instantdb/react-native but stores data in memory
// Will be replaced with actual InstantDB once native module issues are resolved

import { useState, useEffect, useCallback } from 'react';

// In-memory data store
const dataStore = {
  posts: [],
  comments: [],
  users: [],
  conversations: [],
  messages: [],
};

// Event emitter for real-time updates
const listeners = new Set();

const notifyListeners = () => {
  listeners.forEach(listener => listener());
};

// Generate unique ID
export const id = () => {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15) +
         Date.now().toString(36);
};

// Transaction helper
const transact = async (...operations) => {
  operations.forEach(op => {
    if (op._type === 'update') {
      const { collection, id, data } = op;
      const index = dataStore[collection].findIndex(item => item.id === id);
      if (index >= 0) {
        dataStore[collection][index] = { ...dataStore[collection][index], ...data };
      } else {
        dataStore[collection].push({ id, ...data });
      }
    } else if (op._type === 'delete') {
      const { collection, id } = op;
      dataStore[collection] = dataStore[collection].filter(item => item.id !== id);
    }
  });
  notifyListeners();
};

// Create transaction builder
const createTx = (collection) => {
  return new Proxy({}, {
    get: (target, id) => ({
      update: (data) => ({ _type: 'update', collection, id, data }),
      delete: () => ({ _type: 'delete', collection, id }),
    })
  });
};

// Transaction proxy
const tx = {
  posts: createTx('posts'),
  comments: createTx('comments'),
  users: createTx('users'),
  conversations: createTx('conversations'),
  messages: createTx('messages'),
};

// Query hook
const useQuery = (query) => {
  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(() => {
    try {
      const result = {};
      
      Object.keys(query).forEach(collection => {
        const queryConfig = query[collection];
        let items = [...(dataStore[collection] || [])];
        
        // Handle where clause
        if (queryConfig?.$ && queryConfig.$.where) {
          const whereClause = queryConfig.$.where;
          items = items.filter(item => {
            return Object.entries(whereClause).every(([key, value]) => {
              return item[key] === value;
            });
          });
        }
        
        result[collection] = items;
      });
      
      setData(result);
      setIsLoading(false);
    } catch (err) {
      setError(err);
      setIsLoading(false);
    }
  }, [JSON.stringify(query)]);

  useEffect(() => {
    refresh();
    listeners.add(refresh);
    return () => listeners.delete(refresh);
  }, [refresh]);

  return { isLoading, error, data };
};

// Auth mock
const auth = {
  sendMagicCode: async ({ email }) => {
    console.log('Magic code sent to:', email);
    return { sent: true };
  },
  signInWithMagicCode: async ({ email, code }) => {
    const user = dataStore.users.find(u => u.email === email);
    return { user: user || null };
  },
};

// Export db object
export const db = {
  useQuery,
  transact,
  tx,
  auth,
};

// Add some sample data for demo
const initSampleData = () => {
  if (dataStore.posts.length === 0) {
    const samplePosts = [
      {
        id: 'post-1',
        author: 'Sarah Johnson',
        authorId: 'user-1',
        avatar: 'https://i.pravatar.cc/150?u=sarah',
        title: 'Need help moving furniture',
        description: 'I need help moving a couch and some boxes from my apartment to a new place nearby. Should take about 2 hours. I can provide refreshments!',
        location: 'Tel Aviv, Rothschild Blvd',
        category: 'Moving',
        tag: 'Moving',
        timestamp: Date.now() - 3600000,
        likes: 5,
        likedBy: [],
        comments: 2,
        claimers: [],
        photos: ['https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400'],
      },
      {
        id: 'post-2',
        author: 'David Cohen',
        authorId: 'user-2',
        avatar: 'https://i.pravatar.cc/150?u=david',
        title: 'Dog walking needed',
        description: 'Looking for someone to walk my golden retriever Max twice a day while I recover from surgery. He is very friendly and loves treats!',
        location: 'Herzliya, Marina',
        category: 'Pet Care',
        tag: 'Pet Care',
        timestamp: Date.now() - 7200000,
        likes: 12,
        likedBy: [],
        comments: 5,
        claimers: [
          { userId: 'user-3', userName: 'Emma Wilson', userAvatar: 'https://i.pravatar.cc/150?u=emma', claimedAt: Date.now() - 3600000 }
        ],
        photos: ['https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=400'],
      },
      {
        id: 'post-3',
        author: 'Rachel Green',
        authorId: 'user-3',
        avatar: 'https://i.pravatar.cc/150?u=rachel',
        title: 'Need to borrow a drill',
        description: 'Does anyone have a power drill I could borrow for a few hours? Need to hang some shelves in my new apartment.',
        location: 'Ramat Gan',
        category: 'Borrow',
        tag: 'Borrow',
        timestamp: Date.now() - 14400000,
        likes: 3,
        likedBy: [],
        comments: 1,
        claimers: [],
        photos: [],
      },
      {
        id: 'post-4',
        author: 'Michael Brown',
        authorId: 'user-4',
        avatar: 'https://i.pravatar.cc/150?u=michael',
        title: 'IKEA furniture assembly help',
        description: 'Just bought a wardrobe from IKEA and could use an extra pair of hands to help assemble it. Pizza and drinks on me!',
        location: 'Netanya, City Center',
        category: 'Assembly',
        tag: 'Assembly',
        timestamp: Date.now() - 28800000,
        likes: 8,
        likedBy: [],
        comments: 3,
        claimers: [],
        photos: ['https://images.unsplash.com/photo-1555041469-a586c61ea9bc?w=400'],
      },
    ];

    const sampleComments = [
      { id: 'comment-1', postId: 'post-1', authorId: 'user-2', author: 'David Cohen', avatar: 'https://i.pravatar.cc/150?u=david', text: 'I can help! What time works for you?', timestamp: Date.now() - 1800000 },
      { id: 'comment-2', postId: 'post-1', authorId: 'user-3', author: 'Rachel Green', avatar: 'https://i.pravatar.cc/150?u=rachel', text: 'Do you have a truck or need one?', timestamp: Date.now() - 1200000 },
      { id: 'comment-3', postId: 'post-2', authorId: 'user-1', author: 'Sarah Johnson', avatar: 'https://i.pravatar.cc/150?u=sarah', text: 'Max is adorable! Hope you recover soon!', timestamp: Date.now() - 5400000 },
    ];

    dataStore.posts = samplePosts;
    dataStore.comments = sampleComments;
    notifyListeners();
  }
};

// Initialize sample data
initSampleData();

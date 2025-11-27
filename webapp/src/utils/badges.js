import { 
  PenTool,
  Hand,
  Star,
  ClipboardCheck,
  Medal,
  Trophy,
  Sunrise,
  Award,
  Gem,
  Crown,
  Flame,
  Zap,
  FileText,
  Rocket
} from 'lucide-react';

export const BADGE_TYPES = {
  FIRST_POST: 'first_post',
  HELPER: 'helper',
  COMMUNITY_STAR: 'community_star',
  TASKS_10: 'tasks_10',
  TASKS_25: 'tasks_25',
  TASKS_50: 'tasks_50',
  EARLY_BIRD: 'early_bird',
  SUPER_HELPER: 'super_helper',
  PERFECT_RATING: 'perfect_rating',
  COMMUNITY_LEADER: 'community_leader',
  STREAK_7: 'streak_7',
  STREAK_30: 'streak_30',
  POSTS_10: 'posts_10',
  POSTS_25: 'posts_25',
};

export const BADGE_CATEGORIES = {
  ACHIEVEMENT: 'achievement',
  MILESTONE: 'milestone',
  SPECIAL: 'special',
};

export const badgeData = {
  [BADGE_TYPES.FIRST_POST]: {
    id: BADGE_TYPES.FIRST_POST,
    name: 'firstPost',
    description: 'firstPostDesc',
    icon: PenTool,
    category: BADGE_CATEGORIES.ACHIEVEMENT,
    gradient: 'from-yellow-400 via-orange-400 to-red-500',
    bgGradient: 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20',
    glowColor: 'rgba(251, 191, 36, 0.5)',
    rarity: 'common',
  },
  [BADGE_TYPES.HELPER]: {
    id: BADGE_TYPES.HELPER,
    name: 'helper',
    description: 'helperDesc',
    icon: Hand,
    category: BADGE_CATEGORIES.ACHIEVEMENT,
    gradient: 'from-pink-400 via-rose-500 to-red-500',
    bgGradient: 'from-pink-50 to-rose-50 dark:from-pink-900/20 dark:to-rose-900/20',
    glowColor: 'rgba(244, 63, 94, 0.5)',
    rarity: 'common',
  },
  [BADGE_TYPES.COMMUNITY_STAR]: {
    id: BADGE_TYPES.COMMUNITY_STAR,
    name: 'communityStar',
    description: 'communityStarDesc',
    icon: Star,
    category: BADGE_CATEGORIES.ACHIEVEMENT,
    gradient: 'from-yellow-300 via-yellow-400 to-orange-500',
    bgGradient: 'from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20',
    glowColor: 'rgba(251, 191, 36, 0.6)',
    rarity: 'uncommon',
  },
  [BADGE_TYPES.TASKS_10]: {
    id: BADGE_TYPES.TASKS_10,
    name: 'tasks10',
    description: 'tasks10Desc',
    icon: ClipboardCheck,
    category: BADGE_CATEGORIES.MILESTONE,
    gradient: 'from-blue-400 via-indigo-500 to-purple-500',
    bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20',
    glowColor: 'rgba(99, 102, 241, 0.5)',
    rarity: 'common',
  },
  [BADGE_TYPES.TASKS_25]: {
    id: BADGE_TYPES.TASKS_25,
    name: 'tasks25',
    description: 'tasks25Desc',
    icon: Medal,
    category: BADGE_CATEGORIES.MILESTONE,
    gradient: 'from-slate-400 via-gray-500 to-slate-600',
    bgGradient: 'from-slate-50 to-gray-50 dark:from-slate-900/20 dark:to-gray-900/20',
    glowColor: 'rgba(100, 116, 139, 0.5)',
    rarity: 'uncommon',
  },
  [BADGE_TYPES.TASKS_50]: {
    id: BADGE_TYPES.TASKS_50,
    name: 'tasks50',
    description: 'tasks50Desc',
    icon: Trophy,
    category: BADGE_CATEGORIES.MILESTONE,
    gradient: 'from-amber-400 via-orange-500 to-red-600',
    bgGradient: 'from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20',
    glowColor: 'rgba(245, 158, 11, 0.6)',
    rarity: 'rare',
  },
  [BADGE_TYPES.EARLY_BIRD]: {
    id: BADGE_TYPES.EARLY_BIRD,
    name: 'earlyBird',
    description: 'earlyBirdDesc',
    icon: Sunrise,
    category: BADGE_CATEGORIES.SPECIAL,
    gradient: 'from-orange-300 via-amber-400 to-yellow-500',
    bgGradient: 'from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20',
    glowColor: 'rgba(251, 146, 60, 0.5)',
    rarity: 'uncommon',
  },
  [BADGE_TYPES.SUPER_HELPER]: {
    id: BADGE_TYPES.SUPER_HELPER,
    name: 'superHelper',
    description: 'superHelperDesc',
    icon: Award,
    category: BADGE_CATEGORIES.ACHIEVEMENT,
    gradient: 'from-purple-400 via-pink-500 to-rose-500',
    bgGradient: 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20',
    glowColor: 'rgba(168, 85, 247, 0.6)',
    rarity: 'rare',
  },
  [BADGE_TYPES.PERFECT_RATING]: {
    id: BADGE_TYPES.PERFECT_RATING,
    name: 'perfectRating',
    description: 'perfectRatingDesc',
    icon: Gem,
    category: BADGE_CATEGORIES.SPECIAL,
    gradient: 'from-yellow-300 via-yellow-400 to-yellow-500',
    bgGradient: 'from-yellow-50 to-yellow-50 dark:from-yellow-900/20 dark:to-yellow-900/20',
    glowColor: 'rgba(234, 179, 8, 0.7)',
    rarity: 'rare',
  },
  [BADGE_TYPES.COMMUNITY_LEADER]: {
    id: BADGE_TYPES.COMMUNITY_LEADER,
    name: 'communityLeader',
    description: 'communityLeaderDesc',
    icon: Crown,
    category: BADGE_CATEGORIES.SPECIAL,
    gradient: 'from-purple-500 via-pink-500 to-rose-500',
    bgGradient: 'from-purple-50 to-rose-50 dark:from-purple-900/20 dark:to-rose-900/20',
    glowColor: 'rgba(168, 85, 247, 0.7)',
    rarity: 'epic',
  },
  [BADGE_TYPES.STREAK_7]: {
    id: BADGE_TYPES.STREAK_7,
    name: 'streak7',
    description: 'streak7Desc',
    icon: Flame,
    category: BADGE_CATEGORIES.MILESTONE,
    gradient: 'from-red-400 via-orange-500 to-yellow-500',
    bgGradient: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
    glowColor: 'rgba(239, 68, 68, 0.6)',
    rarity: 'uncommon',
  },
  [BADGE_TYPES.STREAK_30]: {
    id: BADGE_TYPES.STREAK_30,
    name: 'streak30',
    description: 'streak30Desc',
    icon: Zap,
    category: BADGE_CATEGORIES.MILESTONE,
    gradient: 'from-red-500 via-orange-600 to-red-600',
    bgGradient: 'from-red-50 to-orange-50 dark:from-red-900/20 dark:to-orange-900/20',
    glowColor: 'rgba(220, 38, 38, 0.7)',
    rarity: 'rare',
  },
  [BADGE_TYPES.POSTS_10]: {
    id: BADGE_TYPES.POSTS_10,
    name: 'posts10',
    description: 'posts10Desc',
    icon: FileText,
    category: BADGE_CATEGORIES.MILESTONE,
    gradient: 'from-green-400 via-emerald-500 to-teal-500',
    bgGradient: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20',
    glowColor: 'rgba(34, 197, 94, 0.5)',
    rarity: 'common',
  },
  [BADGE_TYPES.POSTS_25]: {
    id: BADGE_TYPES.POSTS_25,
    name: 'posts25',
    description: 'posts25Desc',
    icon: Rocket,
    category: BADGE_CATEGORIES.MILESTONE,
    gradient: 'from-cyan-400 via-blue-500 to-indigo-500',
    bgGradient: 'from-cyan-50 to-blue-50 dark:from-cyan-900/20 dark:to-blue-900/20',
    glowColor: 'rgba(59, 130, 246, 0.6)',
    rarity: 'uncommon',
  },
};

// Helper function to get all badges
export const getAllBadges = () => Object.values(badgeData);

// Helper function to get badge by ID
export const getBadgeById = (id) => badgeData[id];

// Helper function to get badges by category
export const getBadgesByCategory = (category) => 
  Object.values(badgeData).filter(badge => badge.category === category);

// Mock function to get user's earned badges (replace with actual data from backend)
export const getUserEarnedBadges = (user) => {
  // This is a mock - replace with actual logic based on user stats
  const earnedBadges = [];
  
  // Example logic (replace with real data)
  if (user?.postsCreated >= 1) {
    earnedBadges.push(BADGE_TYPES.FIRST_POST);
  }
  if (user?.tasksCompleted >= 10) {
    earnedBadges.push(BADGE_TYPES.TASKS_10);
  }
  if (user?.tasksCompleted >= 25) {
    earnedBadges.push(BADGE_TYPES.TASKS_25);
  }
  if (user?.tasksCompleted >= 50) {
    earnedBadges.push(BADGE_TYPES.TASKS_50);
  }
  if (user?.postsCreated >= 10) {
    earnedBadges.push(BADGE_TYPES.POSTS_10);
  }
  if (user?.postsCreated >= 25) {
    earnedBadges.push(BADGE_TYPES.POSTS_25);
  }
  if (user?.rating >= 4.5) {
    earnedBadges.push(BADGE_TYPES.COMMUNITY_STAR);
  }
  if (user?.rating === 5.0) {
    earnedBadges.push(BADGE_TYPES.PERFECT_RATING);
  }
  if (user?.tasksCompleted >= 5) {
    earnedBadges.push(BADGE_TYPES.HELPER);
  }
  if (user?.tasksCompleted >= 20) {
    earnedBadges.push(BADGE_TYPES.SUPER_HELPER);
  }
  
  return earnedBadges;
};


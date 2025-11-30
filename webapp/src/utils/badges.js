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

/**
 * Calculate user's earned badges based on their statistics
 * @param {Object} stats - User statistics object (from useUserStats hook)
 * @param {number} stats.postsCreated - Number of posts the user has created
 * @param {number} stats.tasksCompleted - Number of tasks the user has completed as a helper
 * @param {number} stats.averageRating - User's average rating received (0-5)
 * @param {number} stats.firstClaimCount - Number of times user was first to claim a post
 * @param {number} stats.currentStreak - Current activity streak in days
 * @param {number} stats.longestStreak - Longest activity streak ever achieved
 * @param {number} stats.totalEngagement - Total engagement (posts + tasks + comments)
 * @returns {string[]} Array of earned badge IDs
 */
export const getUserEarnedBadges = (stats) => {
  const earnedBadges = [];
  
  if (!stats) return earnedBadges;

  // Posts milestones
  if (stats.postsCreated >= 1) {
    earnedBadges.push(BADGE_TYPES.FIRST_POST);
  }
  if (stats.postsCreated >= 10) {
    earnedBadges.push(BADGE_TYPES.POSTS_10);
  }
  if (stats.postsCreated >= 25) {
    earnedBadges.push(BADGE_TYPES.POSTS_25);
  }

  // Tasks completed milestones
  if (stats.tasksCompleted >= 5) {
    earnedBadges.push(BADGE_TYPES.HELPER);
  }
  if (stats.tasksCompleted >= 10) {
    earnedBadges.push(BADGE_TYPES.TASKS_10);
  }
  if (stats.tasksCompleted >= 20) {
    earnedBadges.push(BADGE_TYPES.SUPER_HELPER);
  }
  if (stats.tasksCompleted >= 25) {
    earnedBadges.push(BADGE_TYPES.TASKS_25);
  }
  if (stats.tasksCompleted >= 50) {
    earnedBadges.push(BADGE_TYPES.TASKS_50);
  }

  // Rating-based badges
  if (stats.averageRating >= 4.5 && stats.totalRatingsReceived >= 3) {
    earnedBadges.push(BADGE_TYPES.COMMUNITY_STAR);
  }
  if (stats.averageRating === 5.0 && stats.totalRatingsReceived >= 5) {
    earnedBadges.push(BADGE_TYPES.PERFECT_RATING);
  }

  // Early Bird: First person to claim a post
  if (stats.firstClaimCount >= 1) {
    earnedBadges.push(BADGE_TYPES.EARLY_BIRD);
  }

  // Streak badges (check both current and longest streak)
  if (stats.currentStreak >= 7 || stats.longestStreak >= 7) {
    earnedBadges.push(BADGE_TYPES.STREAK_7);
  }
  if (stats.currentStreak >= 30 || stats.longestStreak >= 30) {
    earnedBadges.push(BADGE_TYPES.STREAK_30);
  }

  // Community Leader: High total engagement (100+ posts + tasks + comments)
  if (stats.totalEngagement >= 100) {
    earnedBadges.push(BADGE_TYPES.COMMUNITY_LEADER);
  }
  
  return earnedBadges;
};


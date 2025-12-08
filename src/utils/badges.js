// Badge definitions matching web app (using Ionicons equivalents)
// Maps to webapp/src/utils/badges.js BADGE_TYPES
// Uses translation keys for names and descriptions (matching web app pattern)

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

// Badge definitions with Ionicons (matching web app style)
// Icons mapped to closest Ionicons equivalents of Lucide icons used in web app
// Names and descriptions use translation keys (badges.xxx)
const badges = [
  {
    id: BADGE_TYPES.FIRST_POST,
    name: 'badges.firstPost',           // Translation key (web: 'firstPost')
    description: 'badges.firstPostDesc', // Translation key (web: 'firstPostDesc')
    icon: 'pencil',                      // Ionicons - matches Lucide PenTool
    color: '#F59E0B',
    gradient: ['#FBBF24', '#F97316', '#DC2626'],
    category: BADGE_CATEGORIES.ACHIEVEMENT,
    glowColor: 'rgba(251, 191, 36, 0.5)',
    rarity: 'common',
  },
  {
    id: BADGE_TYPES.HELPER,
    name: 'badges.helper',
    description: 'badges.helperDesc',
    icon: 'hand-left',                   // Ionicons - matches Lucide Hand
    color: '#F43F5E',
    gradient: ['#FB7185', '#F43F5E', '#DC2626'],
    category: BADGE_CATEGORIES.ACHIEVEMENT,
    glowColor: 'rgba(244, 63, 94, 0.5)',
    rarity: 'common',
  },
  {
    id: BADGE_TYPES.COMMUNITY_STAR,
    name: 'badges.communityStar',
    description: 'badges.communityStarDesc',
    icon: 'star',                        // Ionicons - matches Lucide Star
    color: '#FBBF24',
    gradient: ['#FDE047', '#FBBF24', '#F59E0B'],
    category: BADGE_CATEGORIES.ACHIEVEMENT,
    glowColor: 'rgba(251, 191, 36, 0.6)',
    rarity: 'uncommon',
  },
  {
    id: BADGE_TYPES.TASKS_10,
    name: 'badges.tasks10',
    description: 'badges.tasks10Desc',
    icon: 'checkbox',                    // Ionicons - matches Lucide ClipboardCheck
    color: '#6366F1',
    gradient: ['#818CF8', '#6366F1', '#A855F7'],
    category: BADGE_CATEGORIES.MILESTONE,
    glowColor: 'rgba(99, 102, 241, 0.5)',
    rarity: 'common',
  },
  {
    id: BADGE_TYPES.TASKS_25,
    name: 'badges.tasks25',
    description: 'badges.tasks25Desc',
    icon: 'medal',                       // Ionicons - matches Lucide Medal
    color: '#64748B',
    gradient: ['#94A3B8', '#64748B', '#475569'],
    category: BADGE_CATEGORIES.MILESTONE,
    glowColor: 'rgba(100, 116, 139, 0.5)',
    rarity: 'uncommon',
  },
  {
    id: BADGE_TYPES.TASKS_50,
    name: 'badges.tasks50',
    description: 'badges.tasks50Desc',
    icon: 'trophy',                      // Ionicons - matches Lucide Trophy
    color: '#F59E0B',
    gradient: ['#FBBF24', '#F97316', '#DC2626'],
    category: BADGE_CATEGORIES.MILESTONE,
    glowColor: 'rgba(245, 158, 11, 0.6)',
    rarity: 'rare',
  },
  {
    id: BADGE_TYPES.EARLY_BIRD,
    name: 'badges.earlyBird',
    description: 'badges.earlyBirdDesc',
    icon: 'sunny',                       // Ionicons - matches Lucide Sunrise
    color: '#FB923C',
    gradient: ['#FDBA74', '#FB923C', '#F97316'],
    category: BADGE_CATEGORIES.SPECIAL,
    glowColor: 'rgba(251, 146, 60, 0.5)',
    rarity: 'uncommon',
  },
  {
    id: BADGE_TYPES.SUPER_HELPER,
    name: 'badges.superHelper',
    description: 'badges.superHelperDesc',
    icon: 'ribbon',                      // Ionicons - matches Lucide Award
    color: '#A855F7',
    gradient: ['#C084FC', '#A855F7', '#F43F5E'],
    category: BADGE_CATEGORIES.ACHIEVEMENT,
    glowColor: 'rgba(168, 85, 247, 0.6)',
    rarity: 'rare',
  },
  {
    id: BADGE_TYPES.PERFECT_RATING,
    name: 'badges.perfectRating',
    description: 'badges.perfectRatingDesc',
    icon: 'diamond',                     // Ionicons - matches Lucide Gem
    color: '#EAB308',
    gradient: ['#FDE047', '#EAB308', '#CA8A04'],
    category: BADGE_CATEGORIES.SPECIAL,
    glowColor: 'rgba(234, 179, 8, 0.7)',
    rarity: 'rare',
  },
  {
    id: BADGE_TYPES.COMMUNITY_LEADER,
    name: 'badges.communityLeader',
    description: 'badges.communityLeaderDesc',
    icon: 'shield-checkmark',            // Ionicons - closest to Lucide Crown (leadership)
    color: '#A855F7',
    gradient: ['#C084FC', '#A855F7', '#F43F5E'],
    category: BADGE_CATEGORIES.SPECIAL,
    glowColor: 'rgba(168, 85, 247, 0.7)',
    rarity: 'epic',
  },
  {
    id: BADGE_TYPES.STREAK_7,
    name: 'badges.streak7',
    description: 'badges.streak7Desc',
    icon: 'flame',                       // Ionicons - matches Lucide Flame
    color: '#EF4444',
    gradient: ['#F87171', '#EF4444', '#DC2626'],
    category: BADGE_CATEGORIES.MILESTONE,
    glowColor: 'rgba(239, 68, 68, 0.6)',
    rarity: 'uncommon',
  },
  {
    id: BADGE_TYPES.STREAK_30,
    name: 'badges.streak30',
    description: 'badges.streak30Desc',
    icon: 'flash',                       // Ionicons - matches Lucide Zap
    color: '#F97316',
    gradient: ['#FB923C', '#F97316', '#EA580C'],
    category: BADGE_CATEGORIES.MILESTONE,
    glowColor: 'rgba(220, 38, 38, 0.7)',
    rarity: 'rare',
  },
  {
    id: BADGE_TYPES.POSTS_10,
    name: 'badges.posts10',
    description: 'badges.posts10Desc',
    icon: 'document-text',               // Ionicons - matches Lucide FileText
    color: '#22C55E',
    gradient: ['#4ADE80', '#22C55E', '#14B8A6'],
    category: BADGE_CATEGORIES.MILESTONE,
    glowColor: 'rgba(34, 197, 94, 0.5)',
    rarity: 'common',
  },
  {
    id: BADGE_TYPES.POSTS_25,
    name: 'badges.posts25',
    description: 'badges.posts25Desc',
    icon: 'rocket',                      // Ionicons - matches Lucide Rocket
    color: '#3B82F6',
    gradient: ['#60A5FA', '#3B82F6', '#6366F1'],
    category: BADGE_CATEGORIES.MILESTONE,
    glowColor: 'rgba(59, 130, 246, 0.6)',
    rarity: 'uncommon',
  },
];

// Get all badges
export const getAllBadges = () => badges;

// Get badge by ID
export const getBadgeById = (badgeId) => {
  return badges.find((badge) => badge.id === badgeId);
};

// Get badges by category
export const getBadgesByCategory = (category) =>
  badges.filter(badge => badge.category === category);

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
 * @param {number} stats.totalRatingsReceived - Total number of ratings received
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
  if (stats.averageRating >= 4.5 && (stats.totalRatingsReceived || 0) >= 3) {
    earnedBadges.push(BADGE_TYPES.COMMUNITY_STAR);
  }
  if (stats.averageRating === 5.0 && (stats.totalRatingsReceived || 0) >= 5) {
    earnedBadges.push(BADGE_TYPES.PERFECT_RATING);
  }

  // Early Bird: First person to claim a post
  if ((stats.firstClaimCount || 0) >= 1) {
    earnedBadges.push(BADGE_TYPES.EARLY_BIRD);
  }

  // Streak badges (check both current and longest streak)
  if ((stats.currentStreak || 0) >= 7 || (stats.longestStreak || 0) >= 7) {
    earnedBadges.push(BADGE_TYPES.STREAK_7);
  }
  if ((stats.currentStreak || 0) >= 30 || (stats.longestStreak || 0) >= 30) {
    earnedBadges.push(BADGE_TYPES.STREAK_30);
  }

  // Community Leader: High total engagement (100+ posts + tasks + comments)
  if ((stats.totalEngagement || 0) >= 100) {
    earnedBadges.push(BADGE_TYPES.COMMUNITY_LEADER);
  }

  return earnedBadges;
};

// Calculate points from stats
export const calculatePoints = (stats) => {
  let points = 0;

  // Points for posts
  points += (stats.postsCreated || 0) * 10;

  // Points for completed tasks
  points += (stats.tasksCompleted || 0) * 50;

  // Points for streaks
  points += (stats.currentStreak || 0) * 5;

  // Points for badges
  const earnedBadges = getUserEarnedBadges(stats);
  points += earnedBadges.length * 100;

  return points;
};

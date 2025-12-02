// Badge definitions
const badges = [
  {
    id: 'first_post',
    name: 'First Post',
    description: 'Created your first post',
    icon: '📝',
    color: '#3B82F6',
    requirement: (stats) => stats.postsCreated >= 1,
  },
  {
    id: 'helper',
    name: 'Helper',
    description: 'Completed your first task',
    icon: '🤝',
    color: '#10B981',
    requirement: (stats) => stats.tasksCompleted >= 1,
  },
  {
    id: 'super_helper',
    name: 'Super Helper',
    description: 'Completed 10 tasks',
    icon: '⭐',
    color: '#F59E0B',
    requirement: (stats) => stats.tasksCompleted >= 10,
  },
  {
    id: 'community_star',
    name: 'Community Star',
    description: 'Completed 50 tasks',
    icon: '🌟',
    color: '#8B5CF6',
    requirement: (stats) => stats.tasksCompleted >= 50,
  },
  {
    id: 'streak_3',
    name: '3 Day Streak',
    description: 'Active for 3 days in a row',
    icon: '🔥',
    color: '#EF4444',
    requirement: (stats) => stats.currentStreak >= 3,
  },
  {
    id: 'streak_7',
    name: 'Week Warrior',
    description: 'Active for 7 days in a row',
    icon: '💪',
    color: '#EC4899',
    requirement: (stats) => stats.currentStreak >= 7,
  },
  {
    id: 'streak_30',
    name: 'Monthly Master',
    description: 'Active for 30 days in a row',
    icon: '🏆',
    color: '#F97316',
    requirement: (stats) => stats.currentStreak >= 30,
  },
  {
    id: 'top_rated',
    name: 'Top Rated',
    description: 'Achieved 4.5+ average rating',
    icon: '⭐',
    color: '#FBBF24',
    requirement: (stats) => stats.averageRating >= 4.5,
  },
  {
    id: 'prolific_poster',
    name: 'Prolific Poster',
    description: 'Created 10 posts',
    icon: '📚',
    color: '#6366F1',
    requirement: (stats) => stats.postsCreated >= 10,
  },
  {
    id: 'social_butterfly',
    name: 'Social Butterfly',
    description: 'Started 5 conversations',
    icon: '🦋',
    color: '#14B8A6',
    requirement: (stats) => stats.conversationsStarted >= 5,
  },
  {
    id: 'early_bird',
    name: 'Early Bird',
    description: 'One of the first 100 users',
    icon: '🐦',
    color: '#0EA5E9',
    requirement: (stats) => stats.isEarlyAdopter,
  },
  {
    id: 'verified',
    name: 'Verified',
    description: 'Verified email address',
    icon: '✓',
    color: '#22C55E',
    requirement: (stats) => stats.isVerified,
  },
];

// Get all badges
export const getAllBadges = () => badges;

// Get user's earned badges
export const getUserEarnedBadges = (stats) => {
  return badges
    .filter((badge) => badge.requirement(stats))
    .map((badge) => badge.id);
};

// Get badge by ID
export const getBadgeById = (badgeId) => {
  return badges.find((badge) => badge.id === badgeId);
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


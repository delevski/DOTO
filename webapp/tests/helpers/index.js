/**
 * Test Helpers Index
 * 
 * Central export point for all test helper functions
 * Import helpers using: import { createUser, createPost, ... } from './helpers/index.js'
 */

// Authentication helpers
export {
  generateTestEmail,
  generateUserData,
  mockAuthentication,
  handleVerificationCode,
  createUser,
  loginUser,
  getAuthenticatedUser,
  logoutUser,
  switchToUser,
  isAuthenticated
} from './auth-helpers.js';

// Post helpers
export {
  createTestImage,
  getTestImagePath,
  generatePostData,
  createPost,
  openPost,
  verifyPostInFeed,
  getPostsFromFeed,
  clickPostInFeed,
  getPostDetails,
  likePost
} from './post-helpers.js';

// Claim helpers
export {
  claimPost,
  approveClaimer,
  getClaimers,
  verifyUserClaimed,
  getClaimStatus,
  cancelClaim,
  openClaimerSelectionModal,
  getClaimerStats
} from './claim-helpers.js';

// Comment helpers
export {
  addComment,
  verifyComment,
  getComments,
  getCommentCount,
  deleteComment,
  replyToComment,
  likeComment,
  generateCommentText
} from './comment-helpers.js';

// Message helpers
export {
  goToMessages,
  openConversation,
  openConversationWithUser,
  sendMessage,
  sendMessageToConversation,
  initiateConversationFromPost,
  verifyMessage,
  getMessages,
  getConversations,
  getUnreadCount,
  markConversationAsRead,
  generateConversationId,
  generateMessageText
} from './message-helpers.js';

// Notification helpers
export {
  goToNotifications,
  getUnreadNotificationCount,
  getNotifications,
  hasNotification,
  hasNotificationType,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clickNotification,
  deleteNotification,
  waitForNotification,
  clearAllNotifications,
  isNotificationBadgeVisible,
  getNotificationDetails
} from './notification-helpers.js';

// Profile helpers
export {
  goToProfile,
  goToEditProfile,
  getProfileData,
  editProfile,
  saveProfile,
  updateProfile,
  verifyProfileChanges,
  changeAvatar,
  goToSettings,
  toggleDarkMode,
  changeLanguage,
  getUserStats,
  logout,
  generateProfileUpdate
} from './profile-helpers.js';


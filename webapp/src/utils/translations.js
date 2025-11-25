import { useSettingsStore } from '../store/settingsStore';

// Translation files
export const translations = {
  en: {
    // Navigation
    feed: 'Feed',
    map: 'Map',
    messages: 'Messages',
    profile: 'Profile',
    settings: 'Settings',
    createPost: 'Create Post',
    
    // Settings
    account: 'Account',
    editProfile: 'Edit Profile',
    editProfileDesc: 'Update your personal information',
    privacySecurity: 'Privacy & Security',
    privacySecurityDesc: 'Manage your privacy settings',
    notifications: 'Notifications',
    notificationsDesc: 'Control notification preferences',
    appPreferences: 'App Preferences',
    language: 'Language',
    languageDesc: 'English (US)',
    darkMode: 'Dark Mode',
    darkModeDesc: 'Switch to dark theme',
    dangerZone: 'Danger Zone',
    deleteAccount: 'Delete Account',
    deleteAccountDesc: 'Permanently delete your account and data',
    
    // Profile
    name: 'Name',
    email: 'Email',
    phone: 'Phone',
    bio: 'Bio',
    location: 'Location',
    save: 'Save',
    cancel: 'Cancel',
    
    // Common
    back: 'Back',
    search: 'Search',
    topWeekly: 'Top Weekly',
    nearby: 'Nearby',
    friends: 'Friends',
    following: 'Following',
    myPosts: 'My Posts',
    claimTask: 'Claim Task',
    claimed: 'Claimed',
    claimedByYou: 'Claimed by You',
    alreadyClaimed: 'Already Claimed',
    yourPost: 'Your Post',
    
    // Post
    newPost: 'New Post',
    description: 'Description',
    category: 'Category',
    when: 'When do you need help?',
    addPhotos: 'Add Photos (Optional)',
    publishPost: 'Publish Post',
    
    // Language names
    english: 'English',
    hebrew: 'עברית',
  },
  he: {
    // Navigation
    feed: 'פיד',
    map: 'מפה',
    messages: 'הודעות',
    profile: 'פרופיל',
    settings: 'הגדרות',
    createPost: 'צור פוסט',
    
    // Settings
    account: 'חשבון',
    editProfile: 'ערוך פרופיל',
    editProfileDesc: 'עדכן את המידע האישי שלך',
    privacySecurity: 'פרטיות ואבטחה',
    privacySecurityDesc: 'נהל את הגדרות הפרטיות שלך',
    notifications: 'התראות',
    notificationsDesc: 'בקרת העדפות התראות',
    appPreferences: 'העדפות אפליקציה',
    language: 'שפה',
    languageDesc: 'עברית',
    darkMode: 'מצב כהה',
    darkModeDesc: 'החלף לערכת נושא כהה',
    dangerZone: 'אזור סכנה',
    deleteAccount: 'מחק חשבון',
    deleteAccountDesc: 'מחק לצמיתות את החשבון והנתונים שלך',
    
    // Profile
    name: 'שם',
    email: 'אימייל',
    phone: 'טלפון',
    bio: 'אודות',
    location: 'מיקום',
    save: 'שמור',
    cancel: 'ביטול',
    
    // Common
    back: 'חזור',
    search: 'חיפוש',
    topWeekly: 'השבוע המוביל',
    nearby: 'קרוב',
    friends: 'חברים',
    following: 'עוקבים',
    myPosts: 'הפוסטים שלי',
    claimTask: 'תביע משימה',
    claimed: 'נטען',
    claimedByYou: 'נטען על ידיך',
    alreadyClaimed: 'כבר נטען',
    yourPost: 'הפוסט שלך',
    
    // Post
    newPost: 'פוסט חדש',
    description: 'תיאור',
    category: 'קטגוריה',
    when: 'מתי אתה צריך עזרה?',
    addPhotos: 'הוסף תמונות (אופציונלי)',
    publishPost: 'פרסם פוסט',
    
    // Language names
    english: 'English',
    hebrew: 'עברית',
  }
};

export const useTranslation = () => {
  const language = useSettingsStore((state) => state.language);
  const t = (key) => translations[language]?.[key] || translations.en[key] || key;
  return t;
};


// অ্যাপের সব constant value এখানে থাকবে
// যাতে frontend এবং backend একই value ব্যবহার করে

// ============================================
// অ্যাপ সম্পর্কিত সাধারণ তথ্য
// ============================================
export const APP_NAME = 'Study Buddy';
export const APP_NAME_BN = 'স্টাডি বাডি';
export const APP_MASCOT = '🐱'; // Cute Cat — আমাদের প্রিয় মাসকট

// ============================================
// ব্যবহারকারীর ভূমিকা (Role)
// ============================================
export const USER_ROLES = {
  STUDENT: 'STUDENT',
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

// ============================================
// ক্লাস লেভেল — মাধ্যমিক পর্যায় (৬ষ্ঠ থেকে ১০ম)
// ============================================
export const CLASS_LEVELS = [6, 7, 8, 9, 10] as const;
export type ClassLevel = (typeof CLASS_LEVELS)[number];

// ============================================
// পড়াশোনার মুড — শিক্ষার্থী কেমন অনুভব করছে
// ============================================
export const STUDY_MOODS = {
  HAPPY: 'HAPPY',       // 😊
  NEUTRAL: 'NEUTRAL',   // 😐
  SAD: 'SAD',           // 😔
} as const;

export type StudyMood = (typeof STUDY_MOODS)[keyof typeof STUDY_MOODS];

export const MOOD_EMOJI: Record<StudyMood, string> = {
  HAPPY: '😊',
  NEUTRAL: '😐',
  SAD: '😔',
};

export const MOOD_LABEL_BN: Record<StudyMood, string> = {
  HAPPY: 'দারুণ লেগেছে',
  NEUTRAL: 'ঠিকঠাক ছিল',
  SAD: 'কষ্ট হয়েছে',
};

// ============================================
// সাপ্তাহিক ছুটির দিন — বাংলাদেশ অনুযায়ী শুক্রবার
// ============================================
export const WEEK_START_DAY = 6; // শনিবার (0=রবিবার, 6=শনিবার)
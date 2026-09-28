// ============================================================
// Path: apps/api/src/common/messages/messages.ts
// ============================================================

// Central place for all Bengali API messages
export const MESSAGES = {
  // Success
  SUCCESS: 'সফল হয়েছে',
  REGISTER_SUCCESS: 'অ্যাকাউন্ট তৈরি হয়েছে! ইমেইল যাচাই করুন।',
  LOGIN_SUCCESS: 'লগইন সফল হয়েছে',
  LOGOUT_SUCCESS: 'লগআউট সম্পন্ন হয়েছে',
  OTP_SENT: 'ইমেইল এ ভেরিফিকেশন কোড পাঠানো হয়েছে',
  EMAIL_VERIFIED: 'ইমেইল সফলভাবে যাচাই করা হয়েছে',
  PASSWORD_RESET_SENT: 'পাসওয়ার্ড রিসেট কোড পাঠানো হয়েছে',
  PASSWORD_RESET_SUCCESS: 'পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে',
  PROFILE_UPDATED: 'প্রোফাইল আপডেট হয়েছে',
  SUBJECT_CREATED: 'বিষয় যোগ করা হয়েছে',
  SUBJECT_UPDATED: 'বিষয় আপডেট হয়েছে',
  SUBJECT_DELETED: 'বিষয় মুছে ফেলা হয়েছে',
  STUDY_ENTRY_CREATED: 'পড়াশোনার এন্ট্রি যোগ হয়েছে',
  STUDY_ENTRY_UPDATED: 'এন্ট্রি আপডেট হয়েছে',
  STUDY_ENTRY_DELETED: 'এন্ট্রি মুছে ফেলা হয়েছে',
  GOAL_CREATED: 'লক্ষ্য নির্ধারণ হয়েছে',
  GOAL_UPDATED: 'লক্ষ্য আপডেট হয়েছে',
  GOAL_DELETED: 'লক্ষ্য মুছে ফেলা হয়েছে',
  DIARY_SAVED: 'ডায়েরি সংরক্ষণ হয়েছে',

  // Errors
  UNAUTHORIZED: 'আপনি লগইন করা নেই',
  FORBIDDEN: 'এই কাজ করার অনুমতি নেই',
  NOT_FOUND: 'তথ্য খুঁজে পাওয়া যায়নি',
  USER_NOT_FOUND: 'ব্যবহারকারী খুঁজে পাওয়া যায়নি',
  SUBJECT_NOT_FOUND: 'বিষয় খুঁজে পাওয়া যায়নি',
  STUDY_ENTRY_NOT_FOUND: 'এন্ট্রি খুঁজে পাওয়া যায়নি',
  GOAL_NOT_FOUND: 'লক্ষ্য খুঁজে পাওয়া যায়নি',
  EMAIL_ALREADY_EXISTS: 'এই ইমেইল দিয়ে আগেই অ্যাকাউন্ট আছে',
  USERNAME_ALREADY_EXISTS: 'এই ইউজারনেম আগেই নেওয়া হয়েছে',
  INVALID_CREDENTIALS: 'ইমেইল/ইউজারনেম অথবা পাসওয়ার্ড ভুল',
  INVALID_OTP: 'ভেরিফিকেশন কোড ভুল অথবা মেয়াদ শেষ',
  EMAIL_NOT_VERIFIED: 'প্রথমে ইমেইল যাচাই করুন',
  ACCOUNT_DISABLED: 'আপনার অ্যাকাউন্ট নিষ্ক্রিয় করা হয়েছে',
  TOKEN_EXPIRED: 'সেশনের মেয়াদ শেষ, আবার লগইন করুন',
  INVALID_TOKEN: 'অবৈধ টোকেন',
  VALIDATION_FAILED: 'তথ্য সঠিকভাবে দেওয়া হয়নি',
  INTERNAL_ERROR: 'সার্ভারে সমস্যা হয়েছে, আবার চেষ্টা করুন',
  PASSWORD_TOO_WEAK: 'পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে',
  SUBJECT_ALREADY_EXISTS: 'এই নামে বিষয় আগেই আছে',
  INVALID_DURATION: 'সময় সঠিকভাবে দেওয়া হয়নি',
  INVALID_DATE: 'তারিখ সঠিক নয়',
  CANNOT_DELETE_DEFAULT_SUBJECT: 'ডিফল্ট বিষয় মুছে ফেলা যাবে না',
};

// ============================================================
// Path: apps/api/src/common/messages/index.ts
// ============================================================

export * from './messages';
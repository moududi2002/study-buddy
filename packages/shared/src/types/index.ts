// সব shared TypeScript type এখানে থাকবে
// frontend এবং backend একই type ব্যবহার করবে

import type { ClassLevel, StudyMood, UserRole } from '../../constants';

// ============================================
// ব্যবহারকারী (User)
// ============================================
export interface UserPublic {
  id: string;
  email: string;
  username: string;
  fullName: string;
  classLevel: ClassLevel;
  avatarUrl: string | null;
  role: UserRole;
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  isEmailVerified: boolean;
  createdAt: string;
}

// ============================================
// প্রমাণীকরণ (Auth)
// ============================================
export interface RegisterPayload {
  email: string;
  username: string;
  fullName: string;
  password: string;
  classLevel: ClassLevel;
}

export interface LoginPayload {
  identifier: string; // email অথবা username
  password: string;
  rememberMe?: boolean;
}

export interface AuthResponse {
  user: UserPublic;
  accessToken: string;
  refreshToken: string;
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  email: string;
  otp: string;
  newPassword: string;
}

// ============================================
// বিষয় (Subject)
// ============================================
export interface Subject {
  id: string;
  name: string;
  color: string;   // hex color, যেমন "#A78BFA"
  icon: string;    // emoji বা icon name
  isCustom: boolean;
  createdAt: string;
}

export interface CreateSubjectPayload {
  name: string;
  color: string;
  icon: string;
}

// ============================================
// পড়াশোনার এন্ট্রি (Study Entry)
// ============================================
export interface StudyEntry {
  id: string;
  subjectId: string;
  subject?: Subject;
  date: string;         // ISO date (YYYY-MM-DD)
  durationMinutes: number;
  chapter: string | null;
  note: string | null;
  mood: StudyMood;
  createdAt: string;
}

export interface CreateStudyEntryPayload {
  subjectId: string;
  date: string;
  durationMinutes: number;
  chapter?: string;
  note?: string;
  mood: StudyMood;
}

// ============================================
// লক্ষ্য (Goal)
// ============================================
export interface Goal {
  id: string;
  title: string;
  type: 'DAILY' | 'WEEKLY' | 'MONTHLY';
  targetMinutes: number | null;
  targetChapters: number | null;
  subjectId: string | null;
  isCompleted: boolean;
  startsAt: string;
  endsAt: string;
}

// ============================================
// ব্যাজ (Badge)
// ============================================
export interface Badge {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  earnedAt: string;
}

// ============================================
// API Response wrapper
// ============================================
export interface ApiResponse<T> {
  success: boolean;
  message: string;    // বাংলা বার্তা
  data: T;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  errors?: Record<string, string[]>;
}
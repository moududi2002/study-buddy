// ============================================================
// Path: apps/api/prisma/seed.ts
// ============================================================

import { PrismaClient, BadgeCode } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

// Default subject template for new students
export const DEFAULT_SUBJECTS = [
  { name: 'বাংলা',        color: '#F472B6', icon: '📖' },
  { name: 'ইংরেজি',       color: '#60A5FA', icon: '🔤' },
  { name: 'গণিত',         color: '#A78BFA', icon: '➗' },
  { name: 'বিজ্ঞান',      color: '#34D399', icon: '🔬' },
  { name: 'আইসিটি',       color: '#FBBF24', icon: '💻' },
  { name: 'ইসলাম শিক্ষা', color: '#4ADE80', icon: '🕌' },
  { name: 'বাংলাদেশ ও বিশ্বপরিচয়', color: '#FB923C', icon: '🌏' },
];

// All available badges with Bengali descriptions
export const BADGE_DEFINITIONS: Record<BadgeCode, { name: string; description: string; icon: string }> = {
  FIRST_STUDY_ENTRY:       { name: 'প্রথম পদক্ষেপ',  description: 'প্রথম পড়াশোনার এন্ট্রি যোগ করেছো', icon: '🌱' },
  SEVEN_DAY_STREAK:        { name: 'সাত দিনের নায়ক', description: 'একটানা ৭ দিন পড়েছো',              icon: '🌟' },
  THIRTY_DAY_STREAK:       { name: 'মাসিক চ্যাম্পিয়ন', description: 'একটানা ৩০ দিন পড়েছো',            icon: '🏆' },
  HUNDRED_HOURS:           { name: '১০০ ঘণ্টা ক্লাব',  description: 'মোট ১০০ ঘণ্টা পড়াশোনা সম্পন্ন',   icon: '⏰' },
  MATH_HERO:               { name: 'গণিত নায়ক',      description: 'গণিতে ২০ ঘণ্টা পড়েছো',           icon: '🦸' },
  SCIENCE_EXPLORER:        { name: 'বিজ্ঞান অভিযাত্রী', description: 'বিজ্ঞানে ২০ ঘণ্টা পড়েছো',        icon: '🚀' },
  CONSISTENCY_CHAMPION:    { name: 'নিয়মিত চ্যাম্পিয়ন', description: 'এক মাসে ২৫ দিন পড়েছো',          icon: '💎' },
  CHAPTER_FINISHER:        { name: 'অধ্যায় সমাপ্তকারী', description: '২০টি অধ্যায় শেষ করেছো',          icon: '📕' },
  EARLY_BIRD:              { name: 'ভোরের পাখি',      description: 'সকাল ৬টার আগে পড়া শুরু করেছো',   icon: '🌅' },
  NIGHT_OWL:               { name: 'রাতের পেঁচা',     description: 'রাত ১২টার পরে পড়েছো',             icon: '🌙' },
};

async function main() {
  console.log('🌱 Seeding started...');
  console.log('ℹ️  Default subjects will be auto-created on user registration.');
  console.log('✅ Seeding done. (No admin/global seed data needed.)');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
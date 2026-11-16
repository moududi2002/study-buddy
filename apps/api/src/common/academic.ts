
import { BadRequestException } from '@nestjs/common';
import { AcademicGroup } from '../generated/prisma/client';

export type AcademicSubject = {
  name: string;
  color: string;
  icon: string;
};

const COMMON_6_8 = [
  'বাংলা',
  'English',
  'গণিত',
  'বিজ্ঞান',
  'ইতিহাস ও সামাজিক বিজ্ঞান',
  'ডিজিটাল প্রযুক্তি',
  'জীবন ও জীবিকা',
  'স্বাস্থ্য সুরক্ষা',
  'ইসলাম শিক্ষা',
  'হিন্দুধর্ম শিক্ষা',
  'বৌদ্ধধর্ম শিক্ষা',
  'খ্রিষ্টধর্ম শিক্ষা',
  'শিল্প ও সংস্কৃতি',
  'কৃষিশিক্ষা',
  'গার্হস্থ্যবিজ্ঞান',
  'শারীরিক শিক্ষা ও স্বাস্থ্য',
];

const COMMON_9_10 = [
  'বাংলা',
  'English',
  'গণিত',
  'ধর্ম ও নৈতিক শিক্ষা',
  'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
  'শারীরিক শিক্ষা, স্বাস্থ্যবিজ্ঞান ও খেলাধুলা',
  'ক্যারিয়ার শিক্ষা',
];

const SSC_SUBJECTS: Record<AcademicGroup, string[]> = {
  SCIENCE: [
    'পদার্থবিজ্ঞান (Physics)',
    'রসায়ন (Chemistry)',
    'জীববিজ্ঞান (Biology)',
    'উচ্চতর গণিত (Higher Mathematics)',
    'বাংলাদেশ ও বিশ্বপরিচয়',
  ],

  HUMANITIES: [
    'বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা',
    'ভূগোল ও পরিবেশ',
    'অর্থনীতি',
    'পৌরনীতি ও নাগরিকতা',
    'সাধারণ বিজ্ঞান',
    'কৃষিশিক্ষা',
  ],

  BUSINESS: [
    'হিসাববিজ্ঞান (Accounting)',
    'ফিন্যান্স ও ব্যাংকিং',
    'ব্যবসায় উদ্যোগ',
    'সাধারণ বিজ্ঞান',
    'কৃষিশিক্ষা',
    'গার্হস্থ্যবিজ্ঞান',
    'ভূগোল ও পরিবেশ',
    'বাংলাদেশ ও বিশ্বপরিচয়',
  ],
};

const COMMON_11_12 = [
  'বাংলা ১ম পত্র',
  'বাংলা ২য় পত্র',
  'English 1st Paper',
  'English 2nd Paper',
  'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
];

const HSC_SUBJECTS: Record<AcademicGroup, string[]> = {
  SCIENCE: [
    'পদার্থবিজ্ঞান (Physics)',
    'রসায়ন (Chemistry)',
    'জীববিজ্ঞান (Biology)',
    'উচ্চতর গণিত (Higher Mathematics)',
    'ভূগোল (Geography)',
  ],

  HUMANITIES: [
    'অর্থনীতি (Economics)',
    'পৌরনীতি ও সুশাসন',
    'ইতিহাস (History)',
    'ইসলামের ইতিহাস ও সংস্কৃতি',
    'সমাজবিজ্ঞান (Sociology)',
    'সমাজকর্ম (Social Work)',
    'যুক্তিবিদ্যা (Logic)',
    'ভূগোল (Geography)',
    'ইসলাম শিক্ষা (Islamic Studies)',
    'মনোবিজ্ঞান (Psychology)',
  ],

  BUSINESS: [
    'হিসাববিজ্ঞান (Accounting)',
    'ব্যবসায় সংগঠন ও ব্যবস্থাপনা',
    'ফিন্যান্স, ব্যাংকিং ও বিমা',
    'উৎপাদন ব্যবস্থাপনা ও বিপণন',
    'অর্থনীতি (Economics)',
    'পরিসংখ্যান (Statistics)',
    'ভূগোল (Geography)',
    'উচ্চতর গণিত (Higher Mathematics)',
  ],
};

export function validateAcademic(
  classLevel: number,
  group: AcademicGroup | null | undefined,
): AcademicGroup | null {
  if (!Number.isInteger(classLevel) ||
      classLevel < 6 ||
      classLevel > 12) {
    throw new BadRequestException(
      'শ্রেণি ৬ থেকে ১২-এর মধ্যে হতে হবে',
    );
  }

  if (classLevel <= 8) {
    if (group != null) {
      throw new BadRequestException(
        'ষষ্ঠ থেকে অষ্টম শ্রেণিতে বিভাগ প্রযোজ্য নয়',
      );
    }

    return null;
  }

  if (!group || !Object.values(AcademicGroup).includes(group)) {
    throw new BadRequestException(
      'বিজ্ঞান, মানবিক বা ব্যবসায় শিক্ষা বিভাগ নির্বাচন করো',
    );
  }

  return group;
}

export function getAcademicSubjects(
  classLevel: number,
  group: AcademicGroup | null,
): AcademicSubject[] {
  const validGroup = validateAcademic(classLevel, group);

  const names =
    classLevel <= 8
      ? COMMON_6_8
      : classLevel <= 10
        ? [...COMMON_9_10, ...SSC_SUBJECTS[validGroup!]]
        : [...COMMON_11_12, ...HSC_SUBJECTS[validGroup!]];

  const unique = [...new Set(names)];

  const colors = [
    '#A78BFA',
    '#F472B6',
    '#60A5FA',
    '#34D399',
    '#FBBF24',
    '#FB923C',
  ];

  return unique.map((name, index) => {
    let icon = '📚';

    if (/গণিত|Mathematics|পরিসংখ্যান/.test(name)) {
      icon = '📐';
    } else if (/বিজ্ঞান|Physics|Chemistry|Biology/.test(name)) {
      icon = '🔬';
    } else if (/English/.test(name)) {
      icon = '🔤';
    } else if (/বাংলা|ইতিহাস/.test(name)) {
      icon = '📖';
    } else if (/তথ্য|প্রযুক্তি|ICT/.test(name)) {
      icon = '💻';
    } else if (/হিসাব|ফিন্যান্স|ব্যবসায়/.test(name)) {
      icon = '💼';
    }

    return {
      name,
      icon,
      color: colors[index % colors.length],
    };
  });
}

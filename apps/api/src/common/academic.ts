
import { BadRequestException } from '@nestjs/common';
import { AcademicGroup } from '../generated/prisma/client';

export type AcademicSubject = {
  name: string;
  color: string;
  icon: string;
};

/**
 * Class 6–8
 * General Education Curriculum
 * Revised structure effective from 2025
 *
 * Students study one religion subject and
 * one optional subject according to school policy.
 */
const COMMON_6_8 = [
  'বাংলা ১ম পত্র',
  'বাংলা ২য় পত্র',
  'English 1st Paper',
  'English 2nd Paper',
  'গণিত',
  'বিজ্ঞান',
  'বাংলাদেশ ও বিশ্বপরিচয়',
  'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',

  // Select one according to religion
  'ইসলাম ও নৈতিক শিক্ষা',
  'হিন্দুধর্ম ও নৈতিক শিক্ষা',
  'বৌদ্ধধর্ম ও নৈতিক শিক্ষা',
  'খ্রিষ্টধর্ম ও নৈতিক শিক্ষা',
];

const OPTIONAL_6_8 = [
  'কৃষিশিক্ষা',
  'গার্হস্থ্যবিজ্ঞান',
  'আরবি',
  'সংস্কৃত',
  'পালি',
  'ক্ষুদ্র নৃগোষ্ঠীর ভাষা ও সংস্কৃতি',
  'চারু ও কারুকলা',
  'সংগীত',
];

/**
 * Class 9–10 (SSC)
 * Common compulsory subjects
 */
const COMMON_9_10 = [
  'বাংলা ১ম পত্র',
  'বাংলা ২য় পত্র',
  'English 1st Paper',
  'English 2nd Paper',
  'গণিত',
  'ধর্ম ও নৈতিক শিক্ষা',
  'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
  'শারীরিক শিক্ষা, স্বাস্থ্যবিজ্ঞান ও খেলাধুলা',
  'ক্যারিয়ার শিক্ষা',
];

/**
 * SSC Science Group
 */
const SSC_SCIENCE = [
  'পদার্থবিজ্ঞান (Physics)',
  'রসায়ন (Chemistry)',
  'জীববিজ্ঞান (Biology)',
  'উচ্চতর গণিত (Higher Mathematics)',
  'বাংলাদেশ ও বিশ্বপরিচয়',

  // Additional / optional subjects
  'ভূগোল ও পরিবেশ',
  'কৃষিশিক্ষা',
  'গার্হস্থ্যবিজ্ঞান',
  'চারু ও কারুকলা',
  'সংগীত',
];

/**
 * SSC Humanities Group
 */
const SSC_HUMANITIES = [
  'বাংলাদেশের ইতিহাস ও বিশ্বসভ্যতা',
  'ভূগোল ও পরিবেশ',
  'অর্থনীতি (Economics)',
  'পৌরনীতি ও নাগরিকতা',
  'সাধারণ বিজ্ঞান',

  // Additional / optional subjects
  'কৃষিশিক্ষা',
  'গার্হস্থ্যবিজ্ঞান',
  'চারু ও কারুকলা',
  'সংগীত',
  'আরবি',
  'সংস্কৃত',
  'পালি',
  'ক্ষুদ্র নৃগোষ্ঠীর ভাষা ও সংস্কৃতি',
];

/**
 * SSC Business Studies Group
 */
const SSC_BUSINESS = [
  'হিসাববিজ্ঞান (Accounting)',
  'ফিন্যান্স ও ব্যাংকিং (Finance and Banking)',
  'ব্যবসায় উদ্যোগ (Business Entrepreneurship)',
  'সাধারণ বিজ্ঞান',

  // Additional / optional subjects
  'ভূগোল ও পরিবেশ',
  'বাংলাদেশ ও বিশ্বপরিচয়',
  'কৃষিশিক্ষা',
  'গার্হস্থ্যবিজ্ঞান',
  'চারু ও কারুকলা',
  'সংগীত',
];

/**
 * SSC Group-wise subject catalogue
 */
const SSC_SUBJECTS: Record<AcademicGroup, string[]> = {
  SCIENCE: SSC_SCIENCE,
  HUMANITIES: SSC_HUMANITIES,
  BUSINESS: SSC_BUSINESS,
};

/**
 * Class 11–12 (HSC)
 * Common compulsory subjects
 */
const COMMON_11_12 = [
  'বাংলা ১ম পত্র',
  'বাংলা ২য় পত্র',
  'English 1st Paper',
  'English 2nd Paper',
  'তথ্য ও যোগাযোগ প্রযুক্তি (ICT)',
];

/**
 * HSC Science Group
 */
const HSC_SCIENCE = [
  'পদার্থবিজ্ঞান (Physics)',
  'রসায়ন (Chemistry)',
  'জীববিজ্ঞান (Biology)',
  'উচ্চতর গণিত (Higher Mathematics)',
  'পরিসংখ্যান (Statistics)',
  'ভূগোল (Geography)',
  'কৃষিশিক্ষা (Agriculture Studies)',
];

/**
 * HSC Humanities Group
 */
const HSC_HUMANITIES = [
  'অর্থনীতি (Economics)',
  'পৌরনীতি ও সুশাসন (Civics and Good Governance)',
  'ইতিহাস (History)',
  'ইসলামের ইতিহাস ও সংস্কৃতি (Islamic History and Culture)',
  'সমাজবিজ্ঞান (Sociology)',
  'সমাজকর্ম (Social Work)',
  'যুক্তিবিদ্যা (Logic)',
  'ভূগোল (Geography)',
  'ইসলাম শিক্ষা (Islamic Studies)',
  'মনোবিজ্ঞান (Psychology)',
  'পরিসংখ্যান (Statistics)',
  'গার্হস্থ্য ব্যবস্থাপনা ও পারিবারিক জীবন',
  'খাদ্য ও পুষ্টি (Food and Nutrition)',
  'আরবি (Arabic)',
  'সংস্কৃত (Sanskrit)',
  'পালি (Pali)',
  'উচ্চাঙ্গ সংগীত (Higher Music)',
];

/**
 * HSC Business Studies Group
 */
const HSC_BUSINESS = [
  'হিসাববিজ্ঞান (Accounting)',
  'ব্যবসায় সংগঠন ও ব্যবস্থাপনা (Business Organization and Management)',
  'ফিন্যান্স, ব্যাংকিং ও বিমা (Finance, Banking and Insurance)',
  'উৎপাদন ব্যবস্থাপনা ও বিপণন (Production Management and Marketing)',
  'অর্থনীতি (Economics)',
  'পরিসংখ্যান (Statistics)',
  'ভূগোল (Geography)',
  'উচ্চতর গণিত (Higher Mathematics)',
  'কৃষিশিক্ষা (Agriculture Studies)',
  'গার্হস্থ্য ব্যবস্থাপনা ও পারিবারিক জীবন',
];

/**
 * HSC Group-wise subject catalogue
 */
const HSC_SUBJECTS: Record<AcademicGroup, string[]> = {
  SCIENCE: HSC_SCIENCE,
  HUMANITIES: HSC_HUMANITIES,
  BUSINESS: HSC_BUSINESS,
};

/**
 * Validate class and academic group.
 */
export function validateAcademic(
  classLevel: number,
  group: AcademicGroup | null | undefined,
): AcademicGroup | null {
  if (
    !Number.isInteger(classLevel) ||
    classLevel < 6 ||
    classLevel > 12
  ) {
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

  if (
    !group ||
    !Object.values(AcademicGroup).includes(group)
  ) {
    throw new BadRequestException(
      'বিজ্ঞান, মানবিক বা ব্যবসায় শিক্ষা বিভাগ নির্বাচন করো',
    );
  }

  return group;
}

/**
 * Get academic subjects by class and group.
 */
export function getAcademicSubjects(
  classLevel: number,
  group: AcademicGroup | null,
): AcademicSubject[] {
  const validGroup = validateAcademic(classLevel, group);

  let names: string[];

  if (classLevel <= 8) {
    names = [
      ...COMMON_6_8,
      ...OPTIONAL_6_8,
    ];
  } else if (classLevel <= 10) {
    names = [
      ...COMMON_9_10,
      ...SSC_SUBJECTS[validGroup!],
    ];
  } else {
    names = [
      ...COMMON_11_12,
      ...HSC_SUBJECTS[validGroup!],
    ];
  }

  // Remove duplicate subjects
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

    if (/গণিত|Mathematics|পরিসংখ্যান|Statistics/.test(name)) {
      icon = '📐';
    } else if (
      /বিজ্ঞান|পদার্থবিজ্ঞান|রসায়ন|জীববিজ্ঞান|Physics|Chemistry|Biology/.test(name)
    ) {
      icon = '🔬';
    } else if (/English|ইংরেজি/.test(name)) {
      icon = '🔤';
    } else if (/বাংলা|ইতিহাস|History/.test(name)) {
      icon = '📖';
    } else if (/তথ্য|প্রযুক্তি|ICT/.test(name)) {
      icon = '💻';
    } else if (
      /হিসাব|ফিন্যান্স|ব্যবসায়|অর্থনীতি|Accounting|Finance/.test(name)
    ) {
      icon = '💼';
    } else if (/ভূগোল|Geography/.test(name)) {
      icon = '🌍';
    } else if (/ধর্ম|ইসলাম|আরবি|সংস্কৃত|পালি/.test(name)) {
      icon = '🕌';
    } else if (/কৃষি|Agriculture/.test(name)) {
      icon = '🌱';
    } else if (/গার্হস্থ্য|খাদ্য|পুষ্টি/.test(name)) {
      icon = '🏠';
    }

    return {
      name,
      icon,
      color: colors[index % colors.length],
    };
  });
}

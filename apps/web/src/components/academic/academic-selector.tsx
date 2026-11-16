
'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { toBnDigits } from '@/lib/bn';

export type AcademicGroup =
  | 'SCIENCE'
  | 'HUMANITIES'
  | 'BUSINESS';

type Props = {
  classLevel: number;
  academicGroup: AcademicGroup | null;
  onClassChange: (value: number) => void;
  onGroupChange: (value: AcademicGroup | null) => void;
};

const GROUPS = [
  {
    value: 'SCIENCE',
    title: 'বিজ্ঞান',
    subtitle: 'Science',
    emoji: '🔬',
  },
  {
    value: 'HUMANITIES',
    title: 'মানবিক',
    subtitle: 'Humanities',
    emoji: '🌍',
  },
  {
    value: 'BUSINESS',
    title: 'ব্যবসায় শিক্ষা',
    subtitle: 'Business Studies',
    emoji: '💼',
  },
] as const;

export function AcademicSelector({
  classLevel,
  academicGroup,
  onClassChange,
  onGroupChange,
}: Props) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-2 text-sm font-bold text-primary-800">
          🎓 তুমি কোন শ্রেণিতে পড়ো?
        </p>

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
          {[6, 7, 8, 9, 10, 11, 12].map((level) => {
            const selected = classLevel === level;

            return (
              <motion.button
                key={level}
                type="button"
                whileHover={{ y: -3, scale: 1.04 }}
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  onClassChange(level);

                  if (level <= 8) {
                    onGroupChange(null);
                  }
                }}
                aria-pressed={selected}
                className={
                  'relative overflow-hidden rounded-2xl border-2 px-2 py-3 text-sm font-extrabold shadow-sm transition-colors ' +
                  (selected
                    ? 'border-violet-500 bg-violet-600 text-white shadow-violet-200'
                    : 'border-violet-100 bg-white text-violet-700 hover:border-violet-300')
                }
              >
                {selected && (
                  <motion.span
                    layoutId="selected-academic-class"
                    className="absolute inset-0 bg-white/10"
                  />
                )}

                <span className="relative">
                  {toBnDigits(level)}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {classLevel >= 9 ? (
          <motion.div
            key="group-selection"
            initial={{ opacity: 0, height: 0, y: -12 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -12 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <p className="mb-2 text-sm font-bold text-primary-800">
              📚 এবার তোমার বিভাগ নির্বাচন করো
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {GROUPS.map((group) => {
                const selected =
                  academicGroup === group.value;

                return (
                  <motion.button
                    key={group.value}
                    type="button"
                    whileHover={{ y: -4, scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    aria-pressed={selected}
                    onClick={() => onGroupChange(group.value)}
                    className={
                      'relative rounded-2xl border-2 p-4 text-center transition-all ' +
                      (selected
                        ? 'border-violet-500 bg-violet-100 shadow-lg shadow-violet-100'
                        : 'border-violet-100 bg-white hover:bg-violet-50')
                    }
                  >
                    <motion.div
                      animate={
                        selected
                          ? { rotate: [0, -6, 6, 0] }
                          : { rotate: 0 }
                      }
                      transition={{ duration: 0.4 }}
                      className="text-3xl"
                    >
                      {group.emoji}
                    </motion.div>

                    <p className="mt-2 font-bold text-violet-900">
                      {group.title}
                    </p>

                    <p className="mt-1 text-xs text-violet-500">
                      {group.subtitle}
                    </p>

                    {selected && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="absolute right-2 top-2 rounded-full bg-violet-600 px-2 py-0.5 text-xs text-white"
                      >
                        ✓
                      </motion.span>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {!academicGroup && (
              <p className="mt-2 text-xs text-amber-600">
                রেজিস্ট্রেশন সম্পন্ন করতে একটি বিভাগ বাছাই করো।
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="general-class"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-700"
          >
            🌱 এই শ্রেণিতে বিভাগ নির্বাচন প্রয়োজন নেই।
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

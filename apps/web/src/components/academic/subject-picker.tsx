
'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { AnimatePresence, motion } from 'framer-motion';

import {
  Check,
  ChevronDown,
  Loader2,
  Plus,
  Search,
} from 'lucide-react';

import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';

export type SubjectOption = {
  id: string;
  name: string;
  color: string;
  icon: string;
  isCustom: boolean;
};

type SubjectPickerProps = {
  subjects: SubjectOption[];
  value: string;
  onChange: (id: string) => void;
  onCreated: (subject: SubjectOption) => void;
  disabled?: boolean;
};

export function SubjectPicker({
  subjects,
  value,
  onChange,
  onCreated,
  disabled = false,
}: SubjectPickerProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [customName, setCustomName] = useState('');
  const [adding, setAdding] = useState(false);
  const [showCustom, setShowCustom] = useState(false);

  const selected = subjects.find((s) => s.id === value);

  const filtered = subjects.filter((subject) =>
    subject.name
      .normalize('NFKC')
      .toLocaleLowerCase()
      .includes(
        search.normalize('NFKC').trim().toLocaleLowerCase(),
      ),
  );

  useEffect(() => {
    const handler = (event: PointerEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener('pointerdown', handler);

    return () => {
      document.removeEventListener('pointerdown', handler);
    };
  }, []);

  async function addCustomSubject() {
    const name = customName
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ');

    if (name.length < 2 || name.length > 40) {
      toast.error('বিষয়ের নাম ২ থেকে ৪০ অক্ষরের হওয়া প্রয়োজন');
      return;
    }

    const duplicate = subjects.find(
      (s) =>
        s.name.normalize('NFKC').toLocaleLowerCase() ===
        name.toLocaleLowerCase(),
    );

    if (duplicate) {
      onChange(duplicate.id);
      setOpen(false);
      setShowCustom(false);
      toast.info('এই বিষয়টি আগেই আছে');
      return;
    }

    setAdding(true);

    try {
      const response = await api.post<{
        success: true;
        data: SubjectOption;
      }>('/subjects', {
        name,
        icon: '📚',
        color: '#A78BFA',
      });

      onCreated(response.data);
      onChange(response.data.id);
      setCustomName('');
      setShowCustom(false);
      setOpen(false);
      toast.success('নতুন বিষয় যোগ হয়েছে! ✨');
    } catch (err) {
      toast.error(
        (err as ApiError).message ||
        'বিষয় যোগ করা যায়নি',
      );
    } finally {
      setAdding(false);
    }
  }

  if (disabled || subjects.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50 p-4 text-sm text-violet-700">
        <p className="font-semibold">
          📚 বিষয় নির্বাচনের আগে একাডেমিক তথ্য সম্পূর্ণ করো
        </p>

        <Link
          href="/profile"
          className="mt-2 inline-block font-bold text-violet-800 underline underline-offset-4"
        >
          প্রোফাইলে গিয়ে ক্লাস ও বিভাগ সেট করো
        </Link>
      </div>
    );
  }

  return (
    <div ref={rootRef} className="relative w-full">
      <motion.button
        type="button"
        whileTap={{ scale: 0.99 }}
        onClick={() => setOpen((state) => !state)}
        aria-expanded={open}
        aria-haspopup="listbox"
        className="flex min-h-14 w-full items-center gap-3 rounded-2xl border-2 border-violet-100 bg-white px-4 text-left shadow-sm transition hover:border-violet-300 focus:outline-none focus:ring-2 focus:ring-violet-300"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-xl">
          {selected?.icon ?? '📚'}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block text-xs text-violet-400">
            বিষয় নির্বাচন
          </span>

          <span className="block truncate text-sm font-bold text-violet-900">
            {selected?.name ?? 'কোন বিষয় পড়বে?'}
          </span>
        </span>

        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-violet-500"
        >
          <ChevronDown size={18} />
        </motion.span>
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-violet-100 bg-white p-3 shadow-2xl shadow-violet-200/40"
          >
            <div className="flex items-center gap-2 rounded-xl bg-violet-50 px-3">
              <Search size={16} className="text-violet-400" />

              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="বিষয় খুঁজে দেখো..."
                className="h-11 w-full bg-transparent text-sm text-violet-900 outline-none placeholder:text-violet-400"
                autoFocus
              />
            </div>

            <div
              role="listbox"
              aria-label="পাঠ্যবিষয়"
              className="mt-2 max-h-64 space-y-1 overflow-y-auto overscroll-contain"
            >
              {filtered.map((subject) => (
                <button
                  key={subject.id}
                  type="button"
                  role="option"
                  aria-selected={value === subject.id}
                  onClick={() => {
                    onChange(subject.id);
                    setOpen(false);
                    setSearch('');
                  }}
                  className={
                    'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ' +
                    (value === subject.id
                      ? 'bg-violet-100 font-bold text-violet-900'
                      : 'text-violet-700 hover:bg-violet-50')
                  }
                >
                  <span className="text-xl">
                    {subject.icon}
                  </span>

                  <span className="min-w-0 flex-1">
                    {subject.name}
                  </span>

                  {value === subject.id && (
                    <Check size={16} />
                  )}
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="p-4 text-center text-sm text-violet-400">
                  এই নামে কোনো বিষয় পাওয়া যায়নি
                </p>
              )}
            </div>

            <div className="mt-2 border-t border-violet-100 pt-3">
              {!showCustom ? (
                <button
                  type="button"
                  onClick={() => {
                    setCustomName(search);
                    setShowCustom(true);
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-100 px-3 py-3 text-sm font-bold text-violet-800 transition hover:bg-violet-200"
                >
                  <Plus size={16} />
                  নিজের বিষয় যোগ করো
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    value={customName}
                    onChange={(e) =>
                      setCustomName(e.target.value)
                    }
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void addCustomSubject();
                      }
                    }}
                    placeholder="নতুন বিষয়ের নাম"
                    maxLength={40}
                    className="w-full rounded-xl border border-violet-200 p-3 text-sm outline-none focus:border-violet-500"
                    autoFocus
                  />

                  <button
                    type="button"
                    disabled={adding}
                    onClick={() => void addCustomSubject()}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 p-3 text-sm font-bold text-white disabled:opacity-60"
                  >
                    {adding
                      ? <Loader2 size={16} className="animate-spin" />
                      : <Plus size={16} />}

                    বিষয়টি যোগ করো
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

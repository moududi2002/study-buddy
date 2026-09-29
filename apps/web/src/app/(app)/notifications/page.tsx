// ============================================================
// Path: apps/web/src/app/(app)/notifications/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Bell,
  Check,
  Trash2,
  Users,
  UserPlus,
  MessageCircle,
  Trophy,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { toBnDigits, relativeBnTime } from '@/lib/bn';
import { SectionHeader } from '@/components/dashboard/section';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';

interface NotificationItem {
  id: string;
  type:
    | 'GROUP_INVITATION'
    | 'GROUP_INVITATION_ACCEPTED'
    | 'GROUP_JOINED'
    | 'GROUP_LEFT'
    | 'GROUP_MESSAGE'
    | 'PERSONAL_MESSAGE'
    | 'GROUP_TARGET_COMPLETED'
    | 'GROUP_MEMBER_MILESTONE'
    | 'BADGE_EARNED';
  title: string;
  body: string;
  data: Record<string, any> | null;
  isRead: boolean;
  createdAt: string;
}

const TYPE_ICON: Record<string, any> = {
  GROUP_INVITATION: UserPlus,
  GROUP_INVITATION_ACCEPTED: Check,
  GROUP_JOINED: Users,
  GROUP_LEFT: X,
  GROUP_MESSAGE: MessageCircle,
  PERSONAL_MESSAGE: MessageCircle,
  GROUP_TARGET_COMPLETED: Trophy,
  GROUP_MEMBER_MILESTONE: Trophy,
  BADGE_EARNED: Trophy,
};

const TYPE_COLOR: Record<string, string> = {
  GROUP_INVITATION: 'bg-pink-soft-100 text-pink-soft-400',
  GROUP_INVITATION_ACCEPTED: 'bg-mint-100 text-mint-500',
  GROUP_JOINED: 'bg-lavender-100 text-primary-500',
  GROUP_LEFT: 'bg-gray-100 text-gray-600',
  GROUP_MESSAGE: 'bg-peach-100 text-peach-400',
  PERSONAL_MESSAGE: 'bg-peach-100 text-peach-400',
  GROUP_TARGET_COMPLETED: 'bg-yellow-50 text-amber-600',
  GROUP_MEMBER_MILESTONE: 'bg-yellow-50 text-amber-600',
  BADGE_EARNED: 'bg-yellow-50 text-amber-600',
};

export default function NotificationsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');

  const load = async () => {
    try {
      const res = await api.get<{
        success: true;
        data: { items: NotificationItem[]; pagination: any };
      }>(`/notifications?limit=50${filter === 'unread' ? '&unreadOnly=true' : ''}`);
      setItems(res.data.items);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const handleClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      try {
        await api.post(`/notifications/${n.id}/read`);
        setItems((prev) =>
          prev.map((x) => (x.id === n.id ? { ...x, isRead: true } : x)),
        );
      } catch {
        /* ignore */
      }
    }

    // Navigate based on type
    const data = n.data ?? {};
    if (n.type === 'GROUP_INVITATION' && data.groupId) {
      router.push('/groups');
    } else if (n.type === 'GROUP_INVITATION_ACCEPTED' && data.groupId) {
      router.push(`/groups/${data.groupId}`);
    } else if (
      (n.type === 'GROUP_MESSAGE' || n.type === 'PERSONAL_MESSAGE') &&
      data.conversationId
    ) {
      router.push(`/chat/${data.conversationId}`);
    } else if (n.type === 'GROUP_LEFT' && data.groupId) {
      router.push('/groups');
    } else if (n.type === 'BADGE_EARNED') {
      router.push('/achievements');
    }
  };

  const markAllRead = async () => {
    try {
      const res = await api.post<{ success: true; message: string }>(
        '/notifications/read-all',
      );
      toast.success(res.message);
      setItems((prev) => prev.map((x) => ({ ...x, isRead: true })));
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সমস্যা হয়েছে');
    }
  };

  const clearRead = async () => {
    if (!confirm('সব পঠিত নোটিফিকেশন মুছে ফেলবে?')) return;
    try {
      const res = await api.del<{ success: true; message: string }>(
        '/notifications/clear',
      );
      toast.success(res.message);
      setItems((prev) => prev.filter((x) => !x.isRead));
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সমস্যা হয়েছে');
    }
  };

  const removeOne = async (id: string) => {
    try {
      await api.del(`/notifications/${id}`);
      setItems((prev) => prev.filter((x) => x.id !== id));
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'মুছতে সমস্যা');
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-5xl"
        >
          🔔
        </motion.div>
        <div className="flex items-center gap-2 text-primary-500 text-sm">
          <Loader2 className="animate-spin" size={16} />
          লোড হচ্ছে...
        </div>
      </div>
    );
  }

  const unreadCount = items.filter((x) => !x.isRead).length;

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
            নোটিফিকেশন 🔔
          </h1>
          <p className="text-sm text-primary-500 mt-1">
            গ্রুপ আমন্ত্রণ, মেসেজ, অর্জন — সব এখানে
          </p>
        </div>
        {items.some((x) => !x.isRead) && (
          <Button variant="soft" size="sm" onClick={markAllRead}>
            <Check size={14} />
            সব পঠিত
          </Button>
        )}
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)}>
        <TabsList className="grid grid-cols-2 w-full bg-lavender-100 rounded-2xl p-1">
          <TabsTrigger value="all">
            সব ({toBnDigits(items.length)})
          </TabsTrigger>
          <TabsTrigger value="unread">
            অপঠিত ({toBnDigits(unreadCount)})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {items.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <div className="text-5xl mb-3">🔕</div>
          <p className="text-primary-500">
            {filter === 'unread'
              ? 'কোনো অপঠিত নোটিফিকেশন নেই!'
              : 'এখনো কোনো নোটিফিকেশন নেই'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            <AnimatePresence>
              {items.map((n) => {
                const Icon = TYPE_ICON[n.type] ?? Bell;
                const colorClass = TYPE_COLOR[n.type] ?? 'bg-lavender-100 text-primary-500';
                return (
                  <motion.div
                    key={n.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -30 }}
                    className={cn(
                      'card-soft p-4 cursor-pointer transition-all',
                      !n.isRead && 'border-l-4 border-primary-400 bg-lavender-100/40',
                      'hover:shadow-soft-lg',
                    )}
                    onClick={() => handleClick(n)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn('rounded-2xl p-2.5 shrink-0', colorClass)}>
                        <Icon size={18} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-semibold text-primary-800 text-sm">
                            {n.title}
                            {!n.isRead && (
                              <span className="ml-2 inline-block h-2 w-2 rounded-full bg-pink-soft-400" />
                            )}
                          </p>
                          <span className="text-xs text-primary-400 shrink-0">
                            {relativeBnTime(n.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm text-primary-600 mt-1 leading-snug">
                          {n.body}
                        </p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeOne(n.id);
                        }}
                        className="text-primary-300 hover:text-red-500 p-1 shrink-0"
                        title="মুছে ফেলো"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>

          {items.some((x) => x.isRead) && (
            <div className="pt-2">
               <Button
                onClick={clearRead}
                variant="secondary"
                size="sm"
                className="w-full"
              >
                <Trash2 size={14} />
                সব পঠিত নোটিফিকেশন মুছে ফেলো
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
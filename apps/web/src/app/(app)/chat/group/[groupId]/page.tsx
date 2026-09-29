// ============================================================
// Path: apps/web/src/app/(app)/chat/group/[groupId]/page.tsx
// ============================================================

'use client';

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';

export default function OpenGroupChatPage() {
  const params = useParams<{ groupId: string }>();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get<{ success: true; data: { id: string } }>(
          `/groups/${params.groupId}`,
        );
        // Find or create conversation via group — but our group detail doesn't
        // return conversationId. Simplest: fetch conversations list and pick
        // the one with groupId match.
        const list = await api.get<{ success: true; data: Array<{ id: string; groupId: string | null }> }>(
          '/chat/conversations',
        );
        const conv = list.data.find((c) => c.groupId === params.groupId);
        if (!conv) {
          toast.error('গ্রুপ চ্যাট পাওয়া যায়নি');
          router.replace(`/groups/${params.groupId}`);
          return;
        }
        router.replace(`/chat/${conv.id}`);
      } catch (err) {
        const e = err as ApiError;
        toast.error(e.message || 'সমস্যা হয়েছে');
        router.replace(`/groups/${params.groupId}`);
      }
    })();
  }, [params.groupId, router]);

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="text-5xl"
      >
        💬
      </motion.div>
      <div className="flex items-center gap-2 text-primary-500 text-sm">
        <Loader2 className="animate-spin" size={16} />
        গ্রুপ চ্যাট খুলছি...
      </div>
    </div>
  );
}
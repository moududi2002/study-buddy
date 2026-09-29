// ============================================================
// Path: apps/web/src/app/(app)/chat/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Loader2, MessageCircle, Search, BellOff } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { useSocket } from '@/lib/hooks/use-socket';
import { ConversationListItem, Message } from '@/lib/types/chat';
import { ConversationAvatar, formatChatTime } from '@/components/chat/conversation-avatar';
import { toBnDigits } from '@/lib/bn';
import { SectionHeader } from '@/components/dashboard/section';
import { Input } from '@/components/ui/input';

export default function ChatListPage() {
  const [items, setItems] = useState<ConversationListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const { socket } = useSocket();

  const load = async () => {
    try {
      const res = await api.get<{ success: true; data: ConversationListItem[] }>(
        '/chat/conversations',
      );
      setItems(res.data);
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
  }, []);

  // Listen for incoming messages to refresh list
  useEffect(() => {
    if (!socket) return;
    const onNewMessage = (m: Message) => {
      // Bump conversation to top + update last message
      setItems((prev) => {
        const idx = prev.findIndex((c) => c.id === m.conversationId);
        if (idx === -1) {
          // Unknown conversation — refresh
          load();
          return prev;
        }
        const next = [...prev];
        const updated = {
          ...next[idx],
          lastMessage: {
            id: m.id,
            type: m.type,
            content: m.content,
            imageUrl: m.imageUrl,
            senderId: m.senderId,
            senderName: m.sender.fullName,
            createdAt: m.createdAt,
          },
          unreadCount: next[idx].unreadCount + 1,
          updatedAt: m.createdAt,
        };
        next.splice(idx, 1);
        return [updated, ...next];
      });
    };
    socket.on('new_message', onNewMessage);
    return () => {
      socket.off('new_message', onNewMessage);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  if (loading) {
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
          লোড হচ্ছে...
        </div>
      </div>
    );
  }

  const filtered = items.filter((c) =>
    c.displayName.toLowerCase().includes(query.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
          চ্যাট 💬
        </h1>
        <p className="text-sm text-primary-500 mt-1">
          বন্ধু এবং গ্রুপের সাথে কথা বলো (মেসেজ ২৪ ঘণ্টা পর মুছে যায়)
        </p>
      </div>

      {/* Search */}
      <div className="card-soft p-3">
        <Input
          icon={<Search size={16} />}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="চ্যাট খোঁজো..."
        />
      </div>

      {filtered.length === 0 ? (
        <div className="card-soft p-8 text-center">
          <div className="text-5xl mb-3">💬</div>
          <p className="text-primary-500 mb-3">
            {query ? 'কোনো চ্যাট পাওয়া যায়নি' : 'এখনো কোনো চ্যাট নেই'}
          </p>
          {!query && (
            <p className="text-sm text-primary-400">
              বন্ধুর প্রোফাইলে গিয়ে "চ্যাট শুরু করো" চাপো, অথবা গ্রুপ থেকে গ্রুপ চ্যাটে যাও
            </p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((c, i) => (
            <motion.div
              key={c.id}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.03 }}
            >
              <Link href={`/chat/${c.id}`}>
                <div className="card-soft card-soft-hover p-3 flex items-center gap-3">
                  <ConversationAvatar
                    name={c.displayName}
                    imageUrl={c.displayImage}
                    isGroup={c.isGroup}
                    size={52}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-semibold text-primary-800 truncate">
                        {c.displayName}
                      </p>
                      {c.isGroup && (
                        <span className="text-xs text-primary-400">
                          · {toBnDigits(c.participantCount)} জন
                        </span>
                      )}
                    </div>
                    {c.lastMessage ? (
                      <p className="text-xs text-primary-500 truncate mt-0.5">
                        {c.isGroup && (
                          <span className="text-primary-400">
                            {c.lastMessage.senderId === c.otherUser?.id
                              ? ''
                              : c.lastMessage.senderName.split(' ')[0] + ': '}
                          </span>
                        )}
                        {c.lastMessage.type === 'IMAGE'
                          ? '📷 ছবি'
                          : c.lastMessage.content}
                      </p>
                    ) : (
                      <p className="text-xs text-primary-400 italic mt-0.5">
                        এখনো কোনো মেসেজ নেই
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    {c.lastMessage && (
                      <p className="text-[10px] text-primary-400">
                        {formatChatTime(c.lastMessage.createdAt)}
                      </p>
                    )}
                    {c.unreadCount > 0 && (
                      <span className="mt-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full bg-pink-soft-400 text-white text-[10px] font-bold">
                        {toBnDigits(c.unreadCount)}
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
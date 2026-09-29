// ============================================================
// Path: apps/web/src/app/(app)/chat/[conversationId]/page.tsx
// ============================================================

'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Loader2,
  Send,
  Image as ImageIcon,
  ChevronLeft,
  Trash2,
  X,
  Wifi,
  WifiOff,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError, API_URL } from '@/lib/api';
import { useAuthStore } from '@/lib/stores/auth.store';
import { useSocket } from '@/lib/hooks/use-socket';
import { ConversationDetail, Message } from '@/lib/types/chat';
import { ConversationAvatar, formatChatTime } from '@/components/chat/conversation-avatar';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { toBnDigits } from '@/lib/bn';
import { cn } from '@/lib/utils';

const PRESET_EMOJI: Record<string, string> = {
  cat_smile: '😺',
  cat_sleepy: '😴',
  cat_wink: '😸',
  cat_reader: '📖',
  cat_star: '🌟',
  cat_heart: '💖',
  bunny_happy: '🐰',
  bunny_reader: '📚',
};

export default function ChatRoomPage() {
  const params = useParams<{ conversationId: string }>();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);
  const { socket, connected } = useSocket();

  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingImage, setPendingImage] = useState<{ url: string; preview: string } | null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [hasMore, setHasMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Load conversation + messages
  useEffect(() => {
    (async () => {
      try {
        const [c, m] = await Promise.all([
          api.get<{ success: true; data: ConversationDetail }>(
            `/chat/conversations/${params.conversationId}`,
          ),
          api.get<{ success: true; data: { items: Message[]; hasMore: boolean } }>(
            `/chat/conversations/${params.conversationId}/messages?limit=30`,
          ),
        ]);
        setConversation(c.data);
        setMessages(m.data.items);
        setHasMore(m.data.hasMore);

        // Mark as read
        await api.post(`/chat/conversations/${params.conversationId}/read`);
      } catch (err) {
        const e = err as ApiError;
        toast.error(e.message || 'চ্যাট লোড করা যায়নি');
        router.replace('/chat');
      } finally {
        setLoading(false);
      }
    })();
  }, [params.conversationId, router]);

  // Join room + listeners
  useEffect(() => {
    if (!socket || !conversation) return;

    socket.emit('join_conversation', { conversationId: params.conversationId });
    socket.emit('mark_read', { conversationId: params.conversationId });

    const onNewMessage = (m: Message) => {
      if (m.conversationId !== params.conversationId) return;
      setMessages((prev) => {
        // Remove temp (pending) if same content from me
        const filtered = prev.filter(
          (x) => !(x.pending && x.senderId === m.senderId && x.content === m.content),
        );
        if (filtered.some((x) => x.id === m.id)) return filtered;
        return [...filtered, m];
      });
      // Mark read if chat open
      socket.emit('mark_read', { conversationId: params.conversationId });
      setTimeout(() => scrollToBottom(), 50);
    };

    const onTyping = (d: { userId: string; username: string }) => {
      if (d.userId === me?.id) return;
      setTypingUsers((prev) => ({ ...prev, [d.userId]: d.username }));
    };
    const onStopTyping = (d: { userId: string }) => {
      setTypingUsers((prev) => {
        const next = { ...prev };
        delete next[d.userId];
        return next;
      });
    };
    const onDeleted = (d: { id: string }) => {
      setMessages((prev) => prev.filter((m) => m.id !== d.id));
    };

    socket.on('new_message', onNewMessage);
    socket.on('typing', onTyping);
    socket.on('stop_typing', onStopTyping);
    socket.on('message_deleted', onDeleted);

    return () => {
      socket.emit('leave_conversation', { conversationId: params.conversationId });
      socket.off('new_message', onNewMessage);
      socket.off('typing', onTyping);
      socket.off('stop_typing', onStopTyping);
      socket.off('message_deleted', onDeleted);
    };
  }, [socket, conversation, params.conversationId, me?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    scrollToBottom();
  }, [messages.length]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Send text
  const sendText = async () => {
    const content = text.trim();
    if (!content || !socket) return;

    setText('');

    // Optimistic temp message
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: params.conversationId,
      senderId: me!.id,
      sender: {
        id: me!.id,
        username: me!.username,
        fullName: me!.fullName,
        avatarUrl: me!.avatarUrl,
      },
      type: 'TEXT',
      content,
      imageUrl: null,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);

    socket.emit(
      'send_message',
      {
        conversationId: params.conversationId,
        content,
        type: 'TEXT',
      },
      (ack: any) => {
        if (!ack?.ok) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
          );
          toast.error(ack?.error || 'মেসেজ পাঠানো যায়নি');
        }
      },
    );

    // Stop typing on send
    if (isTypingRef.current) {
      isTypingRef.current = false;
      socket.emit('stop_typing', { conversationId: params.conversationId });
    }
  };

  // Typing events
  const onTextChange = (v: string) => {
    setText(v);
    if (!socket) return;
    if (!isTypingRef.current && v.length > 0) {
      isTypingRef.current = true;
      socket.emit('typing', { conversationId: params.conversationId });
    }
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      if (isTypingRef.current) {
        isTypingRef.current = false;
        socket.emit('stop_typing', { conversationId: params.conversationId });
      }
    }, 1800);
  };

  // Image upload
  const pickImage = () => fileInputRef.current?.click();

  const onImageSelected = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error('ছবি ৫ মেগাবাইটের কম হতে হবে');
      return;
    }
    setUploadingImage(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.upload<{ imageUrl: string }>('/chat/images', fd);
      setPendingImage({ url: res.data.imageUrl, preview: URL.createObjectURL(file) });
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'আপলোড ব্যর্থ');
    } finally {
      setUploadingImage(false);
    }
  };

  const sendImage = () => {
    if (!socket || !pendingImage) return;
    const tempId = `temp-${Date.now()}`;
    const tempMsg: Message = {
      id: tempId,
      conversationId: params.conversationId,
      senderId: me!.id,
      sender: {
        id: me!.id,
        username: me!.username,
        fullName: me!.fullName,
        avatarUrl: me!.avatarUrl,
      },
      type: 'IMAGE',
      content: null,
      imageUrl: pendingImage.url,
      createdAt: new Date().toISOString(),
      pending: true,
    };
    setMessages((prev) => [...prev, tempMsg]);
    socket.emit(
      'send_message',
      {
        conversationId: params.conversationId,
        type: 'IMAGE',
        imageUrl: pendingImage.url,
      },
      (ack: any) => {
        if (!ack?.ok) {
          setMessages((prev) =>
            prev.map((m) => (m.id === tempId ? { ...m, pending: false, failed: true } : m)),
          );
          toast.error(ack?.error || 'ছবি পাঠানো যায়নি');
        }
      },
    );
    setPendingImage(null);
  };

  // Delete message
  const deleteMessage = (m: Message) => {
    if (m.senderId !== me?.id || m.pending || !socket) return;
    if (!confirm('এই মেসেজ মুছে ফেলবে?')) return;
    socket.emit('delete_message', {
      messageId: m.id,
      conversationId: params.conversationId,
    });
  };

  // Load older messages
  const loadOlder = async () => {
    if (!messages.length || !hasMore) return;
    const oldest = messages[0];
    try {
      const res = await api.get<{ success: true; data: { items: Message[]; hasMore: boolean } }>(
        `/chat/conversations/${params.conversationId}/messages?limit=30&before=${oldest.id}`,
      );
      setMessages((prev) => [...res.data.items, ...prev]);
      setHasMore(res.data.hasMore);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'লোড করা যায়নি');
    }
  };

  if (loading || !conversation) {
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

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] md:h-[calc(100vh-6rem)] -mx-4 md:mx-0">
      {/* Header */}
      <div className="card-soft rounded-b-none rounded-t-3xl px-4 py-3 flex items-center gap-3 shadow-soft">
        <button
          onClick={() => router.push('/chat')}
          className="text-primary-500 hover:text-primary-700 p-1"
        >
          <ChevronLeft size={20} />
        </button>
        <ConversationAvatar
          name={conversation.displayName}
          imageUrl={conversation.displayImage}
          isGroup={conversation.isGroup}
          size={44}
        />
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-primary-800 truncate">
            {conversation.displayName}
          </p>
          <p className="text-xs text-primary-400 truncate flex items-center gap-1">
            {connected ? (
              <>
                <Wifi size={10} className="text-mint-500" />
                <span className="text-mint-500">সংযুক্ত</span>
              </>
            ) : (
              <>
                <WifiOff size={10} className="text-red-500" />
                <span className="text-red-500">সংযোগ নেই</span>
              </>
            )}
            {conversation.isGroup && (
              <>
                · <Users size={10} /> {toBnDigits(conversation.participants.length)}
              </>
            )}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto px-3 md:px-4 py-4 space-y-2 bg-gradient-to-b from-white/50 to-lavender-100/40"
      >
        {hasMore && (
          <div className="text-center pb-2">
            <button
              onClick={loadOlder}
              className="text-xs text-primary-500 hover:text-primary-700 bg-white px-3 py-1.5 rounded-full shadow-soft"
            >
              পুরোনো মেসেজ দেখাও
            </button>
          </div>
        )}

        {messages.length === 0 && (
          <div className="text-center py-8">
            <div className="text-5xl mb-3">👋</div>
            <p className="text-sm text-primary-500">
              এখনো কোনো মেসেজ নেই — প্রথম মেসেজ পাঠাও!
            </p>
          </div>
        )}

        <AnimatePresence initial={false}>
          {messages.map((m, idx) => {
            const isMine = m.senderId === me?.id;
            const prev = messages[idx - 1];
            const showAvatar =
              !isMine && (!prev || prev.senderId !== m.senderId);

            const presetEmoji = m.sender.avatarUrl?.startsWith('preset:')
              ? PRESET_EMOJI[m.sender.avatarUrl.replace('preset:', '')]
              : null;
            const fullAvatar =
              m.sender.avatarUrl && !m.sender.avatarUrl.startsWith('preset:')
                ? m.sender.avatarUrl.startsWith('http')
                  ? m.sender.avatarUrl
                  : `${API_URL.replace('/api/v1', '')}${m.sender.avatarUrl}`
                : null;

            const imageSrc = m.imageUrl
              ? m.imageUrl.startsWith('http')
                ? m.imageUrl
                : `${API_URL.replace('/api/v1', '')}${m.imageUrl}`
              : null;

            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: m.failed ? 0.5 : 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className={cn('flex gap-2', isMine ? 'justify-end' : 'justify-start')}
              >
                {!isMine && (
                  <div className="w-8 shrink-0">
                    {showAvatar && (
                      <Avatar className="h-8 w-8">
                        {fullAvatar && <AvatarImage src={fullAvatar} />}
                        <AvatarFallback className="text-sm">
                          {presetEmoji ?? m.sender.fullName[0]}
                        </AvatarFallback>
                      </Avatar>
                    )}
                  </div>
                )}

                <div className={cn('max-w-[75%] md:max-w-[65%] group')}>
                  {!isMine && showAvatar && conversation.isGroup && (
                    <p className="text-[10px] text-primary-400 mb-0.5 pl-1">
                      {m.sender.fullName}
                    </p>
                  )}
                  <div
                    className={cn(
                      'rounded-2xl shadow-soft overflow-hidden',
                      m.type === 'IMAGE' ? 'p-1' : 'px-3.5 py-2',
                      isMine
                        ? 'bg-gradient-to-br from-primary-500 to-pink-soft-400 text-white rounded-br-sm'
                        : 'bg-white text-primary-800 rounded-bl-sm',
                    )}
                  >
                    {m.type === 'TEXT' ? (
                      <p className="text-sm whitespace-pre-wrap break-words">
                        {m.content}
                      </p>
                    ) : imageSrc ? (
                      <img
                        src={imageSrc}
                        alt="ছবি"
                        className="rounded-xl max-w-[240px] md:max-w-[300px] max-h-[320px] object-cover"
                      />
                    ) : null}
                  </div>
                  <div
                    className={cn(
                      'flex items-center gap-1 mt-0.5 text-[10px] text-primary-400',
                      isMine ? 'justify-end pr-1' : 'pl-1',
                    )}
                  >
                    <span>{formatChatTime(m.createdAt)}</span>
                    {m.pending && <span>· পাঠানো হচ্ছে...</span>}
                    {m.failed && <span className="text-red-500">· ব্যর্থ</span>}
                    {isMine && !m.pending && !m.failed && (
                      <button
                        onClick={() => deleteMessage(m)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-primary-400 hover:text-red-500 ml-1"
                        title="মুছে ফেলো"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Typing indicator */}
        {Object.keys(typingUsers).length > 0 && (
          <div className="flex items-center gap-2 pt-2">
            <div className="bg-white rounded-2xl px-3 py-2 shadow-soft flex items-center gap-1">
              <span className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="h-2 w-2 bg-primary-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </div>
            <span className="text-xs text-primary-400 italic">
              {Object.values(typingUsers).slice(0, 2).join(', ')} টাইপ করছে...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Image preview */}
      <AnimatePresence>
        {pendingImage && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="px-4 pb-2 bg-white border-t border-lavender-200"
          >
            <div className="flex items-center gap-3 py-2">
              <img
                src={pendingImage.preview}
                alt="preview"
                className="h-16 w-16 rounded-xl object-cover ring-2 ring-lavender-200"
              />
              <div className="flex-1">
                <p className="text-sm text-primary-700">ছবি পাঠাতে প্রস্তুত</p>
                <p className="text-xs text-primary-400">
                  পাঠাতে "পাঠাও" চাপো, অথবা বাতিল করো
                </p>
              </div>
              <Button size="sm" variant="soft" onClick={() => setPendingImage(null)}>
                <X size={14} />
              </Button>
              <Button size="sm" onClick={sendImage}>
                <Send size={14} />
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div className="bg-white border-t border-lavender-200 px-3 md:px-4 py-3 rounded-b-3xl">
        <div className="flex items-end gap-2">
          <button
            onClick={pickImage}
            disabled={uploadingImage}
            className="h-11 w-11 shrink-0 rounded-2xl bg-lavender-100 text-primary-500 flex items-center justify-center hover:bg-lavender-200 transition-colors disabled:opacity-50"
            title="ছবি পাঠাও"
          >
            {uploadingImage ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ImageIcon size={18} />
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onImageSelected(f);
              e.target.value = '';
            }}
          />
          <div className="flex-1">
            <textarea
              value={text}
              onChange={(e) => onTextChange(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendText();
                }
              }}
              placeholder="মেসেজ লেখো..."
              rows={1}
              maxLength={2000}
              className="w-full resize-none rounded-2xl border border-primary-200 bg-white px-4 py-2.5 outline-none focus:border-primary-400 focus:ring-2 focus:ring-lavender-200 text-primary-900 placeholder:text-primary-300 text-sm"
              style={{ maxHeight: 120 }}
            />
          </div>
          <button
            onClick={sendText}
            disabled={!text.trim() || sending || !connected}
            className="h-11 w-11 shrink-0 rounded-2xl bg-gradient-to-br from-primary-500 to-pink-soft-400 text-white flex items-center justify-center disabled:opacity-40 hover:scale-105 transition-transform"
          >
            <Send size={18} />
          </button>
        </div>
        <p className="text-[10px] text-primary-400 mt-1.5 text-center">
          💡 সর্বোচ্চ ১০০ মেসেজ · ২৪ ঘণ্টা পর অটো মুছে যায়
        </p>
      </div>
    </div>
  );
}
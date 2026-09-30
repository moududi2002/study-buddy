// ============================================================
// Path: apps/web/src/app/(app)/groups/[id]/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Loader2,
  UserPlus,
  Settings,
  LogOut,
  Trash2,
  Bell,
  BellOff,
  Crown,
  Shield,
  MoreVertical,
  MessageCircle,
  X,
  Users,
} from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { GroupDetail, GroupMemberItem } from '@/lib/types/groups';
import { useAuthStore } from '@/lib/stores/auth.store';
import { toBnDigits, formatMinutesShort } from '@/lib/bn';
import { GroupAvatar } from '@/components/groups/group-avatar';
import { GroupFormDialog } from '@/components/groups/group-form-dialog';
import { InviteMemberDialog } from '@/components/groups/invite-member-dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { SectionHeader } from '@/components/dashboard/section';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const me = useAuthStore((s) => s.user);

  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const [actionMember, setActionMember] = useState<GroupMemberItem | null>(null);

  const load = async () => {
    try {
      const res = await api.get<{ success: true; data: GroupDetail }>(
        `/groups/${params.id}`,
      );
      setGroup(res.data);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'লোড করা যায়নি');
      router.replace('/groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const toggleMute = async () => {
    try {
      const res = await api.post<{ success: true; message: string; data: { isMuted: boolean } }>(
        `/groups/${params.id}/mute`,
      );
      toast.success(res.message);
      setGroup((g) => (g ? { ...g, isMuted: res.data.isMuted } : g));
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সমস্যা হয়েছে');
    }
  };

  const leave = async () => {
    if (!confirm('গ্রুপ থেকে বের হয়ে যাবে?')) return;
    try {
      const res = await api.post<{ success: true; message: string }>(
        `/groups/${params.id}/leave`,
      );
      toast.success(res.message);
      router.replace('/groups');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'বের হওয়া যায়নি');
    }
  };

  const deleteGroup = async () => {
    if (!confirm('গ্রুপটা সত্যিই মুছে ফেলবে? সব সদস্য সরিয়ে ফেলা হবে।')) return;
    try {
      const res = await api.del<{ success: true; message: string }>(
        `/groups/${params.id}`,
      );
      toast.success(res.message);
      router.replace('/groups');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'মুছতে সমস্যা');
    }
  };

  const removeMember = async (userId: string) => {
    try {
      const res = await api.del<{ success: true; message: string }>(
        `/groups/${params.id}/members/${userId}`,
      );
      toast.success(res.message);
      setActionMember(null);
      await load();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সরানো যায়নি');
    }
  };

  const changeRole = async (userId: string, role: 'ADMIN' | 'MEMBER') => {
    try {
      const res = await api.patch<{ success: true; message: string }>(
        `/groups/${params.id}/members/${userId}/role`,
        { role },
      );
      toast.success(res.message);
      setActionMember(null);
      await load();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'পরিবর্তন হয়নি');
    }
  };

  const openChat = () => {
    router.push(`/chat/group/${params.id}`);
  };

  if (loading || !group) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-5xl"
        >
          👥
        </motion.div>
        <div className="flex items-center gap-2 text-primary-500 text-sm">
          <Loader2 className="animate-spin" size={16} />
          লোড হচ্ছে...
        </div>
      </div>
    );
  }

  const canManage = group.myRole === 'OWNER' || group.myRole === 'ADMIN';
  const isOwner = group.myRole === 'OWNER';

  return (
    <div className="space-y-5">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="card-soft p-5 relative overflow-hidden"
      >
        <div className="absolute -right-6 -top-6 text-8xl opacity-10">👥</div>
        <div className="relative flex items-start gap-4">
          <GroupAvatar name={group.name} imageUrl={group.imageUrl} size={72} />
          <div className="flex-1 min-w-0">
            <h1 className="text-xl md:text-2xl font-bold text-primary-800 truncate">
              {group.name}
            </h1>
            {group.description && (
              <p className="text-sm text-primary-600 mt-1">{group.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <Badge color="primary">
                <Users size={10} /> {toBnDigits(group.memberCount)} জন
              </Badge>
              {group.myRole === 'OWNER' && <Badge color="peach">👑 মালিক</Badge>}
              {group.myRole === 'ADMIN' && <Badge color="pink">🛡️ অ্যাডমিন</Badge>}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="relative flex flex-wrap gap-2 mt-4">
          <Button
            onClick={() => {
                openChat();
                router.push(
                group.conversationId
                    ? `/chat/${group.conversationId}`
                    : `/chat/group/${params.id}`
                );
            }}
            variant="primary"
            size="sm"
            >
            <MessageCircle size={14} />
            গ্রুপ চ্যাট
            </Button>

          {canManage && (
            <Button onClick={() => setInviteOpen(true)} variant="soft" size="sm">
              <UserPlus size={14} />
              ইনভাইট
            </Button>
          )}
          {canManage && (
            <Button onClick={() => setEditOpen(true)} variant="soft" size="sm">
              <Settings size={14} />
              এডিট
            </Button>
          )}
          <Button onClick={toggleMute} variant="soft" size="sm">
            {group.isMuted ? <Bell size={14} /> : <BellOff size={14} />}
            {group.isMuted ? 'আনমিউট' : 'মিউট'}
          </Button>
          {!isOwner && (
            <Button onClick={leave} variant="danger" size="sm">
              <LogOut size={14} />
              বের হও
            </Button>
          )}
          {isOwner && (
            <Button onClick={deleteGroup} variant="danger" size="sm">
              <Trash2 size={14} />
              মুছে ফেলো
            </Button>
          )}
        </div>
      </motion.div>

      {/* Weekly target progress */}
      {group.weeklyTargetMinutes && (
        <div className="card-soft p-5">
          <SectionHeader emoji="🎯" title="সাপ্তাহিক লক্ষ্য" />
          <div className="flex items-center gap-4">
            <div className="text-5xl">🏆</div>
            <div className="flex-1">
              <p className="text-sm text-primary-600 mb-2">
                গ্রুপ মিলে {formatMinutesShort(group.groupTotalMinutes)} /{' '}
                {formatMinutesShort(group.weeklyTargetMinutes)}
              </p>
              <Progress value={group.targetProgressPercent} className="h-3" />
              <p className="text-xs text-primary-400 mt-1.5">
                {toBnDigits(group.targetProgressPercent)}% সম্পন্ন
                {group.targetProgressPercent >= 100 && ' — অভিনন্দন! 🎉'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Pending invitations (owner/admin only) */}
      {canManage && group.invitations.length > 0 && (
        <div className="card-soft p-5">
          <SectionHeader emoji="⏳" title={`অপেক্ষায় (${group.invitations.length})`} />
          <div className="space-y-2">
            {group.invitations.map((inv) => (
              <div key={inv.id} className="flex items-center gap-3 p-2 rounded-2xl bg-lavender-100">
                <Avatar className="h-9 w-9">
                  {inv.invitee.avatarUrl && !inv.invitee.avatarUrl.startsWith('preset:') && (
                    <AvatarImage src={inv.invitee.avatarUrl} />
                  )}
                  <AvatarFallback>{inv.invitee.fullName?.[0] ?? '🐱'}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary-800 truncate">
                    {inv.invitee.fullName}
                  </p>
                  <p className="text-xs text-primary-500">@{inv.invitee.username}</p>
                </div>
                <Badge color="peach">অপেক্ষমাণ</Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Leaderboard */}
      <div className="card-soft p-5">
        <SectionHeader emoji="🏆" title="এই সপ্তাহের লিডারবোর্ড" />
        <div className="space-y-2">
          {group.leaderboard.slice(0, 5).map((m) => {
            const medal = m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : `#${toBnDigits(m.rank!)}`;
            const isMe = m.id === me?.id;
            return (
              <Link key={m.id} href={isMe ? '/profile' : `/friends/${m.id}`}>
                <div
                  className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                    isMe ? 'bg-lavender-200' : 'bg-lavender-100 hover:bg-lavender-200'
                  }`}
                >
                  <div className="w-8 text-center text-lg font-bold text-primary-600">
                    {medal}
                  </div>
                  <Avatar className="h-10 w-10">
                    {m.avatarUrl && !m.avatarUrl.startsWith('preset:') && (
                      <AvatarImage src={m.avatarUrl} />
                    )}
                    <AvatarFallback>{m.fullName?.[0] ?? '🐱'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-800 truncate">
                      {m.fullName}
                      {isMe && <span className="text-xs text-primary-500 ml-1">(তুমি)</span>}
                    </p>
                    <p className="text-xs text-primary-500">
                      লেভেল {toBnDigits(m.level)} · 🔥 {toBnDigits(m.currentStreak)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-primary-700 text-sm">
                      {formatMinutesShort(m.weekMinutes)}
                    </p>
                    <p className="text-[10px] text-primary-400">এই সপ্তাহে</p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>

      {/* All members */}
      <div className="card-soft p-5">
        <SectionHeader emoji="👥" title={`সব সদস্য (${group.members.length})`} />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {group.members.map((m) => {
            const isMe = m.id === me?.id;
            return (
              <div
                key={m.id}
                className="flex items-center gap-3 p-3 rounded-2xl bg-lavender-100 hover:bg-lavender-200 transition-colors"
              >
                <Link href={isMe ? '/profile' : `/friends/${m.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Avatar className="h-10 w-10">
                    {m.avatarUrl && !m.avatarUrl.startsWith('preset:') && (
                      <AvatarImage src={m.avatarUrl} />
                    )}
                    <AvatarFallback>{m.fullName?.[0] ?? '🐱'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-primary-800 truncate flex items-center gap-1">
                      {m.fullName}
                      {m.role === 'OWNER' && <Crown size={12} className="text-amber-500" />}
                      {m.role === 'ADMIN' && <Shield size={12} className="text-primary-500" />}
                    </p>
                    <p className="text-xs text-primary-500 truncate">
                      লেভেল {toBnDigits(m.level)} · {formatMinutesShort(m.weekMinutes)}
                    </p>
                  </div>
                </Link>
                {canManage && !isMe && m.role !== 'OWNER' && (
                  <button
                    onClick={() => setActionMember(m)}
                    className="text-primary-400 hover:text-primary-600 p-1"
                  >
                    <MoreVertical size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Edit dialog */}
      {group && (
        <GroupFormDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          onSaved={load}
          editing={{
            id: group.id,
            name: group.name,
            description: group.description,
            imageUrl: group.imageUrl,
            weeklyTargetMinutes: group.weeklyTargetMinutes,
          }}
        />
      )}

      {/* Invite dialog */}
      <InviteMemberDialog
        groupId={params.id}
        open={inviteOpen}
        onOpenChange={setInviteOpen}
        onInvited={load}
      />

      {/* Member action dialog */}
      <Dialog open={!!actionMember} onOpenChange={(o) => !o && setActionMember(null)}>
        <DialogContent>
          <DialogTitle>{actionMember?.fullName}</DialogTitle>
          <DialogDescription>এই সদস্যের জন্য কী করতে চাও?</DialogDescription>

          {actionMember && (
            <div className="space-y-2 mt-2">
              {isOwner && actionMember.role === 'MEMBER' && (
                <Button
                  onClick={() => changeRole(actionMember.id, 'ADMIN')}
                  variant="soft"
                  className="w-full"
                >
                  <Shield size={14} />
                  অ্যাডমিন বানাও
                </Button>
              )}
              {isOwner && actionMember.role === 'ADMIN' && (
                <Button
                  onClick={() => changeRole(actionMember.id, 'MEMBER')}
                  variant="soft"
                  className="w-full"
                >
                  <Users size={14} />
                  সাধারণ সদস্য বানাও
                </Button>
              )}
              <Button
                onClick={() => removeMember(actionMember.id)}
                variant="danger"
                className="w-full"
              >
                <X size={14} />
                গ্রুপ থেকে সরাও
              </Button>
              <DialogClose asChild>
                <Button variant="secondary" className="w-full">
                  বাতিল
                </Button>
              </DialogClose>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
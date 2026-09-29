// ============================================================
// Path: apps/web/src/app/(app)/groups/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Users, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { GroupListItem, MyInvitation } from '@/lib/types/groups';
import { SectionHeader } from '@/components/dashboard/section';
import { GroupCard } from '@/components/groups/group-card';
import { GroupFormDialog } from '@/components/groups/group-form-dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';

export default function GroupsPage() {
  const router = useRouter();
  const [groups, setGroups] = useState<GroupListItem[]>([]);
  const [invitations, setInvitations] = useState<MyInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  const load = async () => {
    try {
      const [g, inv] = await Promise.all([
        api.get<{ success: true; data: GroupListItem[] }>('/groups'),
        api.get<{ success: true; data: MyInvitation[] }>('/groups/invitations/mine'),
      ]);
      setGroups(g.data);
      setInvitations(inv.data);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'লোড করা যায়নি');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const respond = async (invitationId: string, action: 'ACCEPTED' | 'REJECTED') => {
    try {
      const res = await api.post<{ success: true; message: string }>(
        `/groups/invitations/${invitationId}/respond`,
        { action },
      );
      toast.success(res.message);
      await load();
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'সাড়া দেওয়া যায়নি');
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
          👥
        </motion.div>
        <div className="flex items-center gap-2 text-primary-500 text-sm">
          <Loader2 className="animate-spin" size={16} />
          লোড হচ্ছে...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3 px-1">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
            আমার গ্রুপ 👥
          </h1>
          <p className="text-sm text-primary-500 mt-1">
            বন্ধুদের নিয়ে দল বানাও, একসাথে পড়ো, একসাথে এগোও
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus size={16} />
          নতুন গ্রুপ
        </Button>
      </div>

      {/* Pending invitations */}
      {invitations.length > 0 && (
        <div>
          <SectionHeader emoji="💌" title={`আমন্ত্রণ (${invitations.length})`} />
          <div className="space-y-2">
            {invitations.map((inv) => (
              <motion.div
                key={inv.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                className="card-soft p-4 border-l-4 border-primary-400"
              >
                <div className="flex items-start gap-3 mb-3">
                  <Avatar className="h-11 w-11">
                    {inv.inviter.avatarUrl && !inv.inviter.avatarUrl.startsWith('preset:') && (
                      <AvatarImage src={inv.inviter.avatarUrl} />
                    )}
                    <AvatarFallback>{inv.inviter.fullName?.[0] ?? '🐱'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-primary-700">
                      <b>{inv.inviter.fullName}</b> তোমাকে{' '}
                      <b className="text-primary-800">{inv.group.name}</b> গ্রুপে
                      ইনভাইট করেছেন
                    </p>
                    {inv.message && (
                      <p className="text-xs text-primary-500 italic mt-1">
                        "{inv.message}"
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => respond(inv.id, 'ACCEPTED')}
                    className="flex-1"
                  >
                    গ্রহণ করো
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => respond(inv.id, 'REJECTED')}
                    className="flex-1"
                  >
                    বাতিল
                  </Button>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* My groups */}
      <div>
        <SectionHeader
          emoji="🎒"
          title={`আমার গ্রুপ (${groups.length})`}
        />
        {groups.length === 0 ? (
          <div className="card-soft p-8 text-center">
            <div className="text-5xl mb-3">👥</div>
            <p className="text-primary-600 mb-4">
              এখনো কোনো গ্রুপ নেই। বন্ধুদের নিয়ে একটা বানাও!
            </p>
            <Button onClick={() => setCreateOpen(true)}>
              <Plus size={16} />
              প্রথম গ্রুপ বানাও
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {groups.map((g, i) => (
                <GroupCard key={g.id} group={g} index={i} />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <GroupFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSaved={(id) => {
          router.push(`/groups/${id}`);
        }}
      />
    </div>
  );
}
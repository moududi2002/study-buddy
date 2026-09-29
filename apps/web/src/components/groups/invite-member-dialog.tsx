// ============================================================
// Path: apps/web/src/components/groups/invite-member-dialog.tsx
// ============================================================

'use client';

import { useState } from 'react';
import { Search, UserPlus, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { toBnDigits } from '@/lib/bn';

interface SearchResult {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  classLevel: number;
  level: number;
  xp: number;
  isInSameGroup: boolean;
}

export function InviteMemberDialog({
  groupId,
  open,
  onOpenChange,
  onInvited,
}: {
  groupId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvited: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const search = async () => {
    if (query.trim().length < 2) {
      toast.error('অন্তত ২ অক্ষর দাও');
      return;
    }
    setSearching(true);
    try {
      const res = await api.get<{ success: true; data: SearchResult[] }>(
        `/friends/search?q=${encodeURIComponent(query.trim())}`,
      );
      setResults(res.data);
      if (res.data.length === 0) toast.info('কাউকে পাওয়া যায়নি');
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'খুঁজতে সমস্যা');
    } finally {
      setSearching(false);
    }
  };

  const invite = async (userId: string, displayName: string) => {
    setInvitingId(userId);
    try {
      const res = await api.post<{ success: true; message: string }>(
        `/groups/${groupId}/invite`,
        { identifier: userId },
      );
      toast.success(`${displayName} কে ইনভাইট পাঠানো হয়েছে 🎉`);
      onInvited();
      setResults((prev) => prev.filter((r) => r.id !== userId));
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'ইনভাইট পাঠানো যায়নি');
    } finally {
      setInvitingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogTitle>বন্ধু ইনভাইট করো 💌</DialogTitle>
        <DialogDescription>
          ইউজারনেম বা ইমেইল দিয়ে খোঁজো, তারপর ইনভাইট পাঠাও
        </DialogDescription>

        <div className="space-y-4 mt-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                icon={<Search size={16} />}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && search()}
                placeholder="rafi অথবা rafi@example.com"
                autoFocus
              />
            </div>
            <Button onClick={search} loading={searching} variant="soft">
              খোঁজো
            </Button>
          </div>

          {results.length > 0 && (
            <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
              {results.map((r) => (
                <div
                  key={r.id}
                  className="flex items-center gap-3 p-3 rounded-2xl bg-lavender-100"
                >
                  <Avatar className="h-10 w-10">
                    {r.avatarUrl && !r.avatarUrl.startsWith('preset:') && (
                      <AvatarImage src={r.avatarUrl} />
                    )}
                    <AvatarFallback>{r.fullName?.[0] ?? '🐱'}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-primary-800 text-sm truncate">
                      {r.fullName}
                    </p>
                    <p className="text-xs text-primary-500 truncate">
                      @{r.username} · ক্লাস {toBnDigits(r.classLevel)} · লেভেল{' '}
                      {toBnDigits(r.level)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="soft"
                    onClick={() => invite(r.id, r.fullName)}
                    loading={invitingId === r.id}
                    disabled={!!invitingId}
                  >
                    <UserPlus size={14} />
                    ইনভাইট
                  </Button>
                </div>
              ))}
            </div>
          )}

          <DialogClose asChild>
            <Button variant="secondary" className="w-full">
              বন্ধ করো
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
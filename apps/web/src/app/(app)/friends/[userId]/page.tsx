
'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { MessageCircle, UserPlus, UserMinus } from 'lucide-react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api';
import { Button } from '@/components/ui/button';

type FriendProfile = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  classLevel: number;
  relationship:
    | 'NONE'
    | 'OUTGOING'
    | 'INCOMING'
    | 'FRIENDS'
    | 'SELF';
  requestId: string | null;
};

export default function FriendProfilePage() {
  const params = useParams<{ userId: string }>();
  const router = useRouter();

  const [profile, setProfile] = useState<FriendProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  async function load() {
    try {
      const response = await api.get<{
        success: true;
        data: FriendProfile;
      }>(`/friends/${params.userId}/profile`);

      setProfile(response.data);
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [params.userId]);

  async function request() {
    setBusy(true);
    try {
      await api.post(`/friends/request/${params.userId}`);
      toast.success('Friend Request পাঠানো হয়েছে');
      await load();
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function respond(accept: boolean) {
    if (!profile?.requestId) return;

    setBusy(true);
    try {
      await api.post(
        `/friends/requests/${profile.requestId}/respond`,
        { accept },
      );

      await load();
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function removeFriend() {
    if (!confirm('Friend Connection সরিয়ে ফেলবে?')) return;

    setBusy(true);
    try {
      await api.del(`/friends/connections/${params.userId}`);
      toast.success('Friend Connection সরানো হয়েছে');
      await load();
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  async function openChat() {
    setBusy(true);

    try {
      const response = await api.post<{
        success: true;
        data: { id: string };
      }>('/chat/conversations', {
        userId: params.userId,
      });

      router.push(`/chat/${response.data.id}`);
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <p className="p-8 text-center">লোড হচ্ছে...</p>;
  }

  if (!profile) {
    return <p className="p-8 text-center">প্রোফাইল পাওয়া যায়নি</p>;
  }

  return (
    <div className="mx-auto max-w-xl space-y-5">
      <Link href="/friends" className="text-sm text-violet-600">
        ← বন্ধুদের তালিকায় ফিরে যাও
      </Link>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-3xl border border-violet-100 bg-white p-8 text-center shadow-xl shadow-violet-100"
      >
        <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full bg-violet-100 text-5xl">
          👤
        </div>

        <h1 className="mt-4 text-2xl font-extrabold text-violet-900">
          {profile.fullName}
        </h1>

        <p className="mt-1 text-sm text-violet-500">
          @{profile.username}
        </p>

        <p className="mt-3 text-sm text-violet-600">
          ক্লাস {profile.classLevel}
        </p>

        <div className="mt-6">
          {profile.relationship === 'FRIENDS' && (
            <div className="space-y-3">
              <Button
                disabled={busy}
                onClick={() => void openChat()}
                className="w-full"
              >
                <MessageCircle size={17} />
                মেসেজ পাঠাও
              </Button>

              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void removeFriend()}
                className="w-full"
              >
                <UserMinus size={17} />
                Unfriend
              </Button>
            </div>
          )}

          {profile.relationship === 'NONE' && (
            <Button
              disabled={busy}
              onClick={() => void request()}
              className="w-full"
            >
              <UserPlus size={17} />
              Friend Request পাঠাও
            </Button>
          )}

          {profile.relationship === 'OUTGOING' && (
            <p className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-700">
              তোমার Friend Request অপেক্ষমাণ।
            </p>
          )}

          {profile.relationship === 'INCOMING' && (
            <div className="flex justify-center gap-3">
              <Button disabled={busy} onClick={() => void respond(true)}>
                Accept
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => void respond(false)}
              >
                Decline
              </Button>
            </div>
          )}
        </div>

        <p className="mt-7 rounded-2xl bg-violet-50 p-4 text-xs leading-6 text-violet-600">
          🔒 অন্য ব্যবহারকারীর Study Time, Goal, Streak,
          Achievement ও Study History ব্যক্তিগত রাখা হয়েছে।
        </p>
      </motion.div>
    </div>
  );
}

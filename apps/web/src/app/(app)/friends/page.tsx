
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, UserPlus, Users, Check, X, MessageCircle } from 'lucide-react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

type Connection = {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  classLevel: number;
  relationship: 'NONE' | 'OUTGOING' | 'INCOMING' | 'FRIENDS';
  requestId: string | null;
};

export default function FriendsPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Connection[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);

  async function loadConnections() {
    try {
      const response = await api.get<{
        success: true;
        data: Connection[];
      }>('/friends/connections');

      setConnections(response.data);
    } catch {
      toast.error('Friend List লোড করা যায়নি');
    }
  }

  useEffect(() => {
    void loadConnections();
  }, []);

  async function search() {
    if (query.trim().length < 2) {
      toast.error('কমপক্ষে ২ অক্ষর লিখো');
      return;
    }

    setLoading(true);

    try {
      const response = await api.get<{
        success: true;
        data: Connection[];
      }>(
        `/friends/search?q=${encodeURIComponent(query.trim())}`,
      );

      setResults(response.data);
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setLoading(false);
    }
  }

  async function doAction(
    id: string,
    path: string,
    body?: unknown,
  ) {
    setActionId(id);

    try {
      const response = await api.post<{
        success: true;
        message: string;
      }>(path, body);

      toast.success(response.message);
      await loadConnections();

      if (query.trim().length >= 2) {
        await search();
      }
    } catch (err) {
      toast.error((err as ApiError).message);
    } finally {
      setActionId(null);
    }
  }

  function personCard(person: Connection) {
    return (
      <motion.div
        key={person.id}
        whileHover={{ y: -2 }}
        className="flex flex-wrap items-center gap-3 rounded-2xl border border-violet-100 bg-white p-4 shadow-sm"
      >
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-violet-100 text-xl">
          👤
        </div>

        <div className="min-w-0 flex-1">
          <Link
            href={`/friends/${person.id}`}
            className="font-bold text-violet-900 hover:underline"
          >
            {person.fullName}
          </Link>

          <p className="text-xs text-violet-500">
            @{person.username} · ক্লাস {person.classLevel}
          </p>
        </div>

        {person.relationship === 'NONE' && (
          <Button
            size="sm"
            disabled={actionId === person.id}
            onClick={() =>
              void doAction(
                person.id,
                `/friends/request/${person.id}`,
              )
            }
          >
            <UserPlus size={15} />
            Add Friend
          </Button>
        )}

        {person.relationship === 'OUTGOING' && (
          <span className="rounded-full bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-700">
            Request Pending
          </span>
        )}

        {person.relationship === 'INCOMING' &&
          person.requestId && (
            <div className="flex gap-2">
              <Button
                size="sm"
                disabled={actionId === person.id}
                onClick={() =>
                  void doAction(
                    person.id,
                    `/friends/requests/${person.requestId}/respond`,
                    { accept: true },
                  )
                }
              >
                <Check size={15} />
                Accept
              </Button>

              <Button
                variant="secondary"
                size="sm"
                disabled={actionId === person.id}
                onClick={() =>
                  void doAction(
                    person.id,
                    `/friends/requests/${person.requestId}/respond`,
                    { accept: false },
                  )
                }
              >
                <X size={15} />
              </Button>
            </div>
          )}

        {person.relationship === 'FRIENDS' && (
          <Link
            href={`/friends/${person.id}`}
            className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm font-bold text-emerald-700"
          >
            <MessageCircle size={15} />
            Message
          </Link>
        )}
      </motion.div>
    );
  }

  const friends = connections.filter(
    (item) => item.relationship === 'FRIENDS',
  );

  const incoming = connections.filter(
    (item) => item.relationship === 'INCOMING',
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-extrabold text-violet-900">
          বন্ধুদের জগৎ 💜
        </h1>
        <p className="mt-2 text-sm text-violet-500">
          বন্ধু হও, কথা বলো। ব্যক্তিগত পড়াশোনার তথ্য গোপন থাকবে।
        </p>
      </div>

      <div className="rounded-3xl border border-violet-100 bg-white p-5 shadow-sm">
        <div className="flex gap-2">
          <div className="min-w-0 flex-1">
            <Input
              icon={<Search size={17} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') void search();
              }}
              placeholder="নাম অথবা ইউজারনেম লিখো..."
            />
          </div>

          <Button loading={loading} onClick={() => void search()}>
            খোঁজো
          </Button>
        </div>

        {results.length > 0 && (
          <div className="mt-4 space-y-3">
            {results.map(personCard)}
          </div>
        )}
      </div>

      {incoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg font-bold text-violet-900">
            নতুন Friend Request ({incoming.length})
          </h2>
          <div className="space-y-3">
            {incoming.map(personCard)}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-violet-900">
          <Users size={20} />
          আমার বন্ধুরা ({friends.length})
        </h2>

        {friends.length === 0 ? (
          <div className="rounded-3xl bg-violet-50 p-8 text-center text-sm text-violet-600">
            এখনো কোনো বন্ধু নেই। কাউকে খুঁজে Request পাঠাও! 🌸
          </div>
        ) : (
          <div className="space-y-3">
            {friends.map(personCard)}
          </div>
        )}
      </section>
    </div>
  );
}

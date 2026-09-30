// ============================================================
// Path: apps/web/src/app/(app)/friends/page.tsx
// ============================================================

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Search, UserPlus, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { toBnDigits } from '@/lib/bn';
import { SectionHeader } from '@/components/dashboard/section';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface SearchResult {
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  classLevel: number;
  level: number;
  xp: number;
  currentStreak: number;
  isInSameGroup: boolean;
}

export default function FriendsSearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);

  const search = async () => {
    if (query.trim().length < 2) {
      toast.error('অন্তত ২ অক্ষর দাও');
      return;
    }
    setSearching(true);
    setSearched(true);
    try {
      const res = await api.get<{ success: true; data: SearchResult[] }>(
        `/friends/search?q=${encodeURIComponent(query.trim())}`,
      );
      setResults(res.data);
    } catch (err) {
      const e = err as ApiError;
      toast.error(e.message || 'খুঁজতে সমস্যা');
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
          বন্ধু খোঁজো 🔍
        </h1>
        <p className="text-sm text-primary-500 mt-1">
          ইউজারনেম, নাম বা ইমেইল দিয়ে খোঁজো
        </p>
      </div>

      <div className="card-soft p-5">
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              icon={<Search size={16} />}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && search()}
              placeholder="munira অথবা munira@example.com"
              autoFocus
            />
          </div>
          <Button onClick={search} loading={searching}>
            খোঁজো
          </Button>
        </div>
      </div>

      {searched && (
        <div>
          <SectionHeader
            emoji="👥"
            title={`ফলাফল (${toBnDigits(results.length)})`}
          />
          {results.length === 0 && !searching ? (
            <div className="card-soft p-8 text-center">
              <div className="text-4xl mb-2">🔍</div>
              <p className="text-primary-500 text-sm">
                কাউকে পাওয়া যায়নি। অন্য নাম দিয়ে চেষ্টা করো!
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {results.map((r, i) => (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link href={`/friends/${r.id}`}>
                    <div className="card-soft card-soft-hover p-4 flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        {r.avatarUrl && !r.avatarUrl.startsWith('preset:') && (
                          <AvatarImage src={r.avatarUrl} />
                        )}
                        <AvatarFallback>{r.fullName?.[0] ?? '🐱'}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-primary-800 truncate">
                          {r.fullName}
                        </p>
                        <p className="text-xs text-primary-500">
                          @{r.username} · ক্লাস {toBnDigits(r.classLevel)}
                        </p>
                        <div className="flex flex-wrap gap-1.5 mt-1.5">
                          <Badge color="pink">
                            লেভেল {toBnDigits(r.level)}
                          </Badge>
                          <Badge color="peach">
                            🔥 {toBnDigits(r.currentStreak)}
                          </Badge>
                          {r.isInSameGroup && (
                            <Badge color="mint">✓ একই গ্রুপে</Badge>
                          )}
                        </div>
                      </div>
                      <UserPlus size={18} className="text-primary-400 shrink-0" />
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
// ============================================================
// Path: apps/web/src/app/(app)/achievements/page.tsx
// ============================================================

'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, Trophy, Star, Crown, Flame, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { api, ApiError } from '@/lib/api';
import { toBnDigits } from '@/lib/bn';
import { SectionHeader } from '@/components/dashboard/section';
import { LevelInfo } from '@/lib/types/dashboard';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';

interface BadgeItem {
  code: string;
  name: string;
  description: string;
  icon: string;
  earned: boolean;
  earnedAt: string | null;
}

interface LeaderboardItem {
  rank: number;
  id: string;
  username: string;
  fullName: string;
  avatarUrl: string | null;
  classLevel: number;
  xp: number;
  level: number;
  currentStreak: number;
  isMe: boolean;
}

interface LevelRow {
  level: number;
  xpRequired: number;
  xpForNext: number;
  xpToAdvance: number;
}

export default function AchievementsPage() {
  const [loading, setLoading] = useState(true);
  const [badges, setBadges] = useState<BadgeItem[]>([]);
  const [level, setLevel] = useState<LevelInfo | null>(null);
  const [levelTable, setLevelTable] = useState<LevelRow[]>([]);
  const [leaderboard, setLeaderboard] = useState<LeaderboardItem[]>([]);
  const [myRank, setMyRank] = useState<LeaderboardItem | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [b, l, lt, lb] = await Promise.all([
          api.get<{ success: true; data: { items: BadgeItem[]; earnedCount: number; total: number } }>(
            '/gamification/badges',
          ),
          api.get<{ success: true; data: LevelInfo }>('/gamification/level'),
          api.get<{ success: true; data: { levels: LevelRow[] } }>('/gamification/level-progress'),
          api.get<{
            success: true;
            data: { items: LeaderboardItem[]; myRank: LeaderboardItem | null };
          }>('/gamification/leaderboard?limit=20'),
        ]);
        setBadges(b.data.items);
        setLevel(l.data);
        setLevelTable(lt.data.levels);
        setLeaderboard(lb.data.items);
        setMyRank(lb.data.myRank);
      } catch (err) {
        const e = err as ApiError;
        toast.error(e.message || 'লোড করা যায়নি');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading || !level) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center gap-3">
        <motion.div
          animate={{ y: [0, -8, 0] }}
          transition={{ duration: 1.6, repeat: Infinity }}
          className="text-5xl"
        >
          🏆
        </motion.div>
        <div className="flex items-center gap-2 text-primary-500 text-sm">
          <Loader2 className="animate-spin" size={16} />
          লোড হচ্ছে...
        </div>
      </div>
    );
  }

  const earned = badges.filter((b) => b.earned);
  const locked = badges.filter((b) => !b.earned);

  const rankEmoji = (r: number) => {
    if (r === 1) return '🥇';
    if (r === 2) return '🥈';
    if (r === 3) return '🥉';
    return '';
  };

  return (
    <div className="space-y-5">
      <div className="px-1">
        <h1 className="text-2xl md:text-3xl font-bold text-primary-800">
          অর্জন 🏆
        </h1>
        <p className="text-sm text-primary-500 mt-1">
          তোমার প্রতিটা ছোট পদক্ষেপ এখানে পালিত হয় ✨
        </p>
      </div>

      {/* Level card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="card-soft p-5 relative overflow-hidden"
      >
        <div className="absolute -right-6 -top-6 text-8xl opacity-10">🏅</div>
        <div className="relative flex items-center gap-4">
          <div className="rounded-3xl gradient-primary p-5 text-white shrink-0">
            <Crown size={36} />
          </div>
          <div className="flex-1">
            <p className="text-xs text-primary-500">বর্তমান লেভেল</p>
            <p className="text-3xl font-bold text-primary-800">
              {toBnDigits(level.level)}
            </p>
            <div className="mt-2">
              <div className="flex justify-between text-xs text-primary-500 mb-1">
                <span>{toBnDigits(level.xp)} XP</span>
                <span>
                  পরের লেভেলে {toBnDigits(level.xpToNextLevel)} XP বাকি
                </span>
              </div>
              <Progress value={level.progressPercent} />
            </div>
          </div>
        </div>
      </motion.div>

      <Tabs defaultValue="badges">
        <TabsList className="grid grid-cols-3 w-full bg-lavender-100 rounded-2xl p-1">
          <TabsTrigger value="badges">ব্যাজ</TabsTrigger>
          <TabsTrigger value="leaderboard">লিডারবোর্ড</TabsTrigger>
          <TabsTrigger value="levels">লেভেল</TabsTrigger>
        </TabsList>

        {/* ============ BADGES ============ */}
        <TabsContent value="badges" className="mt-4 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="card-soft p-4 text-center">
              <Trophy size={18} className="text-primary-500 mx-auto mb-1" />
              <p className="text-xs text-primary-500">অর্জিত</p>
              <p className="text-lg font-bold text-primary-800">
                {toBnDigits(earned.length)}/{toBnDigits(badges.length)}
              </p>
            </div>
            <div className="card-soft p-4 text-center">
              <Star size={18} className="text-star mx-auto mb-1" />
              <p className="text-xs text-primary-500">মোট</p>
              <p className="text-lg font-bold text-primary-800">
                {toBnDigits(badges.length)}
              </p>
            </div>
            <div className="card-soft p-4 text-center">
              <Sparkles size={18} className="text-pink-soft-400 mx-auto mb-1" />
              <p className="text-xs text-primary-500">বাকি</p>
              <p className="text-lg font-bold text-primary-800">
                {toBnDigits(locked.length)}
              </p>
            </div>
          </div>

          {/* Earned */}
          {earned.length > 0 && (
            <div>
              <SectionHeader emoji="✨" title={`অর্জিত (${earned.length})`} />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {earned.map((b, i) => (
                  <motion.div
                    key={b.code}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                    className="card-soft p-4 text-center relative overflow-hidden"
                  >
                    <div className="absolute -right-3 -top-3 text-5xl opacity-10">⭐</div>
                    <motion.div
                      animate={{ y: [0, -4, 0] }}
                      transition={{ duration: 2, repeat: Infinity, delay: i * 0.2 }}
                      className="text-4xl mb-2"
                    >
                      {b.icon}
                    </motion.div>
                    <p className="font-bold text-primary-800 text-sm leading-tight">
                      {b.name}
                    </p>
                    <p className="text-[11px] text-primary-500 mt-1 leading-tight">
                      {b.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Locked */}
          {locked.length > 0 && (
            <div>
              <SectionHeader emoji="🔒" title={`এখনো বাকি (${locked.length})`} />
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {locked.map((b) => (
                  <div key={b.code} className="card-soft p-4 text-center opacity-60">
                    <div className="text-4xl mb-2 grayscale">{b.icon}</div>
                    <p className="font-bold text-primary-700 text-sm leading-tight">
                      {b.name}
                    </p>
                    <p className="text-[11px] text-primary-400 mt-1 leading-tight">
                      {b.description}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ============ LEADERBOARD ============ */}
        <TabsContent value="leaderboard" className="mt-4 space-y-4">
          {/* My rank highlight */}
          {myRank && (
            <motion.div
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              className="card-soft p-4 flex items-center gap-3 border-2 border-primary-300"
            >
              <div className="text-2xl font-bold text-primary-500 w-10 text-center">
                {rankEmoji(myRank.rank) || `#${toBnDigits(myRank.rank)}`}
              </div>
              <Avatar className="h-11 w-11">
                {myRank.avatarUrl && !myRank.avatarUrl.startsWith('preset:') && (
                  <AvatarImage src={myRank.avatarUrl} />
                )}
                <AvatarFallback>🐱</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-primary-800 truncate">
                  {myRank.fullName} <span className="text-xs text-primary-400">(তুমি)</span>
                </p>
                <p className="text-xs text-primary-500">ক্লাস {toBnDigits(myRank.classLevel)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-primary-700">{toBnDigits(myRank.xp)} XP</p>
                <p className="text-xs text-primary-400">লেভেল {toBnDigits(myRank.level)}</p>
              </div>
            </motion.div>
          )}

          <div className="space-y-2">
            {leaderboard.map((u, i) => (
              <motion.div
                key={u.id}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                className={`card-soft p-3 flex items-center gap-3 ${
                  u.isMe ? 'ring-2 ring-primary-300' : ''
                }`}
              >
                <div className="text-lg font-bold text-primary-500 w-8 text-center">
                  {rankEmoji(u.rank) || `#${toBnDigits(u.rank)}`}
                </div>
                <Avatar className="h-10 w-10">
                  {u.avatarUrl && !u.avatarUrl.startsWith('preset:') && (
                    <AvatarImage src={u.avatarUrl} />
                  )}
                  <AvatarFallback>
                    {u.fullName?.[0] ?? '🐱'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-primary-800 truncate text-sm">
                    {u.fullName}
                    {u.isMe && <span className="text-xs text-primary-400 ml-1">(তুমি)</span>}
                  </p>
                  <p className="text-xs text-primary-500">
                    ক্লাস {toBnDigits(u.classLevel)} · 🔥 {toBnDigits(u.currentStreak)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-bold text-primary-700 text-sm">{toBnDigits(u.xp)}</p>
                  <p className="text-[10px] text-primary-400">XP</p>
                </div>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        {/* ============ LEVELS ============ */}
        <TabsContent value="levels" className="mt-4">
          <div className="card-soft p-5">
            <SectionHeader emoji="⭐" title="লেভেল সিস্টেম" />
            <div className="space-y-2 max-h-96 overflow-y-auto pr-1">
              {levelTable.map((r) => {
                const isCurrent = r.level === level.level;
                const isPast = r.level < level.level;
                return (
                  <div
                    key={r.level}
                    className={`flex items-center gap-3 p-3 rounded-2xl transition-colors ${
                      isCurrent
                        ? 'bg-lavender-200 border-2 border-primary-300'
                        : isPast
                          ? 'bg-mint-100'
                          : 'bg-lavender-100'
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-2xl flex items-center justify-center font-bold ${
                        isCurrent
                          ? 'bg-primary-500 text-white'
                          : isPast
                            ? 'bg-mint-500 text-white'
                            : 'bg-white text-primary-500'
                      }`}
                    >
                      {toBnDigits(r.level)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-primary-800">
                        লেভেল {toBnDigits(r.level)}
                        {isCurrent && (
                          <span className="text-xs text-primary-500 ml-2">(তুমি এখানে)</span>
                        )}
                      </p>
                      <p className="text-xs text-primary-500">
                        {toBnDigits(r.xpRequired)} XP লাগবে
                      </p>
                    </div>
                    <Badge color={isPast || isCurrent ? 'mint' : 'gray'}>
                      +{toBnDigits(r.xpToAdvance)} XP
                    </Badge>
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
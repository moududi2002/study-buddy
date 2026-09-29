// ============================================================
// Path: apps/web/src/components/groups/group-card.tsx
// ============================================================

'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Users, Crown, Shield, BellOff } from 'lucide-react';
import { GroupListItem } from '@/lib/types/groups';
import { GroupAvatar } from './group-avatar';
import { Badge } from '@/components/ui/badge';
import { toBnDigits, formatMinutesShort } from '@/lib/bn';

export function GroupCard({ group, index }: { group: GroupListItem; index: number }) {
  const roleLabel =
    group.role === 'OWNER' ? 'মালিক' : group.role === 'ADMIN' ? 'অ্যাডমিন' : 'সদস্য';
  const roleIcon = group.role === 'OWNER' ? Crown : group.role === 'ADMIN' ? Shield : Users;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      <Link href={`/groups/${group.id}`}>
        <div className="card-soft card-soft-hover p-4 flex items-center gap-3">
          <GroupAvatar name={group.name} imageUrl={group.imageUrl} size={56} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-primary-800 truncate flex items-center gap-1.5">
              {group.name}
              {group.isMuted && <BellOff size={14} className="text-primary-400" />}
            </p>
            {group.description && (
              <p className="text-xs text-primary-500 truncate mt-0.5">{group.description}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5 flex-wrap">
              <Badge color="primary">
                <Users size={10} />
                {toBnDigits(group.memberCount)} জন
              </Badge>
              <Badge color="pink">
                {roleIcon === Crown ? '👑' : roleIcon === Shield ? '🛡️' : '👤'} {roleLabel}
              </Badge>
              {group.weeklyTargetMinutes && (
                <Badge color="peach">
                  🎯 {toBnDigits(Math.round(group.weeklyTargetMinutes / 60))} ঘণ্টা/সপ্তাহ
                </Badge>
              )}
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
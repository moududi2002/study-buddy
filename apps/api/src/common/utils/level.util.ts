// ============================================================
// Path: apps/api/src/common/utils/level.util.ts
// ============================================================

// XP needed to reach level N = 100 * N * (N-1) / 2 ... simplified curve
// L1 -> 0, L2 -> 100, L3 -> 250, L4 -> 450, L5 -> 700, ...
export class LevelUtil {
  static xpForLevel(level: number): number {
    if (level <= 1) return 0;
    return 50 * (level - 1) * level;
  }

  static levelFromXp(xp: number): number {
    let level = 1;
    while (this.xpForLevel(level + 1) <= xp) level++;
    return level;
  }

  static xpToNextLevel(xp: number): { current: number; next: number; remaining: number } {
    const level = this.levelFromXp(xp);
    const current = this.xpForLevel(level);
    const next = this.xpForLevel(level + 1);
    return { current, next, remaining: next - xp };
  }

  // XP rules
  static xpForStudyMinutes(minutes: number): number {
    // 1 XP per 5 minutes, minimum 5 XP per entry
    return Math.max(5, Math.floor(minutes / 5));
  }

  static xpForStreakDay(streak: number): number {
    // Bonus XP for longer streaks (capped)
    return Math.min(50, 5 + streak * 2);
  }

  static xpForBadge(): number {
    return 25;
  }
}
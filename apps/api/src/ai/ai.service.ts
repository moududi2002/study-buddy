// ============================================================
// Path: apps/api/src/ai/ai.service.ts
// ============================================================

import { Injectable, Logger } from '@nestjs/common';
import { AnalyticsService } from '../analytics/analytics.service';
import { DateUtil } from '../common/utils';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { GeminiClient } from './gemini.client';

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly gemini: GeminiClient,
    private readonly analytics: AnalyticsService,
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  // ----------------------------------------------------------
  // Persona for all prompts
  // ----------------------------------------------------------
  private get systemPersona(): string {
    return [
      'তুমি "Study Buddy" অ্যাপের একজন বন্ধুসুলভ শিক্ষা-সহকারী।',
      'তোমার কথা বলার ধরন হবে আন্তরিক, উৎসাহমূলক, এবং সহজ সাবলীল বাংলায়।',
      'তুমি মাধ্যমিক পর্যায়ের (৬ষ্ঠ-১০ম শ্রেণি) শিক্ষার্থীদের সাথে কথা বলছো।',
      'তুমি সব সময় শিক্ষার্থীকে সম্বোধন করবে "তুমি" বলে।',
      'সংখ্যা, সময়, বিষয় ইত্যাদি উল্লেখ করার সময় বাংলায় লিখবে (যেমন "২ ঘণ্টা", "৫ দিন")।',
      'সংক্ষিপ্ত রাখবে — ৩-৫ বাক্যের বেশি না, যদি না explicitly বেশি চাওয়া হয়।',
      'প্রতিটি paragraph এ কমপক্ষে একটি emoji ব্যবহার করবে (🌟 💜 🐱 📚 🔥 ইত্যাদি)।',
      'কখনো কঠিন শব্দ ব্যবহার করবে না — সহজ বাংলায় লিখবে।',
      'কখনো শিক্ষার্থীকে বকা দেবে না — সবসময় ইতিবাচক ও উৎসাহমূলক থাকবে।',
    ].join(' ');
  }

  // ----------------------------------------------------------
  // WEEKLY INSIGHT
  // ----------------------------------------------------------
  async weeklyInsight(userId: string, forceRefresh = false) {
    const today = DateUtil.toDateOnly(new Date());
    const { start } = DateUtil.getWeekRange(today);
    const cacheKey = `ai:weekly:${userId}:${DateUtil.toISODate(start)}`;

    if (!forceRefresh) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return { data: JSON.parse(cached), source: 'cache' };
    }

    const weekly = await this.analytics.weekly(userId);
    const w = weekly.data;

    // Fallback prompt if data is empty
    let insight: string | null = null;

    if (w.totalMinutes === 0) {
      insight = 'এই সপ্তাহে এখনো পড়াশোনা শুরু হয়নি। আজই ছোট করে হলেও শুরু করো — স্ট্রিক গড়ে উঠবে! 🐱';
    } else {
      const prompt = this.buildWeeklyPrompt(w);
      insight = await this.gemini.generate(prompt, this.systemPersona);
    }

    // Fallback if AI not available
    const source = insight ? 'ai' : 'rule-based';
    if (!insight) {
      insight = w.suggestions.join(' ');
    }

    const payload = {
      weekStart: w.weekStart,
      weekEnd: w.weekEnd,
      insight,
      source,
      stats: {
        totalMinutes: w.totalMinutes,
        daysStudied: w.daysStudied,
        avgPerDay: w.avgPerDay,
        topSubject: w.topSubject,
        leastSubject: w.leastSubject,
      },
    };

    // Cache for 30 min (AI calls are costly)
    await this.redis.set(cacheKey, JSON.stringify(payload), 1800);

    return { data: payload, source };
  }

  // ----------------------------------------------------------
  // MONTHLY ANALYSIS
  // ----------------------------------------------------------
  async monthlyAnalysis(userId: string, forceRefresh = false) {
    const today = DateUtil.toDateOnly(new Date());
    const { start } = DateUtil.getMonthRange(today);
    const cacheKey = `ai:monthly:${userId}:${DateUtil.toISODate(start)}`;

    if (!forceRefresh) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return { data: JSON.parse(cached), source: 'cache' };
    }

    const monthly = await this.analytics.monthly(userId);
    const m = monthly.data;

    let analysis: string | null = null;

    if (m.totalMinutes === 0) {
      analysis = 'এই মাসে এখনো পড়াশোনা হয়নি। নতুন মাসে নতুন উদ্যমে শুরু করি! 🚀';
    } else {
      const prompt = this.buildMonthlyPrompt(m);
      analysis = await this.gemini.generate(prompt, this.systemPersona);
    }

    const source = analysis ? 'ai' : 'rule-based';
    if (!analysis) {
      analysis = m.suggestions.join(' ');
    }

    const payload = {
      monthStart: m.monthStart,
      monthEnd: m.monthEnd,
      analysis,
      source,
      stats: {
        totalMinutes: m.totalMinutes,
        growthPercent: m.growthPercent,
        consistencyPercent: m.consistencyPercent,
        distinctDays: m.distinctDays,
        daysInMonth: m.daysInMonth,
        subjectBreakdown: m.subjectBreakdown,
        streak: m.streak,
        level: m.level,
        xp: m.xp,
        badgesEarnedThisMonth: m.badgesEarnedThisMonth,
      },
    };

    await this.redis.set(cacheKey, JSON.stringify(payload), 3600);

    return { data: payload, source };
  }

  // ----------------------------------------------------------
  // PERSONALIZED STUDY PLAN (next 7 days)
  // ----------------------------------------------------------
  async studyPlan(userId: string, forceRefresh = false) {
    const today = DateUtil.toDateOnly(new Date());
    const { start } = DateUtil.getWeekRange(today);
    const cacheKey = `ai:plan:${userId}:${DateUtil.toISODate(start)}`;

    if (!forceRefresh) {
      const cached = await this.redis.get(cacheKey);
      if (cached) return { data: JSON.parse(cached), source: 'cache' };
    }

    const weekly = (await this.analytics.weekly(userId)).data;
    const subjects = await this.prisma.subject.findMany({
      where: { userId },
      select: { name: true, icon: true },
    });

    const prompt = this.buildPlanPrompt(weekly, subjects);
    let plan = await this.gemini.generate(prompt, this.systemPersona);

    const source = plan ? 'ai' : 'rule-based';
    if (!plan) {
      plan = this.buildFallbackPlan(weekly, subjects);
    }

    const payload = {
      weekStart: DateUtil.toISODate(start),
      plan,
      source,
      subjects: subjects.map((s) => `${s.icon} ${s.name}`),
    };

    await this.redis.set(cacheKey, JSON.stringify(payload), 3600);
    return { data: payload, source };
  }

  // ----------------------------------------------------------
  // EXAM PREP SUGGESTION
  // ----------------------------------------------------------
  async examPrep(userId: string, examSubject?: string, daysUntilExam?: number) {
    const today = DateUtil.toDateOnly(new Date());
    const cacheKey = `ai:exam:${userId}:${examSubject ?? 'all'}:${daysUntilExam ?? 14}`;

    const cached = await this.redis.get(cacheKey);
    if (cached) return { data: JSON.parse(cached), source: 'cache' };

    const monthly = (await this.analytics.monthly(userId)).data;
    const subjectFocus =
      examSubject ??
      monthly.subjectBreakdown[monthly.subjectBreakdown.length - 1]?.name ??
      'সব বিষয়';

    const prompt = this.buildExamPrompt(
      subjectFocus,
      daysUntilExam ?? 14,
      monthly,
    );

    let suggestion = await this.gemini.generate(prompt, this.systemPersona);
    const source = suggestion ? 'ai' : 'rule-based';

    if (!suggestion) {
      suggestion = this.buildFallbackExam(subjectFocus, daysUntilExam ?? 14);
    }

    const payload = {
      subject: subjectFocus,
      daysUntilExam: daysUntilExam ?? 14,
      suggestion,
      source,
    };

    await this.redis.set(cacheKey, JSON.stringify(payload), 1800);
    return { data: payload, source };
  }

  // ----------------------------------------------------------
  // PROMPT BUILDERS
  // ----------------------------------------------------------
  private buildWeeklyPrompt(w: any): string {
    const topStr = w.topSubject
      ? `${w.topSubject.name} (${Math.round(w.topSubject.minutes / 60)} ঘণ্টা)`
      : 'এখনো কোনো বিষয়';
    const leastStr = w.leastSubject
      ? `${w.leastSubject.name} (${Math.round(w.leastSubject.minutes / 60)} ঘণ্টা)`
      : 'শুধু একটি বিষয় হয়েছে';
    const bestDayStr = w.bestDay
      ? `${w.bestDay.dayLabel} (${w.bestDay.minutes} মিনিট)`
      : 'এখনো কোনো দিন';

    return [
      `এই সপ্তাহের পড়াশোনার তথ্য:`,
      `- মোট সময়: ${w.totalMinutes} মিনিট (${Math.round(w.totalMinutes / 60)} ঘণ্টা)`,
      `- পড়া দিন: ${w.daysStudied} দিন`,
      `- সবচেয়ে বেশি পড়া বিষয়: ${topStr}`,
      `- সবচেয়ে কম পড়া বিষয়: ${leastStr}`,
      `- সবচেয়ে ভালো দিন: ${bestDayStr}`,
      ``,
      `উপরের তথ্য দেখে ৩-৪ বাক্যের একটি উৎসাহমূলক insight দাও।`,
      `শিক্ষার্থীকে প্রশংসা করো যেটা ভালো করেছে, এবং যেটা কম হয়েছে সেটা সুন্দরভাবে বুঝিয়ে দাও।`,
      `কোনো শিরোনাম দিও না, শুধু paragraph আকারে লিখো।`,
    ].join('\n');
  }

  private buildMonthlyPrompt(m: any): string {
    const top = m.subjectBreakdown[0];
    const least = m.subjectBreakdown[m.subjectBreakdown.length - 1];

    return [
      `এই মাসের পড়াশোনার তথ্য:`,
      `- মোট সময়: ${m.totalMinutes} মিনিট (${Math.round(m.totalMinutes / 60)} ঘণ্টা)`,
      `- পড়া দিন: ${m.distinctDays} / ${m.daysInMonth} দিন (${m.consistencyPercent}%)`,
      `- গত মাসের তুলনায় পরিবর্তন: ${m.growthPercent > 0 ? '+' : ''}${m.growthPercent}%`,
      `- সবচেয়ে বেশি: ${top?.name ?? 'শুধু একটি বিষয়'} (${Math.round((top?.minutes ?? 0) / 60)} ঘণ্টা)`,
      `- সবচেয়ে কম: ${least?.name ?? 'তথ্য নেই'} (${Math.round((least?.minutes ?? 0) / 60)} ঘণ্টা)`,
      `- সর্বোচ্চ স্ট্রিক: ${m.streak.longest} দিন`,
      `- বর্তমান লেভেল: ${m.level} (XP: ${m.xp})`,
      ``,
      `উপরের তথ্য বিশ্লেষণ করে ৪-৫ বাক্যের একটি সহজ বাংলা রিপোর্ট দাও।`,
      `শিক্ষার্থীর উন্নতি, দুর্বলতা এবং আগামী মাসে কী করলে আরও ভালো হবে — এগুলো উৎসাহমূলক ভাষায় বলো।`,
      `"মনে রাখো, সাফল্য আসে ধীরে ধীরে — তুমি ঠিক পথেই আছো" ধরনের সমর্থনমূলক কথা বলো।`,
      `কোনো শিরোনাম, bullet, markdown দিও না — শুধু plain paragraph।`,
    ].join('\n');
  }

  private buildPlanPrompt(w: any, subjects: Array<{ name: string; icon: string }>): string {
    const subjList = subjects.map((s) => `${s.icon} ${s.name}`).join(', ');
    const least = w.leastSubject?.name ?? 'শুধু একটি বিষয়';

    return [
      `শিক্ষার্থীর বিষয়সমূহ: ${subjList}`,
      ``,
      `এই সপ্তাহে যেসব বিষয়ে কম সময় দিয়েছে: ${least}`,
      `সাপ্তাহিক মোট সময়: ${w.totalMinutes} মিনিট`,
      ``,
      `আগামী ৭ দিনের জন্য একটি সহজ, কার্যকর পড়ার প্ল্যান দাও।`,
      `প্রতিদিনের জন্য কী পড়বে এবং কত মিনিট দিবে — এভাবে বলো।`,
      `কম পড়া বিষয়ের জন্য একটু বেশি সময় বরাদ্দ করো।`,
      `সহজ বাংলায় লেখো, শিক্ষার্থী যেন সহজে বুঝতে পারে।`,
      `সর্বোচ্চ ৬-৭ বাক্যে শেষ করো।`,
    ].join('\n');
  }

  private buildExamPrompt(subject: string, days: number, monthly: any): string {
    const recentMinutes = monthly.totalMinutes;
    return [
      `পরীক্ষার প্রস্তুতি:`,
      `- বিষয়: ${subject}`,
      `- পরীক্ষা পর্যন্ত: ${days} দিন`,
      `- এই মাসে মোট পড়া: ${recentMinutes} মিনিট`,
      ``,
      `শিক্ষার্থীকে ${days} দিনে ${subject} পরীক্ষার জন্য একটি সহজ প্রস্তুতি সাজেশন দাও।`,
      `দৈনিক কী করবে, কী রিভিশন দিবে — সংক্ষেপে বলো।`,
      `শিক্ষার্থীকে আত্মবিশ্বাস দাও, ভয় দেখাবে না।`,
      `সর্বোচ্চ ৪-৫ বাক্যে শেষ করো।`,
    ].join('\n');
  }

  // ----------------------------------------------------------
  // FALLBACK BUILDERS (Bengali, rule-based)
  // ----------------------------------------------------------
  private buildFallbackPlan(
    w: any,
    subjects: Array<{ name: string; icon: string }>,
  ): string {
    const least = w.leastSubject?.name ?? subjects[0]?.name ?? 'সব বিষয়';
    return [
      `প্রতিদিন অন্তত ২ ঘণ্টা পড়ার চেষ্টা করো।`,
      `${least}-এ এই সপ্তাহে কম সময় দিয়েছো, তাই প্রতিদিন ৩০ মিনিট ${least} পড়ো।`,
      `বাকি সময় অন্য বিষয়গুলো পালা করে পড়ো।`,
      `প্রতিদিন একই সময়ে পড়ার অভ্যাস করলে স্ট্রিক বজায় থাকবে। 🔥`,
    ].join(' ');
  }

  private buildFallbackExam(subject: string, days: number): string {
    return [
      `${days} দিনে ${subject} পরীক্ষার প্রস্তুতির জন্য প্রতিদিন অন্তত ১ ঘণ্টা পড়ো।`,
      `প্রথমে দুর্বল অধ্যায়গুলো রিভিশন দাও, তারপর পুরোনো প্রশ্ন সমাধান করো।`,
      `প্রতিদিনের পড়া রাতে একবার রিভিশন করো।`,
      `তুমি পারবে — নিজের উপর বিশ্বাস রাখো! 💜`,
    ].join(' ');
  }
}
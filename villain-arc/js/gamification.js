// ============================================================
// VILLAIN ARC — Gamification: XP, Level, Streak, Achievements
// ============================================================

const Gamification = {
  getRankForLevel(level) {
    return RANKS.find((r) => r.level === level) || RANKS[0];
  },

  getRankForXP(xp) {
    let current = RANKS[0];
    for (const r of RANKS) {
      if (xp >= r.xpRequired) current = r;
    }
    return current;
  },

  getNextRank(currentLevel) {
    return RANKS.find((r) => r.level === currentLevel + 1) || null;
  },

  /**
   * Award XP, resolve level-ups, return a result descriptor for UI.
   */
  awardXP(amount, reason = "") {
    const newTotal = AppData.addXP(amount);
    const oldLevel = AppData.getLevel();
    const newRank = this.getRankForXP(newTotal);
    let leveledUp = false;
    if (newRank.level > oldLevel) {
      AppData.setLevel(newRank.level);
      leveledUp = true;
    }
    return { amount, reason, newTotal, leveledUp, rank: newRank };
  },

  xpProgress(xp) {
    const rank = this.getRankForXP(xp);
    const next = this.getNextRank(rank.level);
    if (!next) {
      return { current: xp, needed: xp, pct: 100, rank, next: null };
    }
    const span = next.xpRequired - rank.xpRequired;
    const into = xp - rank.xpRequired;
    const pct = Math.min(100, Math.round((into / span) * 100));
    return { current: xp, needed: next.xpRequired, pct, rank, next };
  },

  dateKey(d = new Date()) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  },

  dayKeyFromDate(d) {
    return DAY_KEYS[d.getDay()];
  },

  isWorkoutDay(dayKey, schedule) {
    return schedule[dayKey] && schedule[dayKey].type !== "REST";
  },

  /**
   * Recompute streak: count backward from yesterday/today through
   * consecutive workout days that were completed, skipping rest days.
   */
  async recomputeStreak() {
    const schedule = AppData.getSchedule();
    const logs = await WorkoutLogs.all();
    const logMap = {};
    logs.forEach((l) => { logMap[l.date] = l; });

    let streak = 0;
    let cursor = new Date();
    // walk backward day by day
    for (let i = 0; i < 3650; i++) {
      const dKey = this.dayKeyFromDate(cursor);
      const dateStr = this.dateKey(cursor);
      const isToday = i === 0;
      if (this.isWorkoutDay(dKey, schedule)) {
        const log = logMap[dateStr];
        const completed = log && log.allCompleted;
        if (completed) {
          streak++;
        } else if (isToday) {
          // today not done yet — doesn't break streak, just not counted yet
        } else {
          break;
        }
      }
      cursor.setDate(cursor.getDate() - 1);
    }
    AppData.setStreak(streak);
    if (streak > AppData.getLongestStreak()) {
      AppData.setLongestStreak(streak);
    }
    return streak;
  },

  async checkAchievements(context = {}) {
    const unlocked = [];
    const streak = AppData.getStreak();
    const logs = await WorkoutLogs.all();
    const completedLogs = logs.filter((l) => l.allCompleted);

    const tryUnlock = (id) => {
      if (AppData.unlockAchievement(id)) unlocked.push(id);
    };

    if (completedLogs.length >= 1) tryUnlock("first-blood");
    if (streak >= 7) tryUnlock("7-day-siege");
    if (streak >= 14) tryUnlock("zero-excuses");
    if (streak >= 30) tryUnlock("30-day-war");
    if (streak >= 60) tryUnlock("iron-will");
    if (streak >= 100) tryUnlock("unbreakable");

    if (AppData.getHeartbreakCompletedCount() >= 10) tryUnlock("heartbreak-alchemist");
    if (AppData.getDawnWarriorCount() >= 20) tryUnlock("dawn-warrior");
    if (AppData.getEarlyRiserCount() >= 50) tryUnlock("5am-club");
    if (AppData.getTotalPushupReps() >= 1000) tryUnlock("rep-machine");

    const pullCoreCount = completedLogs.filter((l) => l.dayType === "PULL_CORE").length;
    if (pullCoreCount >= 20) tryUnlock("v-taper-initiate");
    const legDayCount = completedLogs.filter((l) => l.dayType === "LEGS").length;
    if (legDayCount >= 15) tryUnlock("leg-day-loyalist");

    // "Push-up 100 reps (kumulatif dalam 1 sesi failure)" — dicek dari total
    // semua SET dalam satu sesi hari itu, bukan harus jadi PR baru dulu.
    if (context.pushupSessionTotal >= 100) tryUnlock("century-club");
    if (context.painConverterSelfReport) tryUnlock("pain-converter");
    if (context.kaiReady) tryUnlock("kai-ready");

    if (await this.hasFullMonthCleared()) tryUnlock("silent-grinder");
    if (await this.hasReachedWeightTarget()) tryUnlock("the-transformation");

    if (AppData.getPmoStreak() >= 30) tryUnlock("no-fap-warrior");

    const rank = this.getRankForXP(AppData.getXP());
    if (rank.level >= 11) tryUnlock("shadow-monarch");

    const allOtherIds = ACHIEVEMENTS.filter((a) => a.id !== "villain-complete").map((a) => a.id);
    const have = AppData.getAchievements().map((a) => a.id);
    if (allOtherIds.every((id) => have.includes(id))) tryUnlock("villain-complete");

    // Award XP for newly unlocked achievements
    unlocked.forEach(() => this.awardXP(XP_RULES.ACHIEVEMENT_UNLOCK, "Achievement Unlocked"));

    return unlocked;
  },

  checkStreakMilestone(streak) {
    return STREAK_MILESTONES.includes(streak);
  },

  /**
   * "silent-grinder" — selesaikan workout di SEMUA hari latihan dalam 1 bulan
   * penuh. Dicek terhadap bulan kalender SEBELUMNYA (bulan yang sudah selesai
   * total), supaya tidak ada positif-palsu di pertengahan bulan berjalan.
   */
  async hasFullMonthCleared() {
    const schedule = AppData.getSchedule();
    const logs = await WorkoutLogs.all();
    const logMap = {};
    logs.forEach((l) => { logMap[l.date] = l; });

    const now = new Date();
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const m = now.getMonth() === 0 ? 11 : now.getMonth() - 1;
    const daysInMonth = new Date(y, m + 1, 0).getDate();

    let hasWorkoutDay = false;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const dKey = this.dayKeyFromDate(date);
      if (!this.isWorkoutDay(dKey, schedule)) continue;
      hasWorkoutDay = true;
      const log = logMap[this.dateKey(date)];
      if (!log || !log.allCompleted) return false;
    }
    return hasWorkoutDay;
  },

  /**
   * "the-transformation" — mencapai target berat badan bulking. Dibandingkan
   * dari entri Body Stats paling baru terhadap target di Command Center.
   */
  async hasReachedWeightTarget() {
    const targets = AppData.getTargets();
    if (!targets.weight_kg) return false;
    const stats = await BodyStats.all();
    if (!stats.length) return false;
    const latest = stats.slice().sort((a, b) => b.date.localeCompare(a.date))[0];
    return latest.weight_kg != null && latest.weight_kg >= targets.weight_kg;
  },

  updatePersonalRecord(exerciseId, exerciseName, value) {
    const records = AppData.getPersonalRecords();
    const existing = records[exerciseId];
    if (!existing || value > existing.value) {
      records[exerciseId] = {
        name: exerciseName,
        value,
        date: new Date().toISOString()
      };
      AppData.setPersonalRecords(records);
      return true;
    }
    return false;
  }
};

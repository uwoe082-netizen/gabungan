// ============================================================
// VILLAIN ARC — App controller, routing, page rendering
// ============================================================

const App = {
  state: {
    onboardingStep: 1,
    onboardingData: { codename: "", weight_kg: "", pushup_target: "", situp_target: "" },
    activeTimerExercise: null,
    restTimerActive: false
  },

  async init() {
    UI.initEmberCanvas();
    await Notifications.registerServiceWorker();

    if (!AppData.isOnboarded()) {
      this.route("onboarding");
    } else {
      await Gamification.recomputeStreak();
      this.route(location.hash.replace("#/", "") || "dashboard");
      const reminder = Notifications.checkFallbackReminder();
      if (reminder) {
        setTimeout(() => UI.toast(reminder.body, 4000), 600);
      }
    }

    window.addEventListener("hashchange", () => {
      const r = location.hash.replace("#/", "") || "dashboard";
      if (AppData.isOnboarded() || r === "onboarding") this.route(r);
    });

    document.addEventListener("click", (e) => this.handleClick(e));
    document.addEventListener("change", (e) => this.handleChange(e));
  },

  route(name) {
    if (name.startsWith("onboarding")) {
      this.renderOnboarding();
      return;
    }
    this.renderShell(name);
    switch (name) {
      case "dashboard": this.renderDashboard(); break;
      case "progress": this.renderProgress(); break;
      case "achievements": this.renderAchievements(); break;
      case "settings": this.renderSettings(); break;
      default: this.renderDashboard();
    }
  },

  root() { return document.getElementById("app"); },

  // ============================================================
  // SHELL (topbar + bottom nav wrap every main page)
  // ============================================================
  renderShell(active) {
    const streak = AppData.getStreak();
    this.root().innerHTML = `
      <header class="topbar">
        <div class="logo">VILLAIN ARC</div>
        <div class="topbar-actions">
          <div class="streak-badge">🔥 <span>${streak}</span></div>
          <a href="#/settings" class="icon-btn" aria-label="Settings">⚙️</a>
        </div>
      </header>
      <main id="page-content" class="page page-transition"></main>
      <nav class="bottom-nav">
        <a href="#/dashboard" class="nav-tab ${active === "dashboard" ? "is-active" : ""}">
          <span class="nav-tab-icon">🏠</span><span class="nav-tab-label">War Room</span>
        </a>
        <a href="#/progress" class="nav-tab ${active === "progress" ? "is-active" : ""}">
          <span class="nav-tab-icon">📊</span><span class="nav-tab-label">War Journal</span>
        </a>
        <a href="#/achievements" class="nav-tab ${active === "achievements" ? "is-active" : ""}">
          <span class="nav-tab-icon">🏆</span><span class="nav-tab-label">Hall of Shadows</span>
        </a>
        <a href="#/settings" class="nav-tab ${active === "settings" ? "is-active" : ""}">
          <span class="nav-tab-icon">⚙️</span><span class="nav-tab-label">Command Center</span>
        </a>
      </nav>
    `;
  },

  pageEl() { return document.getElementById("page-content"); },

  // ============================================================
  // ONBOARDING
  // ============================================================
  renderOnboarding() {
    const step = this.state.onboardingStep;
    const dots = Array.from({ length: 5 }, (_, i) =>
      `<div class="onboarding-progress-dot ${i < step ? "is-active" : ""}"></div>`).join("");

    let body = "";
    if (step === 1) {
      body = `
        <div class="onboarding-eyebrow">VILLAIN ARC</div>
        <h1 class="onboarding-title">Selamat datang di sisi gelapmu.</h1>
        <p class="onboarding-subtitle">Ini bukan fitness app. Ini mesin transformasi.</p>
        <div class="onboarding-actions">
          <button class="btn btn-primary" data-action="onboard-next">MULAI →</button>
        </div>`;
    } else if (step === 2) {
      body = `
        <h1 class="onboarding-title">Pilih codename-mu, pejuang.</h1>
        <div class="field mt-lg">
          <input class="field-input" id="ob-codename" placeholder="SHADOW" value="${UI.escapeHtml(this.state.onboardingData.codename)}" maxlength="20" />
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-primary" data-action="onboard-next">LANJUT →</button>
        </div>`;
    } else if (step === 3) {
      body = `
        <h1 class="onboarding-title">Kunci targetmu.</h1>
        <div class="field mt-lg">
          <label class="field-label">Target berat badan (kg)</label>
          <input class="field-input" id="ob-weight" type="number" inputmode="decimal" placeholder="70" value="${UI.escapeHtml(this.state.onboardingData.weight_kg)}" />
        </div>
        <div class="field">
          <label class="field-label">Target push-up per menit (KAI)</label>
          <input class="field-input" id="ob-pushup" type="number" inputmode="numeric" placeholder="40" value="${UI.escapeHtml(this.state.onboardingData.pushup_target)}" />
        </div>
        <div class="field">
          <label class="field-label">Target sit-up per menit (KAI)</label>
          <input class="field-input" id="ob-situp" type="number" inputmode="numeric" placeholder="40" value="${UI.escapeHtml(this.state.onboardingData.situp_target)}" />
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-primary" data-action="onboard-next">KUNCI TARGET →</button>
        </div>`;
    } else if (step === 4) {
      const perm = Notifications.permissionState();
      body = `
        <h1 class="onboarding-title">Izinkan aku membangunkanmu jam 5 pagi setiap hari.</h1>
        <p class="onboarding-subtitle">Notifikasi memastikan kamu tidak pernah lupa misi harianmu.</p>
        <div class="onboarding-actions flex-col gap-md">
          <button class="btn btn-primary" data-action="onboard-notify">IZINKAN NOTIFIKASI</button>
          <button class="btn btn-ghost" data-action="onboard-next">Nanti saja</button>
        </div>`;
    } else if (step === 5) {
      body = `
        <h1 class="onboarding-title">Arc-mu dimulai sekarang. Tidak ada jalan kembali.</h1>
        <div class="rank-reveal">
          <div class="rank-reveal-xp">0 XP</div>
          <div class="rank-reveal-name">BROKEN SOUL — LEVEL 1</div>
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-primary" data-action="onboard-finish">MASUK KE MARKAS ⚔️</button>
        </div>`;
    }

    this.root().innerHTML = `
      <div class="onboarding-screen page-transition">
        <div class="onboarding-progress">${dots}</div>
        ${body}
      </div>`;
  },

  onboardNext() {
    const step = this.state.onboardingStep;
    if (step === 2) {
      const val = document.getElementById("ob-codename")?.value.trim();
      this.state.onboardingData.codename = val || "SHADOW";
    } else if (step === 3) {
      this.state.onboardingData.weight_kg = document.getElementById("ob-weight")?.value || "";
      this.state.onboardingData.pushup_target = document.getElementById("ob-pushup")?.value || "";
      this.state.onboardingData.situp_target = document.getElementById("ob-situp")?.value || "";
    }
    this.state.onboardingStep = Math.min(5, step + 1);
    this.renderOnboarding();
  },

  async onboardNotify() {
    await Notifications.requestPermission();
    this.onboardNext();
  },

  onboardFinish() {
    const d = this.state.onboardingData;
    AppData.setCodename(d.codename || "SHADOW");
    AppData.setTargets({
      weight_kg: d.weight_kg ? Number(d.weight_kg) : null,
      pushup_target: d.pushup_target ? Number(d.pushup_target) : DEFAULT_TARGETS.pushup_target,
      situp_target: d.situp_target ? Number(d.situp_target) : DEFAULT_TARGETS.situp_target
    });
    AppData.setXP(0);
    AppData.setLevel(1);
    AppData.setStreak(0);
    AppData.setSettings(DEFAULT_SETTINGS);
    AppData.setOnboarded(true);
    location.hash = "#/dashboard";
    this.route("dashboard");
  },

  // ============================================================
  // DASHBOARD ("War Room")
  // ============================================================
  async renderDashboard() {
    const codename = AppData.getCodename();
    const schedule = AppData.getSchedule();
    const now = new Date();
    const hour = now.getHours();
    const dayKey = Gamification.dayKeyFromDate(now);
    const day = schedule[dayKey];
    const dateStr = this.formatDateID(now);

    let greeting;
    if (hour >= 4 && hour < 6) greeting = `Bangun, ${codename}. Mereka tidur. Kamu tidak.`;
    else if (hour >= 6 && hour < 12) greeting = "Misi pagi selesai? Buktikan.";
    else if (hour >= 12 && hour < 18) greeting = "Hari belum selesai. Tetap tajam.";
    else greeting = "Istirahat adalah bagian dari strategi.";

    const quote = QuoteEngine.getTodayQuote();
    const xp = AppData.getXP();
    const progress = Gamification.xpProgress(xp);
    const todayKey = Gamification.dateKey(now);
    const log = await WorkoutLogs.getByDate(todayKey);
    const checkedIds = new Set((log?.exercises || []).filter((e) => e.completed).map((e) => e.id));

    const badgeClassMap = { push: "push", pull: "pull", legs: "legs", rest: "rest", heartbreak: "heartbreak" };
    const dayBadgeClass = `day-badge--${badgeClassMap[day.color] || "rest"}`;

    let mainSection;
    if (day.type === "REST") {
      const nextWorkoutDays = this.daysUntilNextWorkout(schedule);
      mainSection = `
        <div class="card rest-day-card">
          <div class="rest-day-icon">⚫</div>
          <div class="heading-m">Bahkan mesin perang butuh maintenance.</div>
          <p class="text-body mt-sm">Otot tumbuh saat istirahat.</p>
          <div class="rest-checklist">
            <div class="rest-checklist-item">✓ Makan cukup protein</div>
            <div class="rest-checklist-item">✓ Minum air yang cukup</div>
            <div class="rest-checklist-item">✓ Tidur cukup (7-8 jam)</div>
          </div>
          <div class="countdown-next">Misi berikutnya dalam ${nextWorkoutDays} hari</div>
        </div>`;
    } else {
      const exercisesHTML = day.exercises.map((ex) => {
        const done = checkedIds.has(ex.id);
        return `
        <div class="checklist-item ${done ? "is-complete" : ""}" data-exercise-id="${ex.id}">
          <button class="checkbox-diamond" data-action="toggle-exercise" data-id="${ex.id}" aria-label="Tandai ${UI.escapeHtml(ex.name)}">
            <svg viewBox="0 0 24 24" fill="none" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
          <div class="exercise-info">
            <div class="exercise-name">${UI.escapeHtml(ex.name)}${ex.hasTimer ? " ⏱️" : ""}</div>
            <div class="exercise-target">${UI.escapeHtml(ex.target)} · ${ex.sets} set</div>
            <span class="exercise-muscle-badge">${UI.escapeHtml(ex.muscleGroup)}</span>
          </div>
        </div>`;
      }).join("");

      mainSection = `
        <div class="flex-between mb-md">
          <h2 class="heading-m">Checklist Hari Ini</h2>
          <span class="text-caption">${checkedIds.size}/${day.exercises.length}</span>
        </div>
        <div id="checklist-container">${exercisesHTML}</div>`;
    }

    this.pageEl().innerHTML = `
      <section class="hero-section">
        <div class="hero-date">${dateStr}</div>
        <div class="hero-greeting">${greeting}</div>
        <span class="day-badge ${dayBadgeClass}">${day.emoji} ${day.label}</span>
      </section>

      <div class="quote-card">
        <div class="quote-card-inner">
          <div class="quote-icon">${day.type === "HEARTBREAK" ? "💀" : "⚡"}</div>
          <div>
            <div class="quote-text">"${UI.escapeHtml(quote)}"</div>
            <button class="quote-refresh" data-action="next-quote">Next Quote →</button>
          </div>
        </div>
      </div>

      ${mainSection}

      <div class="stats-scroll mt-lg">
        <div class="stat-chip">
          <div class="stat-chip-label">🔥 Streak</div>
          <div class="stat-chip-value">${AppData.getStreak()} Hari</div>
        </div>
        <div class="stat-chip">
          <div class="stat-chip-label">⚔️ Level</div>
          <div class="stat-chip-value">LVL ${progress.rank.level}</div>
        </div>
        <div class="stat-chip">
          <div class="stat-chip-label">📊 Total XP</div>
          <div class="stat-chip-value">${UI.formatNumber(xp)}</div>
        </div>
        <div class="stat-chip">
          <div class="stat-chip-label">💪 Bulan Ini</div>
          <div class="stat-chip-value">${await this.completedThisMonthLabel()}</div>
        </div>
      </div>

      <div class="mt-lg">
        <div class="xp-bar-track"><div class="xp-bar-fill" style="width:${progress.pct}%"></div></div>
        <div class="xp-bar-label">
          <span>${UI.formatNumber(progress.current)} / ${UI.formatNumber(progress.needed)} XP</span>
          <span>${progress.next ? "ke " + progress.next.name.toUpperCase() : "MAX"}</span>
        </div>
      </div>
    `;
  },

  async completedThisMonthLabel() {
    const now = new Date();
    const schedule = AppData.getSchedule();
    const logs = await WorkoutLogs.all();
    const y = now.getFullYear(), m = now.getMonth();
    let workoutDaysSoFar = 0, completed = 0;
    for (let d = 1; d <= now.getDate(); d++) {
      const date = new Date(y, m, d);
      const dKey = Gamification.dayKeyFromDate(date);
      if (schedule[dKey].type !== "REST") {
        workoutDaysSoFar++;
        const log = logs.find((l) => l.date === Gamification.dateKey(date));
        if (log && log.allCompleted) completed++;
      }
    }
    return `${completed}/${workoutDaysSoFar}`;
  },

  daysUntilNextWorkout(schedule) {
    let cursor = new Date();
    for (let i = 1; i <= 7; i++) {
      cursor.setDate(cursor.getDate() + 1);
      const dKey = Gamification.dayKeyFromDate(cursor);
      if (schedule[dKey].type !== "REST") return i;
    }
    return 1;
  },

  formatDateID(d) {
    const dayName = DAY_LABELS_ID[d.getDay()];
    const date = String(d.getDate()).padStart(2, "0");
    const month = MONTH_LABELS_ID[d.getMonth()];
    return `${dayName} — ${date} ${month} ${d.getFullYear()}`;
  },

  async toggleExercise(exerciseId, checkboxEl) {
    const schedule = AppData.getSchedule();
    const now = new Date();
    const dayKey = Gamification.dayKeyFromDate(now);
    const day = schedule[dayKey];
    const dateKey = Gamification.dateKey(now);

    let log = await WorkoutLogs.getByDate(dateKey);
    if (!log) {
      log = { date: dateKey, dayType: day.type, exercises: [], totalXPEarned: 0, completedAt: null, allCompleted: false, bonusAwarded: false };
    }

    let entry = log.exercises.find((e) => e.id === exerciseId);
    const wasCompleted = entry?.completed;
    const nowCompleted = !wasCompleted;

    if (!entry) {
      entry = { id: exerciseId, completed: false, reps: [], timestamp: null, effectsApplied: false };
      log.exercises.push(entry);
    }
    entry.completed = nowCompleted;
    entry.timestamp = nowCompleted ? this.formatTimeHM(now) : null;

    const itemEl = checkboxEl.closest(".checklist-item");
    if (nowCompleted) {
      itemEl.classList.add("is-complete");
      Gamification.awardXP(XP_RULES.EXERCISE_CHECK, "Exercise complete");
      UI.floatXP(itemEl, XP_RULES.EXERCISE_CHECK);
      log.totalXPEarned += XP_RULES.EXERCISE_CHECK;

      const ex = day.exercises.find((e) => e.id === exerciseId);
      if (ex && ex.inputType === "reps") {
        if (ex.hasTimer) await this.runCountdown(ex.name, 60);

        // Banyak exercise punya >1 set (lihat field `sets` + catatan "Catat reps
        // setiap set" di data.js) — sebelumnya cuma ditanya SEKALI untuk seluruh
        // exercise. Sekarang ditanya per set, dengan rest timer di antara set
        // (bukan setelah set terakhir). Untuk exercise dengan sets:1 (termasuk
        // tes KAI), perilakunya sama persis seperti sebelumnya — tanya sekali.
        const setsCount = ex.sets || 1;
        const setReps = [];
        for (let s = 1; s <= setsCount; s++) {
          const label = setsCount > 1 ? `${ex.name} — Set ${s}/${setsCount}` : ex.name;
          const reps = await this.promptForReps(label);
          if (reps === null) break;
          setReps.push(reps);

          const isPR = Gamification.updatePersonalRecord(exerciseId, ex.name, reps);
          if (isPR) {
            Gamification.awardXP(XP_RULES.NEW_PR, "New PR");
            UI.toast(`🏆 NEW PR! ${ex.name}: ${reps}`);
          }
          if (exerciseId === "kai-pushup-test" || exerciseId === "kai-situp-test") {
            await this.saveKaiTest(exerciseId, reps, dateKey);
          }
          if (s < setsCount) await this.runRestTimer();
        }

        if (setReps.length > 0) {
          // Simpan reps tiap set untuk hari ini — jangan menumpuk (push) histori
          // duplikat setiap kali exercise di-uncheck lalu di-check ulang.
          entry.reps = setReps;

          // Counter kumulatif (total reps) hanya boleh bertambah SEKALI per
          // exercise per hari, supaya uncheck→check ulang tidak menggandakan angka.
          if (!entry.effectsApplied) {
            entry.effectsApplied = true;
            if (exerciseId.includes("pushup") || exerciseId === "pushup-failure") {
              const sessionTotal = setReps.reduce((a, b) => a + b, 0);
              AppData.setTotalPushupReps(AppData.getTotalPushupReps() + sessionTotal);
              // "century-club" — 100 reps KUMULATIF dalam 1 sesi failure, jadi
              // dicek dari total semua set hari ini, bukan satu set tunggal.
              if (sessionTotal >= 100) {
                const unlocked = await Gamification.checkAchievements({ pushupSessionTotal: sessionTotal });
                unlocked.forEach((id) => this.announceAchievement(id));
              }
            }
          }
        }
      }
    } else {
      itemEl.classList.remove("is-complete");
      Gamification.awardXP(-XP_RULES.EXERCISE_CHECK, "Uncheck");
      log.totalXPEarned = Math.max(0, log.totalXPEarned - XP_RULES.EXERCISE_CHECK);

      // "Uncheck = hapus jejak hari ini" untuk exercise ini: reps yang tercatat
      // HARI INI dan counter kumulatif yang baru saja ditambahkannya dibatalkan.
      // PR (rekor) dan achievement yang SUDAH unlock TIDAK ikut dihapus — itu
      // prestasi yang sudah benar-benar terjadi sekali, bukan status live yang
      // ikut checklist. Ini standar di semua game/habit-tracker: trophy tidak
      // hilang gara-gara kotak centang dibatalkan.
      if (entry.effectsApplied) {
        if (exerciseId.includes("pushup") || exerciseId === "pushup-failure") {
          const revertAmount = (entry.reps || []).reduce((a, b) => a + b, 0);
          AppData.setTotalPushupReps(Math.max(0, AppData.getTotalPushupReps() - revertAmount));
        }
        entry.effectsApplied = false;
      }
      entry.reps = [];
    }

    const allDone = day.exercises.every((ex) => log.exercises.find((e) => e.id === ex.id)?.completed);
    const wasBonusAwarded = log.bonusAwarded;
    log.allCompleted = allDone;
    if (allDone) log.completedAt = this.formatTimeHM(now);

    if (!allDone && wasBonusAwarded) {
      // Hari yang tadinya lengkap baru saja dibatalkan (salah satu exercise
      // di-uncheck) — batalkan bonus hari itu secara presisi & simetris supaya
      // saldo XP kembali sama seperti sebelum hari itu selesai. Kalau nanti
      // di-check ulang sampai lengkap lagi, onDayComplete() di bawah akan
      // memberi bonus SEKALI lagi — total bersih tetap benar, tidak dobel.
      await this.undoDayComplete(log);
    } else {
      await WorkoutLogs.save(log);
      // Bonus "hari selesai" hanya diberikan SEKALI selama log.bonusAwarded
      // masih true. Flag ini di-reset ke false oleh undoDayComplete() di atas
      // saat hari dibatalkan, jadi check ulang sampai lengkap akan memicu
      // bonus lagi — tapi persis satu kali, bukan menumpuk.
      if (allDone && !log.bonusAwarded) {
        await this.onDayComplete(day, now, log);
      }
    }

    await Gamification.recomputeStreak();
    this.updateStreakBadge();
    this.updateStatsBarInline();
  },

  async saveKaiTest(exerciseId, reps, dateKey) {
    const existing = (await KaiTestHistory.all()).find((r) => r.date === dateKey) || { date: dateKey };
    if (exerciseId === "kai-pushup-test") existing.pushup_count = reps;
    if (exerciseId === "kai-situp-test") existing.situp_count = reps;
    await KaiTestHistory.save(existing);

    const targets = AppData.getTargets();
    if (exerciseId === "kai-pushup-test" && reps >= (targets.pushup_target || 0)) {
      const unlocked = await Gamification.checkAchievements({ kaiReady: true });
      unlocked.forEach((id) => this.announceAchievement(id));
    }
  },

  async onDayComplete(day, now, log) {
    let bonusXP = XP_RULES.DAY_COMPLETE_BONUS;
    let title = "MISSION COMPLETE";
    const heartbreakCounted = day.type === "HEARTBREAK";
    if (heartbreakCounted) {
      bonusXP = XP_RULES.DAY_COMPLETE_BONUS + XP_RULES.HEARTBREAK_COMPLETE_BONUS;
      title = "HEARTBREAK SESSION COMPLETE";
      AppData.setHeartbreakCompletedCount(AppData.getHeartbreakCompletedCount() + 1);
    }
    // Dihitung sekali per HARI (bukan per exercise) — sesuai deskripsi
    // achievement "Selesaikan workout sebelum jam X sebanyak N kali".
    const earlyRiserCounted = now.getHours() < 5 || (now.getHours() === 5 && now.getMinutes() <= 15);
    const dawnWarriorCounted = now.getHours() < 5 || (now.getHours() === 5 && now.getMinutes() <= 30);
    if (earlyRiserCounted) {
      bonusXP += XP_RULES.EARLY_RISER_BONUS;
      AppData.setEarlyRiserCount(AppData.getEarlyRiserCount() + 1);
    }
    if (dawnWarriorCounted) {
      AppData.setDawnWarriorCount(AppData.getDawnWarriorCount() + 1);
    }

    const result = Gamification.awardXP(bonusXP, "Day complete");

    const streak = await Gamification.recomputeStreak();
    let milestoneBonus = 0;
    if (Gamification.checkStreakMilestone(streak)) {
      Gamification.awardXP(XP_RULES.STREAK_MILESTONE, "Streak milestone");
      milestoneBonus = XP_RULES.STREAK_MILESTONE;
    }

    // Simpan persis apa yang diberikan supaya bisa dibatalkan presisi kalau
    // nanti hari ini di-uncheck lagi (lihat undoDayComplete).
    log.totalXPEarned += bonusXP + milestoneBonus;
    log.bonusAwarded = true;
    log.bonusXPAwarded = bonusXP;
    log.milestoneBonusAwarded = milestoneBonus;
    log.heartbreakCounted = heartbreakCounted;
    log.earlyRiserCounted = earlyRiserCounted;
    log.dawnWarriorCounted = dawnWarriorCounted;
    await WorkoutLogs.save(log);

    const unlocked = await Gamification.checkAchievements({ painConverterSelfReport: day.type === "HEARTBREAK" });

    UI.showCelebration({
      title,
      xp: bonusXP + milestoneBonus,
      sub: milestoneBonus ? `🔥 Streak milestone ${streak} hari! +${milestoneBonus} XP bonus` : (result.leveledUp ? `LEVEL UP! Sekarang: ${result.rank.name}` : "Auto-saved ke history")
    });

    unlocked.forEach((id) => setTimeout(() => this.announceAchievement(id), 800));
  },

  // Kebalikan presis dari onDayComplete(): dipanggil saat hari yang TADINYA
  // sudah lengkap jadi tidak lengkap lagi gara-gara satu exercise di-uncheck.
  // Achievement yang sudah unlock TIDAK dibatalkan (permanen, seperti trophy).
  async undoDayComplete(log) {
    const totalToRevert = (log.bonusXPAwarded || 0) + (log.milestoneBonusAwarded || 0);
    Gamification.awardXP(-totalToRevert, "Undo day complete");
    log.totalXPEarned = Math.max(0, log.totalXPEarned - totalToRevert);

    if (log.heartbreakCounted) {
      AppData.setHeartbreakCompletedCount(Math.max(0, AppData.getHeartbreakCompletedCount() - 1));
    }
    if (log.earlyRiserCounted) {
      AppData.setEarlyRiserCount(Math.max(0, AppData.getEarlyRiserCount() - 1));
    }
    if (log.dawnWarriorCounted) {
      AppData.setDawnWarriorCount(Math.max(0, AppData.getDawnWarriorCount() - 1));
    }

    log.bonusAwarded = false;
    log.bonusXPAwarded = 0;
    log.milestoneBonusAwarded = 0;
    log.heartbreakCounted = false;
    log.earlyRiserCounted = false;
    log.dawnWarriorCounted = false;
    log.completedAt = null;
    await WorkoutLogs.save(log);
  },

  announceAchievement(id) {
    const ach = ACHIEVEMENTS.find((a) => a.id === id);
    if (ach) UI.toast(`🏆 Achievement Unlocked: ${ach.name}`, 3000);
  },

  runCountdown(exerciseName, seconds) {
    return new Promise((resolve) => {
      UI.openModal(`
        <div class="modal-handle"></div>
        <div class="timer-page" style="min-height:auto;padding:var(--space-lg) 0">
          <div class="timer-exercise-name">${UI.escapeHtml(exerciseName)}</div>
          <div class="timer-display" id="countdown-display">${Timer.formatTime(seconds)}</div>
          <div class="timer-controls">
            <button class="btn btn-primary" id="countdown-start">MULAI TIMER</button>
            <button class="btn btn-ghost" id="countdown-skip">Skip →</button>
          </div>
        </div>
      `);
      const display = document.getElementById("countdown-display");
      const startBtn = document.getElementById("countdown-start");
      const skipBtn = document.getElementById("countdown-skip");
      const finish = () => { Timer.stop(); UI.closeModal(); resolve(); };
      skipBtn.addEventListener("click", finish);
      startBtn.addEventListener("click", () => {
        startBtn.disabled = true;
        startBtn.textContent = "BERJALAN...";
        Timer.start(seconds, {
          onTick: (remaining, total) => {
            display.textContent = Timer.formatTime(remaining);
            const zone = Timer.getZone(remaining, total);
            display.classList.toggle("timer-warn", zone === "warn");
            display.classList.toggle("timer-critical", zone === "critical");
          },
          onComplete: () => {
            UI.toast("Waktu habis! Catat hasilmu.");
            finish();
          }
        });
      });
    });
  },

  // Rest timer di antara set (bukan tes KAI). Beda dari runCountdown: auto-mulai
  // begitu modal terbuka (user baru selesai satu set, tidak perlu klik "mulai"
  // lagi), dan cuma punya tombol Skip.
  runRestTimer(seconds = RestTimer.defaultSeconds) {
    return new Promise((resolve) => {
      UI.openModal(`
        <div class="modal-handle"></div>
        <div class="timer-page" style="min-height:auto;padding:var(--space-lg) 0">
          <div class="timer-exercise-name">ISTIRAHAT. TARIK NAPAS.</div>
          <div class="timer-display" id="rest-countdown-display">${Timer.formatTime(seconds)}</div>
          <div class="timer-controls">
            <button class="btn btn-ghost" id="rest-skip">Skip Istirahat →</button>
          </div>
        </div>
      `);
      const display = document.getElementById("rest-countdown-display");
      const skipBtn = document.getElementById("rest-skip");
      const finish = () => { RestTimer.stop(); UI.closeModal(); resolve(); };
      skipBtn.addEventListener("click", finish);
      RestTimer.start(
        seconds,
        (remaining) => {
          if (!display) return;
          display.textContent = Timer.formatTime(remaining);
          const zone = Timer.getZone(remaining, seconds);
          display.classList.toggle("timer-warn", zone === "warn");
          display.classList.toggle("timer-critical", zone === "critical");
        },
        () => { UI.toast("Istirahat selesai. Set berikutnya."); finish(); }
      );
    });
  },

  promptForReps(exerciseName) {
    return new Promise((resolve) => {
      UI.openModal(`
        <div class="modal-handle"></div>
        <h3 class="heading-m mb-md">${UI.escapeHtml(exerciseName)}</h3>
        <div class="field">
          <label class="field-label">Jumlah reps yang dicapai</label>
          <input type="number" inputmode="numeric" class="field-input" id="reps-input" autofocus placeholder="0" />
        </div>
        <button class="btn btn-primary" id="reps-submit">SIMPAN</button>
      `);
      const submit = () => {
        const val = document.getElementById("reps-input").value;
        const n = val === "" ? 0 : Math.max(0, parseInt(val, 10) || 0);
        UI.closeModal();
        resolve(n);
      };
      document.getElementById("reps-submit").addEventListener("click", submit);
      document.getElementById("reps-input").addEventListener("keydown", (e) => {
        if (e.key === "Enter") submit();
      });
      setTimeout(() => document.getElementById("reps-input")?.focus(), 350);
    });
  },

  formatTimeHM(d) {
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  },

  updateStreakBadge() {
    const badge = document.querySelector(".streak-badge span");
    if (badge) badge.textContent = AppData.getStreak();
  },

  async updateStatsBarInline() {
    if (location.hash.includes("dashboard") || !location.hash) {
      await this.renderDashboard();
    }
  },

  // ============================================================
  // PROGRESS ("War Journal")
  // ============================================================
  async renderProgress() {
    const logs = await WorkoutLogs.all();
    const logMap = {};
    logs.forEach((l) => { logMap[l.date] = l; });
    const schedule = AppData.getSchedule();

    const now = new Date();
    const y = now.getFullYear(), m = now.getMonth();
    const daysInMonth = new Date(y, m + 1, 0).getDate();
    const firstDow = new Date(y, m, 1).getDay();

    let cells = "";
    for (let i = 0; i < firstDow; i++) cells += `<div class="heatmap-cell" style="visibility:hidden"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const date = new Date(y, m, d);
      const dateStr = Gamification.dateKey(date);
      const dKey = Gamification.dayKeyFromDate(date);
      const isFuture = date > now;
      let cls = "heatmap-cell";
      if (isFuture) cls += " heatmap-cell--future";
      else if (schedule[dKey].type === "REST") cls += " heatmap-cell--rest";
      else {
        const log = logMap[dateStr];
        if (log && log.allCompleted) cls += " heatmap-cell--done";
        else cls += " heatmap-cell--skipped";
      }
      cells += `<div class="${cls}" data-action="heatmap-day" data-date="${dateStr}">${d}</div>`;
    }

    const kaiHistory = await KaiTestHistory.all();
    const records = AppData.getPersonalRecords();
    const prRows = Object.entries(records)
      .sort((a, b) => new Date(b[1].date) - new Date(a[1].date))
      .map(([id, r]) => `
        <div class="pr-row">
          <div>
            <div class="heading-s">${UI.escapeHtml(r.name)}</div>
            <div class="pr-date">${new Date(r.date).toLocaleDateString("id-ID")}</div>
          </div>
          <div class="pr-value">${r.value}</div>
        </div>`).join("") || `<div class="empty-state">Belum ada PR tercatat. Mulai latihan!</div>`;

    const bodyStats = await BodyStats.all();
    const targets = AppData.getTargets();

    this.pageEl().innerHTML = `
      <h1 class="heading-l mb-md">War Journal</h1>

      <div class="card">
        <div class="heatmap-header">
          <span class="heading-m">${MONTH_LABELS_ID[m]} ${y}</span>
        </div>
        <div class="heatmap-grid">${cells}</div>
        <div class="heatmap-legend">
          <span><span class="legend-dot" style="background:var(--emerald-500)"></span>Selesai</span>
          <span><span class="legend-dot" style="background:var(--crimson-500)"></span>Skip</span>
          <span><span class="legend-dot" style="background:var(--bg-elevated)"></span>Rest</span>
        </div>
      </div>

      <h2 class="heading-m section-title">KAI Test Progress</h2>
      <div class="card">
        ${this.renderKaiChart(kaiHistory, targets)}
      </div>

      <h2 class="heading-m section-title">Personal Records</h2>
      <div class="pr-list">${prRows}</div>

      <h2 class="heading-m section-title">Body Stats</h2>
      <div class="card">
        <button class="btn btn-secondary" data-action="open-body-stats">+ Catat Berat Badan Minggu Ini</button>
        ${this.renderBodyStatsList(bodyStats)}
      </div>
    `;
  },

  renderKaiChart(history, targets) {
    if (!history.length) {
      return `<div class="empty-state">Belum ada data tes KAI. Selesaikan Heartbreak Session di hari Sabtu.</div>`;
    }
    const w = 320, h = 160, pad = 24;
    const points = history.slice(-10);
    const maxVal = Math.max(targets.pushup_target || 0, targets.situp_target || 0, ...points.map((p) => Math.max(p.pushup_count || 0, p.situp_count || 0)), 10);

    const toXY = (i, val) => {
      const x = pad + (i / Math.max(1, points.length - 1)) * (w - pad * 2);
      const y = h - pad - (val / maxVal) * (h - pad * 2);
      return [x, y];
    };
    const pushupPath = points.map((p, i) => toXY(i, p.pushup_count || 0)).map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
    const situpPath = points.map((p, i) => toXY(i, p.situp_count || 0)).map(([x, y], i) => `${i === 0 ? "M" : "L"}${x},${y}`).join(" ");
    const targetY = h - pad - ((targets.pushup_target || 0) / maxVal) * (h - pad * 2);

    return `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto" preserveAspectRatio="xMidYMid meet">
        <line x1="${pad}" y1="${targetY}" x2="${w - pad}" y2="${targetY}" stroke="var(--text-muted)" stroke-dasharray="4 4" stroke-width="1"/>
        <path d="${pushupPath}" fill="none" stroke="var(--crimson-500)" stroke-width="2"/>
        <path d="${situpPath}" fill="none" stroke="var(--purple-500)" stroke-width="2"/>
      </svg>
      <div class="flex-between text-caption mt-sm">
        <span style="color:var(--crimson-400)">● Push-up</span>
        <span style="color:var(--purple-400)">● Sit-up</span>
        <span>Target: garis putus-putus</span>
      </div>`;
  },

  renderBodyStatsList(stats) {
    if (!stats.length) return "";
    const sorted = stats.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
    return `<div class="flex-col gap-sm mt-md">` + sorted.map((s) => `
      <div class="flex-between text-body">
        <span>${new Date(s.date).toLocaleDateString("id-ID")}</span>
        <span class="mono">${s.weight_kg ?? "-"} kg</span>
      </div>`).join("") + `</div>`;
  },

  openBodyStatsModal() {
    UI.openModal(`
      <div class="modal-handle"></div>
      <h3 class="heading-m mb-md">Catat Body Stats</h3>
      <div class="field">
        <label class="field-label">Berat badan (kg)</label>
        <input type="number" inputmode="decimal" class="field-input" id="bs-weight" />
      </div>
      <div class="field">
        <label class="field-label">Lingkar dada (cm)</label>
        <input type="number" inputmode="decimal" class="field-input" id="bs-chest" />
      </div>
      <div class="field">
        <label class="field-label">Lingkar lengan (cm)</label>
        <input type="number" inputmode="decimal" class="field-input" id="bs-arm" />
      </div>
      <button class="btn btn-primary" data-action="save-body-stats">SIMPAN</button>
    `);
  },

  async saveBodyStats() {
    const weight = parseFloat(document.getElementById("bs-weight").value) || null;
    const chest = parseFloat(document.getElementById("bs-chest").value) || null;
    const arm = parseFloat(document.getElementById("bs-arm").value) || null;
    const dateKey = Gamification.dateKey();
    await BodyStats.save({ date: dateKey, weight_kg: weight, chest_cm: chest, arm_cm: arm });
    UI.closeModal();
    UI.toast(weight ? "Massa bertambah. Musuh semakin takut." : "Body stats tersimpan.");
    const unlocked = await Gamification.checkAchievements();
    unlocked.forEach((id) => this.announceAchievement(id));
    this.renderProgress();
  },

  // ============================================================
  // ACHIEVEMENTS ("Hall of Shadows")
  // ============================================================
  renderAchievements() {
    const xp = AppData.getXP();
    const progress = Gamification.xpProgress(xp);
    const unlockedIds = new Set(AppData.getAchievements().map((a) => a.id));

    const ladderHTML = RANKS.map((r) => {
      const achieved = r.level <= progress.rank.level;
      const current = r.level === progress.rank.level;
      return `
        <div class="rank-row ${achieved ? "is-achieved" : ""} ${current ? "is-current" : ""}">
          <span class="rank-level-num">${r.level}</span>
          <div>
            <div class="heading-s">${r.name}</div>
            <div class="text-caption">${UI.formatNumber(r.xpRequired)} XP</div>
          </div>
        </div>`;
    }).join("");

    const badgesHTML = ACHIEVEMENTS.map((a) => {
      const unlocked = unlockedIds.has(a.id);
      return `
        <button class="badge-tile ${unlocked ? "is-unlocked" : "is-locked"}" data-action="badge-detail" data-id="${a.id}">
          <div class="badge-icon">${unlocked ? a.icon : "🔒"}</div>
          <div class="badge-name">${a.name}</div>
        </button>`;
    }).join("");

    this.pageEl().innerHTML = `
      <h1 class="heading-l mb-md">Hall of Shadows</h1>
      <div class="rank-hero idle-float">
        <div class="rank-emblem idle-glow">⚔️</div>
        <div class="rank-current-name">${progress.rank.name}</div>
        <div class="rank-current-level">LEVEL ${progress.rank.level}</div>
      </div>

      <h2 class="heading-m section-title">Rank Progression</h2>
      <div class="rank-ladder">${ladderHTML}</div>

      <h2 class="heading-m section-title">Achievements (${unlockedIds.size}/${ACHIEVEMENTS.length})</h2>
      <div class="badge-grid">${badgesHTML}</div>
    `;
  },

  showBadgeDetail(id) {
    const a = ACHIEVEMENTS.find((x) => x.id === id);
    if (!a) return;
    const unlocked = AppData.getAchievements().find((u) => u.id === id);
    UI.openModal(`
      <div class="modal-handle"></div>
      <div style="text-align:center">
        <div style="font-size:40px">${unlocked ? a.icon : "🔒"}</div>
        <h3 class="heading-m mt-md">${a.name}</h3>
        <p class="text-body mt-sm">${UI.escapeHtml(a.desc)}</p>
        ${unlocked ? `<p class="text-caption mt-md">Unlocked: ${new Date(unlocked.unlockedAt).toLocaleDateString("id-ID")}</p>` : `<p class="text-caption mt-md">Belum terbuka</p>`}
      </div>
    `);
  },

  // ============================================================
  // SETTINGS ("Command Center")
  // ============================================================
  renderSettings() {
    const codename = AppData.getCodename();
    const targets = AppData.getTargets();
    const settings = AppData.getSettings();
    const schedule = AppData.getSchedule();

    const presetsHTML = NOTIFICATION_PRESETS.map((p) => `
      <button class="preset-msg ${settings.notification_message === p ? "is-selected" : ""}" data-action="select-preset" data-msg="${UI.escapeHtml(p)}">${UI.escapeHtml(p)}</button>
    `).join("");

    const scheduleHTML = DAY_KEYS.filter((k) => k !== "sunday").concat(["sunday"]).map((key) => {
      const day = schedule[key];
      const label = { monday: "Senin", tuesday: "Selasa", wednesday: "Rabu", thursday: "Kamis", friday: "Jumat", saturday: "Sabtu", sunday: "Minggu" }[key];
      return `
        <div class="schedule-day-row">
          <span class="text-body">${label}</span>
          <span class="text-caption">${day.emoji} ${day.label}</span>
        </div>`;
    }).join("");

    this.pageEl().innerHTML = `
      <h1 class="heading-l mb-md">Command Center</h1>

      <div class="settings-section">
        <div class="settings-section-title">Profile</div>
        <div class="field">
          <label class="field-label">Codename</label>
          <input class="field-input" id="set-codename" value="${UI.escapeHtml(codename)}" maxlength="20" />
        </div>
        <div class="field">
          <label class="field-label">Target berat badan (kg)</label>
          <input class="field-input" id="set-weight" type="number" value="${targets.weight_kg ?? ""}" />
        </div>
        <div class="field">
          <label class="field-label">Target push-up KAI</label>
          <input class="field-input" id="set-pushup" type="number" value="${targets.pushup_target ?? ""}" />
        </div>
        <div class="field">
          <label class="field-label">Target sit-up KAI</label>
          <input class="field-input" id="set-situp" type="number" value="${targets.situp_target ?? ""}" />
        </div>
        <button class="btn btn-secondary" data-action="save-profile">SIMPAN PROFILE</button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Notifikasi</div>
        <div class="toggle-row">
          <span class="text-body">Push Notification</span>
          <button class="toggle-switch ${settings.notification_enabled ? "is-on" : ""}" data-action="toggle-notif"></button>
        </div>
        <div class="field mt-md">
          <label class="field-label">Jam notifikasi</label>
          <input class="field-input" id="set-notif-time" type="time" value="${settings.notification_time}" />
        </div>
        <label class="field-label mt-md">Pesan Preset</label>
        ${presetsHTML}
        <button class="btn btn-secondary mt-sm" data-action="save-notif-settings">SIMPAN NOTIFIKASI</button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Anti-PMO Tracker</div>
        <div class="toggle-row">
          <span class="text-body">Aktifkan Tracker</span>
          <button class="toggle-switch ${settings.pmo_tracker_enabled ? "is-on" : ""}" data-action="toggle-pmo"></button>
        </div>
        ${settings.pmo_tracker_enabled ? `
          <div class="flex-between mt-md">
            <span class="text-body">Clean Days: <strong class="mono">${AppData.getPmoStreak()}</strong></span>
            <button class="btn btn-danger" style="width:auto;padding:0 var(--space-md)" data-action="reset-pmo">RESET</button>
          </div>` : ""}
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Jadwal Latihan</div>
        ${scheduleHTML}
        <p class="text-caption mt-sm">Edit jadwal detail tersedia di versi mendatang.</p>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Data Management</div>
        <button class="btn btn-secondary mb-sm" data-action="export-data">EXPORT DATA (JSON)</button>
        <label class="btn btn-secondary mb-sm" style="display:flex" for="import-file">IMPORT DATA (JSON)</label>
        <input type="file" id="import-file" accept="application/json" style="display:none" />
        <button class="btn btn-danger" data-action="reset-all">RESET SEMUA DATA</button>
      </div>
    `;

    document.getElementById("import-file")?.addEventListener("change", (e) => this.handleImportFile(e));
  },

  saveProfile() {
    const codename = document.getElementById("set-codename").value.trim() || "SHADOW";
    AppData.setCodename(codename);
    AppData.setTargets({
      weight_kg: parseFloat(document.getElementById("set-weight").value) || null,
      pushup_target: parseInt(document.getElementById("set-pushup").value, 10) || DEFAULT_TARGETS.pushup_target,
      situp_target: parseInt(document.getElementById("set-situp").value, 10) || DEFAULT_TARGETS.situp_target
    });
    UI.toast("Profile tersimpan.");
  },

  async toggleNotif() {
    const settings = AppData.getSettings();
    settings.notification_enabled = !settings.notification_enabled;
    AppData.setSettings(settings);
    if (settings.notification_enabled) await Notifications.requestPermission();
    this.renderSettings();
  },

  selectPreset(msg) {
    const settings = AppData.getSettings();
    settings.notification_message = msg;
    AppData.setSettings(settings);
    this.renderSettings();
  },

  saveNotifSettings() {
    const settings = AppData.getSettings();
    settings.notification_time = document.getElementById("set-notif-time").value || settings.notification_time;
    AppData.setSettings(settings);
    UI.toast("Pengaturan notifikasi tersimpan.");
  },

  togglePmo() {
    const settings = AppData.getSettings();
    settings.pmo_tracker_enabled = !settings.pmo_tracker_enabled;
    AppData.setSettings(settings);
    if (settings.pmo_tracker_enabled && !AppData.getPmoLastReset()) {
      AppData.setPmoLastReset(new Date().toISOString());
      AppData.setPmoStreak(0);
    }
    this.renderSettings();
  },

  resetPmo() {
    UI.openModal(`
      <div class="modal-handle"></div>
      <h3 class="heading-m mb-md">Reset Clean Days?</h3>
      <p class="text-body mb-lg">Jatuh bukan berarti kalah. Bangun lagi. Sekarang.</p>
      <button class="btn btn-danger mb-sm" data-action="confirm-reset-pmo">YA, RESET</button>
      <button class="btn btn-ghost" data-action="close-modal">Batal</button>
    `);
  },

  confirmResetPmo() {
    AppData.setPmoStreak(0);
    AppData.setPmoLastReset(new Date().toISOString());
    UI.closeModal();
    this.renderSettings();
    UI.toast("Clean Days direset. Mulai lagi, sekarang.");
  },

  exportData() {
    const dump = {
      localStorage: AppData.exportAll(),
      exportedAt: new Date().toISOString()
    };
    Promise.all([WorkoutLogs.all(), BodyStats.all(), KaiTestHistory.all()]).then(([logs, stats, kai]) => {
      dump.indexedDB = { workout_logs: logs, body_stats: stats, kai_test_history: kai };
      const blob = new Blob([JSON.stringify(dump, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `villain-arc-backup-${Gamification.dateKey()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    });
  },

  handleImportFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const dump = JSON.parse(reader.result);
        if (dump.localStorage) AppData.importAll(dump.localStorage);
        if (dump.indexedDB) {
          for (const log of dump.indexedDB.workout_logs || []) await WorkoutLogs.save(log);
          for (const s of dump.indexedDB.body_stats || []) await BodyStats.save(s);
          for (const k of dump.indexedDB.kai_test_history || []) await KaiTestHistory.save(k);
        }
        UI.toast("Import berhasil. Reload...");
        setTimeout(() => location.reload(), 1000);
      } catch (err) {
        UI.toast("File tidak valid.");
      }
    };
    reader.readAsText(file);
  },

  resetAllData() {
    UI.openModal(`
      <div class="modal-handle"></div>
      <h3 class="heading-m mb-md">Reset SEMUA data?</h3>
      <p class="text-body mb-lg">Ini akan menghapus semua progress, XP, streak, dan history. Tidak bisa dibatalkan.</p>
      <button class="btn btn-danger mb-sm" data-action="confirm-reset-1">YA, LANJUTKAN</button>
      <button class="btn btn-ghost" data-action="close-modal">Batal</button>
    `);
  },

  confirmReset1() {
    UI.openModal(`
      <div class="modal-handle"></div>
      <h3 class="heading-m mb-md">Yakin? Ini permanen.</h3>
      <p class="text-body mb-lg">Konfirmasi sekali lagi untuk menghapus semua data secara permanen.</p>
      <button class="btn btn-danger mb-sm" data-action="confirm-reset-2">HAPUS SEMUA DATA</button>
      <button class="btn btn-ghost" data-action="close-modal">Batal</button>
    `);
  },

  async confirmReset2() {
    Store.clearAll();
    await IDB.clearAllStores();
    UI.closeModal();
    location.reload();
  },

  // ============================================================
  // EVENT DELEGATION
  // ============================================================
  handleClick(e) {
    const btn = e.target.closest("[data-action]");
    if (!btn) return;
    const action = btn.dataset.action;

    switch (action) {
      case "onboard-next": this.onboardNext(); break;
      case "onboard-notify": this.onboardNotify(); break;
      case "onboard-finish": this.onboardFinish(); break;
      case "toggle-exercise": this.toggleExercise(btn.dataset.id, btn); break;
      case "next-quote": {
        const q = QuoteEngine.rotate();
        const el = btn.closest(".quote-card-inner").querySelector(".quote-text");
        if (el) el.textContent = `"${q}"`;
        break;
      }
      case "close-celebration": break; // handled inline
      case "close-modal": UI.closeModal(); break;
      case "heatmap-day": this.showDayDetail(btn.dataset.date); break;
      case "open-body-stats": this.openBodyStatsModal(); break;
      case "save-body-stats": this.saveBodyStats(); break;
      case "badge-detail": this.showBadgeDetail(btn.dataset.id); break;
      case "save-profile": this.saveProfile(); break;
      case "toggle-notif": this.toggleNotif(); break;
      case "select-preset": this.selectPreset(btn.dataset.msg); break;
      case "save-notif-settings": this.saveNotifSettings(); break;
      case "toggle-pmo": this.togglePmo(); break;
      case "reset-pmo": this.resetPmo(); break;
      case "confirm-reset-pmo": this.confirmResetPmo(); break;
      case "export-data": this.exportData(); break;
      case "reset-all": this.resetAllData(); break;
      case "confirm-reset-1": this.confirmReset1(); break;
      case "confirm-reset-2": this.confirmReset2(); break;
    }
  },

  handleChange(e) {
    // reserved for future inline-change handling
  },

  async showDayDetail(dateStr) {
    const log = await WorkoutLogs.getByDate(dateStr);
    const schedule = AppData.getSchedule();
    const date = new Date(dateStr + "T00:00:00");
    const dKey = Gamification.dayKeyFromDate(date);
    const day = schedule[dKey];

    let content;
    if (day.type === "REST") {
      content = `<p class="text-body">Hari istirahat terjadwal.</p>`;
    } else if (!log) {
      content = `<p class="text-body">Tidak ada data. Hari ini di-skip.</p>`;
    } else {
      const exHTML = log.exercises.map((e) => {
        const def = day.exercises.find((d) => d.id === e.id);
        return `<div class="flex-between text-body mt-sm">
          <span>${e.completed ? "✅" : "⬜"} ${UI.escapeHtml(def?.name || e.id)}</span>
          <span class="mono">${e.reps?.length ? e.reps.join(", ") : ""}</span>
        </div>`;
      }).join("");
      content = `
        <p class="text-caption mb-sm">${log.allCompleted ? "Selesai pukul " + (log.completedAt || "-") : "Belum lengkap"}</p>
        ${exHTML}
        <p class="text-caption mt-md">Total XP: ${log.totalXPEarned}</p>`;
    }

    UI.openModal(`
      <div class="modal-handle"></div>
      <h3 class="heading-m mb-md">${new Date(dateStr).toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long" })}</h3>
      ${content}
    `);
  }
};

document.addEventListener("DOMContentLoaded", () => App.init());

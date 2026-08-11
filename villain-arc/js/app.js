// ============================================================
// VILLAIN ARC — App controller, routing, page rendering
// ============================================================

const App = {
  state: {
    onboardingStep: 1,
    onboardingData: { codename: "", weight_kg: "", pushup_target: "", situp_target: "" },
    activeTimerExercise: null,
    restTimerActive: false,
    exerciseEditDay: null,
    exerciseEditList: [],
    aiProposals: {}
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
      case "coach": this.renderCoach(); break;
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
          <a href="#/settings" class="icon-btn" aria-label="Pengaturan">⚙️</a>
        </div>
      </header>
      <main id="page-content" class="page page-transition"></main>
      <nav class="bottom-nav">
        <a href="#/dashboard" class="nav-tab ${active === "dashboard" ? "is-active" : ""}" ${active === "dashboard" ? 'aria-current="page"' : ""}>
          <span class="nav-tab-icon">🏠</span><span class="nav-tab-label">War Room</span>
        </a>
        <a href="#/progress" class="nav-tab ${active === "progress" ? "is-active" : ""}" ${active === "progress" ? 'aria-current="page"' : ""}>
          <span class="nav-tab-icon">📊</span><span class="nav-tab-label">War Journal</span>
        </a>
        <a href="#/achievements" class="nav-tab ${active === "achievements" ? "is-active" : ""}" ${active === "achievements" ? 'aria-current="page"' : ""}>
          <span class="nav-tab-icon">🏆</span><span class="nav-tab-label">Hall of Shadows</span>
        </a>
        <a href="#/coach" class="nav-tab ${active === "coach" ? "is-active" : ""}" ${active === "coach" ? 'aria-current="page"' : ""}>
          <span class="nav-tab-icon">🧠</span><span class="nav-tab-label">AI Coach</span>
        </a>
        <a href="#/settings" class="nav-tab ${active === "settings" ? "is-active" : ""}" ${active === "settings" ? 'aria-current="page"' : ""}>
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
          <input class="field-input" id="ob-codename" aria-label="Codename" placeholder="SHADOW" value="${UI.escapeHtml(this.state.onboardingData.codename)}" maxlength="20" />
        </div>
        <div class="onboarding-actions">
          <button class="btn btn-primary" data-action="onboard-next">LANJUT →</button>
        </div>`;
    } else if (step === 3) {
      body = `
        <h1 class="onboarding-title">Kunci targetmu.</h1>
        <div class="field mt-lg">
          <label class="field-label" for="ob-weight">Target berat badan (kg)</label>
          <input class="field-input" id="ob-weight" type="number" inputmode="decimal" placeholder="70" value="${UI.escapeHtml(this.state.onboardingData.weight_kg)}" />
        </div>
        <div class="field">
          <label class="field-label" for="ob-pushup">Target push-up per menit (KAI)</label>
          <input class="field-input" id="ob-pushup" type="number" inputmode="numeric" placeholder="40" value="${UI.escapeHtml(this.state.onboardingData.pushup_target)}" />
        </div>
        <div class="field">
          <label class="field-label" for="ob-situp">Target sit-up per menit (KAI)</label>
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
          <button class="checkbox-diamond" data-action="toggle-exercise" data-id="${ex.id}" aria-label="Tandai ${UI.escapeHtml(ex.name)}" aria-pressed="${done}">
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
          <label class="field-label" for="reps-input">Jumlah reps yang dicapai</label>
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

    const latest = points[points.length - 1];
    const chartSummary = `Grafik tren tes KAI, ${points.length} sesi terakhir. Push-up terakhir: ${latest.pushup_count ?? 0}, target ${targets.pushup_target || 0}. Sit-up terakhir: ${latest.situp_count ?? 0}, target ${targets.situp_target || 0}.`;

    return `
      <svg viewBox="0 0 ${w} ${h}" style="width:100%;height:auto" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${UI.escapeHtml(chartSummary)}">
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
        <label class="field-label" for="bs-weight">Berat badan (kg)</label>
        <input type="number" inputmode="decimal" class="field-input" id="bs-weight" />
      </div>
      <div class="field">
        <label class="field-label" for="bs-chest">Lingkar dada (cm)</label>
        <input type="number" inputmode="decimal" class="field-input" id="bs-chest" />
      </div>
      <div class="field">
        <label class="field-label" for="bs-arm">Lingkar lengan (cm)</label>
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
        <button class="badge-tile ${unlocked ? "is-unlocked" : "is-locked"}" data-action="badge-detail" data-id="${a.id}" aria-label="${unlocked ? `Achievement terbuka: ${a.name}` : `Achievement terkunci: ${a.name}`}">
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
  // AI COACH
  // ============================================================
  renderCoach() {
    const settings = AppData.getAISettings();
    const history = AppData.getAIChatHistory();

    if (!settings.enabled || !settings.apiKey) {
      this.pageEl().innerHTML = `
        <h1 class="heading-l mb-md">AI Coach</h1>
        <div class="coach-empty">
          <div class="coach-empty-icon">🧠</div>
          <p class="text-body mb-md">Belum aktif. Sambungkan API key milikmu sendiri (Anthropic Claude atau OpenAI) di Command Center untuk konsultasi soal jadwal, progress, dan strategi — semua jawaban digroundkan ke data asli kamu di app ini, bukan generik.</p>
          <a href="#/settings" class="btn btn-secondary" style="width:auto;display:inline-flex">Setup di Command Center</a>
        </div>
      `;
      return;
    }

    const bubblesHTML = history.length
      ? history.map((m) => `<div class="coach-bubble coach-bubble--${m.role}">${UI.escapeHtml(m.content)}</div>`).join("")
      : `<div class="coach-bubble coach-bubble--assistant">Ceritain progress-mu, atau tanya apa saja soal jadwal dan strategi latihan. Aku baca dulu data kamu di app ini sebelum jawab.</div>`;

    this.pageEl().innerHTML = `
      <h1 class="heading-l mb-md">AI Coach</h1>
      <div class="coach-thread" id="coach-thread">${bubblesHTML}</div>
      <form id="coach-form" class="coach-input-row">
        <label class="sr-only" for="coach-input">Pesan untuk AI Coach</label>
        <input class="field-input" id="coach-input" placeholder="Tanya soal jadwal, progress, strategi..." autocomplete="off" />
        <button type="submit" class="btn btn-secondary" style="width:auto" id="coach-send">Kirim</button>
      </form>
      <button class="btn btn-ghost mt-sm" data-action="clear-coach-history" style="width:auto">Hapus riwayat obrolan</button>
    `;

    const thread = document.getElementById("coach-thread");
    if (thread) thread.scrollTop = thread.scrollHeight;

    const form = document.getElementById("coach-form");
    if (form) {
      form.addEventListener("submit", (e) => {
        e.preventDefault();
        this.sendCoachMessage();
      });
    }
  },

  async sendCoachMessage() {
    const input = document.getElementById("coach-input");
    const sendBtn = document.getElementById("coach-send");
    const thread = document.getElementById("coach-thread");
    if (!input) return;
    const text = input.value.trim();
    if (!text) return;

    input.value = "";
    input.disabled = true;
    if (sendBtn) sendBtn.disabled = true;

    if (thread) {
      thread.insertAdjacentHTML("beforeend", `<div class="coach-bubble coach-bubble--user">${UI.escapeHtml(text)}</div>`);
      thread.insertAdjacentHTML("beforeend", `<div class="coach-bubble coach-bubble--assistant coach-bubble--pending" id="coach-pending">Coach lagi mikir...</div>`);
      thread.scrollTop = thread.scrollHeight;
    }

    try {
      const { text: reply, proposals, autoApply } = await AICoach.sendMessage(text);
      const pending = document.getElementById("coach-pending");
      if (pending) {
        pending.textContent = reply;
        pending.classList.remove("coach-bubble--pending");
        pending.removeAttribute("id");
      }
      if (proposals && proposals.length && thread) {
        this.state.aiProposals = this.state.aiProposals || {};
        proposals.forEach((p) => {
          this.state.aiProposals[p.id] = p;
          thread.insertAdjacentHTML("beforeend", this.renderProposalCard(p, autoApply));
          if (autoApply) this.applyAIProposal(p.id, true);
        });
        thread.scrollTop = thread.scrollHeight;
      }
    } catch (err) {
      const pending = document.getElementById("coach-pending");
      if (pending) {
        pending.textContent = `⚠️ ${err.message}`;
        pending.classList.remove("coach-bubble--pending");
        pending.classList.add("coach-bubble--error");
        pending.removeAttribute("id");
      }
    } finally {
      if (input) { input.disabled = false; input.focus(); }
      if (sendBtn) sendBtn.disabled = false;
      if (thread) thread.scrollTop = thread.scrollHeight;
    }
  },

  // Render kartu usulan aksi AI di dalam thread chat. Kalau autoApply true,
  // kartu langsung tampil dalam mode "sedang dieksekusi" (tanpa tombol
  // konfirmasi) karena applyAIProposal akan langsung dipanggil sesudahnya.
  renderProposalCard(p, autoApply) {
    const dayLabelsId = { monday: "Senin", tuesday: "Selasa", wednesday: "Rabu", thursday: "Kamis", friday: "Jumat", saturday: "Sabtu", sunday: "Minggu" };
    let detailHTML = "";
    if (p.type === "propose_schedule_change") {
      const tpl = SCHEDULE_TEMPLATES.find((t) => t.type === p.input.template_type);
      detailHTML = `<div class="text-body">${dayLabelsId[p.input.day] || p.input.day} → <strong>${tpl ? `${tpl.emoji} ${tpl.label}` : p.input.template_type}</strong></div>`;
    } else if (p.type === "propose_targets_change") {
      const rows = [];
      if (p.input.weight_kg != null) rows.push(`Target berat: <strong>${p.input.weight_kg} kg</strong>`);
      if (p.input.pushup_target != null) rows.push(`Target push-up KAI: <strong>${p.input.pushup_target}</strong>`);
      if (p.input.situp_target != null) rows.push(`Target sit-up KAI: <strong>${p.input.situp_target}</strong>`);
      detailHTML = `<div class="text-body">${rows.join("<br>") || "(tidak ada perubahan)"}</div>`;
    } else if (p.type === "propose_notification_change") {
      const rows = [];
      if (p.input.notification_time) rows.push(`Jam: <strong>${UI.escapeHtml(p.input.notification_time)}</strong>`);
      if (p.input.notification_message) rows.push(`Pesan: <strong>${UI.escapeHtml(p.input.notification_message)}</strong>`);
      detailHTML = `<div class="text-body">${rows.join("<br>") || "(tidak ada perubahan)"}</div>`;
    }
    const actionsHTML = autoApply
      ? `<div class="text-caption mt-sm">⚡ Full-Auto — dieksekusi otomatis</div>`
      : `<div class="flex-between mt-md" style="gap:var(--space-sm)">
          <button class="btn btn-secondary" style="width:auto" data-action="apply-ai-proposal" data-id="${p.id}">Terapkan</button>
          <button class="btn btn-ghost" style="width:auto" data-action="reject-ai-proposal" data-id="${p.id}">Tolak</button>
        </div>`;
    return `
      <div class="coach-bubble coach-bubble--proposal" id="proposal-${p.id}">
        <div class="text-caption mb-sm">🛠️ ${UI.escapeHtml(p.label)}</div>
        ${detailHTML}
        ${p.input.reason ? `<div class="text-caption mt-sm">Alasan: ${UI.escapeHtml(p.input.reason)}</div>` : ""}
        ${actionsHTML}
      </div>`;
  },

  applyAIProposal(id, silent) {
    const p = this.state.aiProposals && this.state.aiProposals[id];
    const card = document.getElementById(`proposal-${id}`);
    if (!p) return;

    if (p.type === "propose_schedule_change") {
      const tpl = SCHEDULE_TEMPLATES.find((t) => t.type === p.input.template_type);
      if (!tpl) { if (!silent) { UI.toast("Tipe hari tidak dikenal, usulan dibatalkan."); this.rejectAIProposal(id); } return; }
      const schedule = { ...AppData.getSchedule() };
      schedule[p.input.day] = JSON.parse(JSON.stringify(tpl));
      AppData.setCustomSchedule(schedule);
      UI.toast("Jadwal diperbarui oleh AI Coach.");
    } else if (p.type === "propose_targets_change") {
      const targets = { ...AppData.getTargets() };
      if (p.input.weight_kg != null) targets.weight_kg = p.input.weight_kg;
      if (p.input.pushup_target != null) targets.pushup_target = p.input.pushup_target;
      if (p.input.situp_target != null) targets.situp_target = p.input.situp_target;
      AppData.setTargets(targets);
      UI.toast("Target diperbarui oleh AI Coach.");
    } else if (p.type === "propose_notification_change") {
      const settings = { ...AppData.getSettings() };
      if (p.input.notification_time) settings.notification_time = p.input.notification_time;
      if (p.input.notification_message) settings.notification_message = p.input.notification_message;
      AppData.setSettings(settings);
      UI.toast("Notifikasi diperbarui oleh AI Coach.");
    }

    p.applied = true;
    if (card) {
      card.innerHTML = `<div class="text-caption">✅ ${UI.escapeHtml(p.label)} — diterapkan${silent ? " otomatis" : ""}.</div>`;
      card.classList.remove("coach-bubble--proposal");
    }
  },

  rejectAIProposal(id) {
    const card = document.getElementById(`proposal-${id}`);
    if (this.state.aiProposals) delete this.state.aiProposals[id];
    if (card) {
      card.innerHTML = `<div class="text-caption">Usulan ditolak.</div>`;
      card.classList.remove("coach-bubble--proposal");
    }
  },

  clearCoachHistory() {
    AppData.clearAIChatHistory();
    UI.toast("Riwayat obrolan dihapus.");
    this.renderCoach();
  },

  // ============================================================
  // SETTINGS ("Command Center")
  // ============================================================
  renderSettings() {
    const codename = AppData.getCodename();
    const targets = AppData.getTargets();
    const settings = AppData.getSettings();
    const schedule = AppData.getSchedule();
    const aiSettings = AppData.getAISettings();
    const pushWorkerUrl = Store.get("va_push_worker_url", "");
    const pushSubscribed = Notifications.isPushSubscribed();

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
          <label class="field-label" for="set-codename">Codename</label>
          <input class="field-input" id="set-codename" value="${UI.escapeHtml(codename)}" maxlength="20" />
        </div>
        <div class="field">
          <label class="field-label" for="set-weight">Target berat badan (kg)</label>
          <input class="field-input" id="set-weight" type="number" value="${targets.weight_kg ?? ""}" />
        </div>
        <div class="field">
          <label class="field-label" for="set-pushup">Target push-up KAI</label>
          <input class="field-input" id="set-pushup" type="number" value="${targets.pushup_target ?? ""}" />
        </div>
        <div class="field">
          <label class="field-label" for="set-situp">Target sit-up KAI</label>
          <input class="field-input" id="set-situp" type="number" value="${targets.situp_target ?? ""}" />
        </div>
        <button class="btn btn-secondary" data-action="save-profile">SIMPAN PROFILE</button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Notifikasi</div>
        <div class="toggle-row">
          <span class="text-body">Push Notification</span>
          <button class="toggle-switch ${settings.notification_enabled ? "is-on" : ""}" data-action="toggle-notif" aria-pressed="${settings.notification_enabled}" aria-label="Aktifkan push notification"></button>
        </div>
        <div class="field mt-md">
          <label class="field-label" for="set-notif-time">Jam notifikasi</label>
          <input class="field-input" id="set-notif-time" type="time" value="${settings.notification_time}" />
        </div>
        <label class="field-label mt-md">Pesan Preset</label>
        ${presetsHTML}
        <button class="btn btn-secondary mt-sm" data-action="save-notif-settings">SIMPAN NOTIFIKASI</button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Push Server (Notifikasi Terjadwal)</div>
        <p class="text-caption mb-sm">Push Notification biasa cuma jalan kalau app dibuka. Sambungkan ke push-server kamu sendiri (gratis, Cloudflare Worker — lihat push-server/README.md) supaya notifikasi tetap masuk tepat jam target walau app tertutup.</p>
        <div class="field">
          <label class="field-label" for="push-worker-url">Push Server URL</label>
          <input class="field-input" id="push-worker-url" value="${UI.escapeHtml(pushWorkerUrl)}" placeholder="https://villain-arc-push.namamu.workers.dev" />
        </div>
        <p class="text-caption mb-sm" id="push-status">${pushSubscribed ? "✅ Aktif — notifikasi terjadwal jalan lewat push server." : "Belum aktif."}</p>
        <div class="flex-between" style="gap:var(--space-sm)">
          <button class="btn btn-secondary" data-action="subscribe-push">Aktifkan Push Server</button>
          <button class="btn btn-ghost" data-action="test-push">Kirim Tes Notifikasi</button>
        </div>
        ${pushSubscribed ? `<button class="btn btn-ghost mt-sm" data-action="unsubscribe-push">Nonaktifkan</button>` : ""}
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Anti-PMO Tracker</div>
        <div class="toggle-row">
          <span class="text-body">Aktifkan Tracker</span>
          <button class="toggle-switch ${settings.pmo_tracker_enabled ? "is-on" : ""}" data-action="toggle-pmo" aria-pressed="${settings.pmo_tracker_enabled}" aria-label="Aktifkan Anti-PMO Tracker"></button>
        </div>
        ${settings.pmo_tracker_enabled ? `
          <div class="flex-between mt-md">
            <span class="text-body">Clean Days: <strong class="mono">${AppData.getPmoStreak()}</strong></span>
            <button class="btn btn-danger" style="width:auto;padding:0 var(--space-md)" data-action="reset-pmo">RESET</button>
          </div>` : ""}
      </div>

      <div class="settings-section">
        <div class="settings-section-title">Jadwal Latihan ${AppData.getCustomSchedule() ? '<span class="text-caption">(Custom)</span>' : ""}</div>
        ${scheduleHTML}
        <button class="btn btn-secondary mt-sm" data-action="edit-schedule">EDIT JADWAL</button>
      </div>

      <div class="settings-section">
        <div class="settings-section-title">AI Coach</div>
        <p class="text-caption mb-md">"Bring your own key" — API key kamu TERSIMPAN LOKAL saja di device ini, dan panggilan dibuat LANGSUNG dari browser ke provider (VILLAIN ARC tidak punya server, jadi tidak ada perantara). Siapa pun yang bisa akses device/browser ini bisa melihat key-nya. Pakai cuma di device pribadi.</p>
        <div class="toggle-row">
          <span class="text-body">Aktifkan AI Coach</span>
          <button class="toggle-switch ${aiSettings.enabled ? "is-on" : ""}" data-action="toggle-ai-coach" aria-pressed="${aiSettings.enabled}" aria-label="Aktifkan AI Coach"></button>
        </div>
        <div class="field mt-md">
          <label class="field-label" for="ai-provider">Provider</label>
          <select class="field-input" id="ai-provider">
            <option value="anthropic" ${aiSettings.provider === "anthropic" ? "selected" : ""}>Anthropic (Claude)</option>
            <option value="openai" ${aiSettings.provider === "openai" ? "selected" : ""}>OpenAI (ChatGPT)</option>
            <option value="gemini" ${aiSettings.provider === "gemini" ? "selected" : ""}>Google (Gemini)</option>
          </select>
        </div>
        <div class="field">
          <label class="field-label" for="ai-model">Model</label>
          <div class="flex-between" style="gap:var(--space-sm)">
            <input class="field-input" id="ai-model" list="ai-model-list" value="${UI.escapeHtml(aiSettings.model)}" placeholder="mis. claude-sonnet-5, gpt-4o-mini, gemini-2.5-flash" />
            <button type="button" class="btn btn-ghost" style="width:auto;white-space:nowrap" data-action="load-ai-models">Muat Model</button>
          </div>
          <datalist id="ai-model-list"></datalist>
          <p class="text-caption mt-sm" id="ai-model-status"></p>
        </div>
        <div class="field">
          <label class="field-label" for="ai-key">API Key</label>
          <input class="field-input" id="ai-key" type="password" value="${UI.escapeHtml(aiSettings.apiKey)}" placeholder="sk-ant-... / sk-... / AIza..." autocomplete="off" />
        </div>
        <p class="text-caption mb-sm">AI Coach bisa mengusulkan perubahan jadwal/target/notifikasi langsung dari chat.</p>
        <div class="toggle-row">
          <span class="text-body">Auto-Terapkan (Full-Auto)</span>
          <button class="toggle-switch ${aiSettings.autoApply ? "is-on" : ""}" data-action="toggle-ai-autoapply" aria-pressed="${aiSettings.autoApply}" aria-label="Auto-terapkan usulan AI Coach"></button>
        </div>
        <p class="text-caption mb-sm">${aiSettings.autoApply
          ? "⚠️ AKTIF: AI langsung mengeksekusi perubahan jadwal/target/notifikasi begitu ia memutuskan itu perlu, berdasarkan perbandingan progress vs target — TANPA konfirmasi kamu dulu. Setiap perubahan tetap tercatat di chat supaya bisa kamu cek/undo manual."
          : "Nonaktif: tiap usulan AI muncul sebagai kartu di chat dengan tombol Terapkan/Tolak, kamu yang putuskan."}</p>
        <div class="toggle-row">
          <span class="text-body">Akses Internet (Web Search)</span>
          <button class="toggle-switch ${aiSettings.webSearch ? "is-on" : ""}" data-action="toggle-ai-websearch" aria-pressed="${aiSettings.webSearch}" aria-label="Aktifkan pencarian web AI Coach"></button>
        </div>
        <p class="text-caption mb-sm">${aiSettings.provider === "openai"
          ? "⚠️ Provider OpenAI (chat/completions) di build ini belum mendukung pencarian web native — toggle ini hanya aktif untuk Anthropic & Gemini. Ganti provider kalau mau fitur ini."
          : (aiSettings.webSearch
            ? "🌐 AKTIF: Coach boleh riset ke internet (nutrisi, sains olahraga, teknik, dsb) dan gabungkan dengan data progress kamu sebelum menjawab/mengusulkan perubahan — bukan cuma modal data internal."
            : "Nonaktif: Coach cuma jawab dari data kamu + pengetahuan bawaan model, tanpa riset internet real-time.")}</p>
        <button class="btn btn-secondary mb-sm" data-action="save-ai-settings">SIMPAN AI COACH</button>
        <button class="btn btn-ghost" data-action="test-ai-connection">Test Koneksi</button>
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

  renderScheduleEditor() {
    const schedule = AppData.getSchedule();
    const dayLabels = { monday: "Senin", tuesday: "Selasa", wednesday: "Rabu", thursday: "Kamis", friday: "Jumat", saturday: "Sabtu", sunday: "Minggu" };
    const dayRows = DAY_KEYS.filter((k) => k !== "sunday").concat(["sunday"]).map((key) => {
      const currentType = schedule[key].type;
      const options = SCHEDULE_TEMPLATES.map((t) =>
        `<option value="${t.type}" ${t.type === currentType ? "selected" : ""}>${t.emoji} ${UI.escapeHtml(t.label)}</option>`
      ).join("");
      return `
        <div class="field">
          <label class="field-label" for="sched-${key}">${dayLabels[key]}</label>
          <select class="field-input" id="sched-${key}" data-day="${key}">${options}</select>
          <button class="btn btn-ghost mt-sm" style="min-height:36px" data-action="edit-exercises" data-day="${key}" aria-label="Edit exercise untuk ${dayLabels[key]}">✏️ Edit Exercise</button>
        </div>`;
    }).join("");

    UI.openModal(`
      <div class="modal-handle"></div>
      <h3 class="heading-m mb-md">Edit Jadwal</h3>
      <p class="text-caption mb-md">Susun ulang harimu sendiri. Perubahan berlaku mulai sekarang — progress yang sudah tercatat tidak diubah.</p>
      ${dayRows}
      <button class="btn btn-secondary mb-sm" data-action="save-schedule">SIMPAN JADWAL</button>
      <button class="btn btn-ghost" data-action="reset-schedule">Kembali ke Default</button>
    `);
  },

  saveScheduleEdit() {
    const selects = document.querySelectorAll("select[data-day]");
    const newSchedule = {};
    selects.forEach((sel) => {
      const template = SCHEDULE_TEMPLATES.find((t) => t.type === sel.value);
      if (!template) return;
      // Deep clone supaya tiap hari punya array exercises miliknya sendiri,
      // bukan reference bersama ke SCHEDULE_TEMPLATES.
      newSchedule[sel.dataset.day] = JSON.parse(JSON.stringify(template));
    });
    AppData.setCustomSchedule(newSchedule);
    UI.closeModal();
    UI.toast("Jadwal baru disimpan. Waktumu, aturanmu.");
    this.renderSettings();
  },

  resetScheduleToDefault() {
    AppData.setCustomSchedule(null);
    UI.closeModal();
    UI.toast("Jadwal dikembalikan ke default.");
    this.renderSettings();
  },

  editDayExercises(dayKey) {
    // Baca tipe hari dari dropdown yang sedang tampil (kalau modal Edit
    // Jadwal masih terbuka) — supaya kalau user BARU SAJA ganti tipe di
    // dropdown (belum klik SIMPAN JADWAL), exercise yang muncul mengikuti
    // tipe baru itu, bukan tipe lama yang masih tersimpan.
    const select = document.getElementById(`sched-${dayKey}`);
    const currentDay = AppData.getSchedule()[dayKey];
    const type = select ? select.value : currentDay.type;
    const baseExercises = currentDay.type === type
      ? currentDay.exercises
      : (SCHEDULE_TEMPLATES.find((t) => t.type === type)?.exercises || []);

    this.state.exerciseEditDay = dayKey;
    this.state.exerciseEditType = type;
    this.state.exerciseEditList = JSON.parse(JSON.stringify(baseExercises));
    this.renderExerciseEditor();
  },

  renderExerciseEditor() {
    const type = this.state.exerciseEditType;
    const template = SCHEDULE_TEMPLATES.find((t) => t.type === type);

    if (type === "REST") {
      UI.openModal(`
        <div class="modal-handle"></div>
        <h3 class="heading-m mb-md">${template.emoji} ${UI.escapeHtml(template.label)}</h3>
        <p class="text-body">Hari istirahat tidak punya exercise untuk diedit.</p>
        <button class="btn btn-ghost mt-md" data-action="cancel-exercise-edit">Kembali</button>
      `);
      return;
    }

    const list = this.state.exerciseEditList;
    const rowsHTML = list.map((ex, i) => `
      <div class="exercise-edit-row mb-md" data-idx="${i}">
        <div class="field">
          <label class="field-label" for="ex-name-${i}">Nama exercise ${i + 1}</label>
          <input class="field-input" id="ex-name-${i}" data-field="name" value="${UI.escapeHtml(ex.name || "")}" placeholder="mis. Push-Up" />
        </div>
        <div class="field">
          <label class="field-label" for="ex-target-${i}">Target</label>
          <input class="field-input" id="ex-target-${i}" data-field="target" value="${UI.escapeHtml(ex.target || "")}" placeholder="mis. 12-15 reps" />
        </div>
        <div class="flex-between" style="gap:var(--space-sm);align-items:flex-end">
          <div class="field" style="flex:1;margin-bottom:0">
            <label class="field-label" for="ex-sets-${i}">Set</label>
            <input class="field-input" id="ex-sets-${i}" type="number" min="1" max="10" data-field="sets" value="${ex.sets || 1}" />
          </div>
          <div class="field" style="flex:1;margin-bottom:0">
            <label class="field-label" for="ex-type-${i}">Tipe</label>
            <select class="field-input" id="ex-type-${i}" data-field="inputType">
              <option value="reps" ${ex.inputType !== "duration" ? "selected" : ""}>Reps</option>
              <option value="duration" ${ex.inputType === "duration" ? "selected" : ""}>Durasi</option>
            </select>
          </div>
        </div>
        <button class="btn btn-danger mt-sm" style="width:auto;padding:0 var(--space-md)" data-action="remove-exercise-row" data-idx="${i}" aria-label="Hapus exercise ${UI.escapeHtml(ex.name || String(i + 1))}">Hapus</button>
      </div>
    `).join("");

    UI.openModal(`
      <div class="modal-handle"></div>
      <h3 class="heading-m mb-md">Edit Exercise — ${template.emoji} ${UI.escapeHtml(template.label)}</h3>
      <div id="exercise-rows">${rowsHTML || '<p class="text-caption mb-md">Belum ada exercise. Tambah di bawah.</p>'}</div>
      <button class="btn btn-ghost mb-md" data-action="add-exercise-row">+ Tambah Exercise</button>
      <button class="btn btn-secondary mb-sm" data-action="save-exercise-list">SIMPAN EXERCISE</button>
      <button class="btn btn-ghost" data-action="cancel-exercise-edit">Batal</button>
    `);
  },

  syncExerciseRowsFromDOM() {
    const rows = document.querySelectorAll("#exercise-rows .exercise-edit-row");
    const list = [];
    rows.forEach((row) => {
      list.push({
        name: row.querySelector('[data-field="name"]').value.trim(),
        target: row.querySelector('[data-field="target"]').value.trim(),
        sets: Math.max(1, parseInt(row.querySelector('[data-field="sets"]').value, 10) || 1),
        inputType: row.querySelector('[data-field="inputType"]').value
      });
    });
    this.state.exerciseEditList = list;
  },

  addExerciseRow() {
    this.syncExerciseRowsFromDOM();
    this.state.exerciseEditList.push({ name: "", target: "", sets: 3, inputType: "reps" });
    this.renderExerciseEditor();
  },

  removeExerciseRow(idx) {
    this.syncExerciseRowsFromDOM();
    this.state.exerciseEditList.splice(idx, 1);
    this.renderExerciseEditor();
  },

  slugify(str) {
    return (str || "").toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "exercise";
  },

  saveExerciseList() {
    this.syncExerciseRowsFromDOM();
    const dayKey = this.state.exerciseEditDay;
    const type = this.state.exerciseEditType;
    const template = SCHEDULE_TEMPLATES.find((t) => t.type === type);

    const usedIds = new Set();
    const cleaned = this.state.exerciseEditList
      .filter((ex) => ex.name && ex.name.trim()) // buang baris kosong/spasi-doang
      .map((ex) => {
        const base = this.slugify(ex.name);
        let id = base, n = 2;
        while (usedIds.has(id)) { id = `${base}-${n}`; n++; }
        usedIds.add(id);
        return { id, name: ex.name, target: ex.target, sets: ex.sets, inputType: ex.inputType, muscleGroup: "", notes: "" };
      });

    if (cleaned.length === 0) {
      UI.toast("Minimal 1 exercise. Pilih ISTIRAHAT TOTAL kalau memang mau kosong.");
      return;
    }

    // Mulai dari schedule EFEKTIF saat ini (custom kalau sudah ada, kalau
    // belum ada clone dari default) supaya hari LAIN yang belum diubah tetap
    // aman — cuma hari yang sedang diedit yang berubah.
    const base = AppData.getCustomSchedule() || JSON.parse(JSON.stringify(WORKOUT_SCHEDULE_DEFAULT));
    base[dayKey] = { type: template.type, label: template.label, color: template.color, emoji: template.emoji, exercises: cleaned };
    AppData.setCustomSchedule(base);

    UI.closeModal();
    UI.toast("Exercise tersimpan.");
    this.renderSettings();
  },

  cancelExerciseEdit() {
    this.renderScheduleEditor();
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

  async subscribePush() {
    const url = document.getElementById("push-worker-url")?.value.trim();
    if (!url) { UI.toast("Isi Push Server URL dulu (lihat push-server/README.md)."); return; }
    const status = document.getElementById("push-status");
    if (status) status.textContent = "Mendaftarkan...";
    try {
      await Notifications.subscribeToPush(url);
      UI.toast("Push server aktif — notifikasi akan masuk sesuai jam yang di-set.");
      this.renderSettings();
    } catch (err) {
      if (status) status.textContent = `⚠️ ${err.message}`;
      UI.toast(err.message);
    }
  },

  async unsubscribePush() {
    await Notifications.unsubscribeFromPush();
    UI.toast("Push server dinonaktifkan.");
    this.renderSettings();
  },

  async testPush() {
    const url = document.getElementById("push-worker-url")?.value.trim() || Store.get("va_push_worker_url", "");
    if (!url) { UI.toast("Isi & aktifkan Push Server URL dulu."); return; }
    const status = document.getElementById("push-status");
    try {
      await Notifications.sendTestPush(url);
      if (status) status.textContent = "Tes terkirim — cek notifikasi HP kamu (beberapa detik).";
    } catch (err) {
      if (status) status.textContent = `⚠️ ${err.message}`;
      UI.toast(err.message);
    }
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

  saveAISettings() {
    const provider = document.getElementById("ai-provider").value;
    const model = document.getElementById("ai-model").value.trim();
    const apiKey = document.getElementById("ai-key").value.trim();
    AppData.setAISettings({ provider, model, apiKey });
    UI.toast("Pengaturan AI Coach tersimpan.");
    this.renderSettings();
  },

  async loadAIModels() {
    const provider = document.getElementById("ai-provider")?.value || "anthropic";
    const apiKey = document.getElementById("ai-key")?.value.trim();
    const status = document.getElementById("ai-model-status");
    const datalist = document.getElementById("ai-model-list");
    if (!apiKey) { UI.toast("Isi API key dulu."); return; }
    if (status) status.textContent = "Memuat daftar model...";
    try {
      const models = await AICoach.fetchModels(provider, apiKey);
      if (datalist) datalist.innerHTML = models.map((m) => `<option value="${UI.escapeHtml(m)}"></option>`).join("");
      if (status) status.textContent = models.length ? `${models.length} model ditemukan — pilih dari saran di field Model.` : "Tidak ada model ditemukan.";
    } catch (err) {
      if (status) status.textContent = `⚠️ ${err.message}`;
    }
  },

  toggleAICoach() {
    const aiSettings = AppData.getAISettings();
    if (!aiSettings.enabled && !aiSettings.apiKey) {
      UI.toast("Isi & simpan API key dulu sebelum mengaktifkan.");
      return;
    }
    AppData.setAISettings({ enabled: !aiSettings.enabled });
    this.renderSettings();
  },

  toggleAIAutoApply() {
    const aiSettings = AppData.getAISettings();
    AppData.setAISettings({ autoApply: !aiSettings.autoApply });
    this.renderSettings();
  },

  toggleAIWebSearch() {
    const aiSettings = AppData.getAISettings();
    AppData.setAISettings({ webSearch: !aiSettings.webSearch });
    this.renderSettings();
  },

  async testAIConnection() {
    // Baca nilai LIVE dari form (belum tentu sudah di-klik SIMPAN) supaya
    // user bisa test dulu sebelum commit.
    const provider = document.getElementById("ai-provider")?.value || "anthropic";
    const model = document.getElementById("ai-model")?.value.trim();
    const apiKey = document.getElementById("ai-key")?.value.trim();
    if (!apiKey) {
      UI.toast("Isi API key dulu.");
      return;
    }
    UI.toast("Menguji koneksi...");
    try {
      await AICoach.testConnection({ provider, model, apiKey });
      UI.toast("✅ Koneksi berhasil. API key valid.");
    } catch (err) {
      UI.toast(`⚠️ ${err.message}`);
    }
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
      case "edit-schedule": this.renderScheduleEditor(); break;
      case "save-schedule": this.saveScheduleEdit(); break;
      case "reset-schedule": this.resetScheduleToDefault(); break;
      case "edit-exercises": this.editDayExercises(btn.dataset.day); break;
      case "add-exercise-row": this.addExerciseRow(); break;
      case "remove-exercise-row": this.removeExerciseRow(parseInt(btn.dataset.idx, 10)); break;
      case "save-exercise-list": this.saveExerciseList(); break;
      case "cancel-exercise-edit": this.cancelExerciseEdit(); break;
      case "toggle-notif": this.toggleNotif(); break;
      case "select-preset": this.selectPreset(btn.dataset.msg); break;
      case "save-notif-settings": this.saveNotifSettings(); break;
      case "subscribe-push": this.subscribePush(); break;
      case "unsubscribe-push": this.unsubscribePush(); break;
      case "test-push": this.testPush(); break;
      case "toggle-pmo": this.togglePmo(); break;
      case "save-ai-settings": this.saveAISettings(); break;
      case "toggle-ai-coach": this.toggleAICoach(); break;
      case "toggle-ai-autoapply": this.toggleAIAutoApply(); break;
      case "toggle-ai-websearch": this.toggleAIWebSearch(); break;
      case "test-ai-connection": this.testAIConnection(); break;
      case "load-ai-models": this.loadAIModels(); break;
      case "apply-ai-proposal": this.applyAIProposal(btn.dataset.id); break;
      case "reject-ai-proposal": this.rejectAIProposal(btn.dataset.id); break;
      case "clear-coach-history": this.clearCoachHistory(); break;
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

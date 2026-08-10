// ============================================================
// VILLAIN ARC — AI Coach ("bring your own API key")
// ------------------------------------------------------------
// Arsitektur: API key user disimpan HANYA di localStorage device ini.
// Panggilan API dibuat LANGSUNG dari browser ke Anthropic/OpenAI, tanpa
// server perantara milik VILLAIN ARC (memang tidak ada server — app ini
// 100% statis). Konsekuensinya, siapa pun yang punya akses ke device/browser
// ini bisa melihat key tersebut, dan key ikut terlihat di tab Network browser
// saat request dikirim. Ini pola "bring your own key" standar untuk app
// client-side — bukan bug, tapi trade-off yang harus disadari user (makanya
// selalu ditampilkan sebagai peringatan eksplisit di Settings, bukan
// disembunyikan).
// ============================================================

const AICoach = {
  MAX_HISTORY_STORED: 40, // jumlah pesan (user+assistant) yang disimpan di localStorage
  MAX_HISTORY_SENT: 12,   // jumlah pesan terakhir yang dikirim sebagai konteks ke API tiap request

  /**
   * Rangkum data pengguna saat ini jadi teks terstruktur untuk system prompt,
   * supaya AI Coach kasih saran yang GROUNDED ke data asli, bukan generik.
   */
  async buildContextSummary() {
    const codename = AppData.getCodename();
    const xp = AppData.getXP();
    const rank = Gamification.getRankForXP(xp);
    const streak = AppData.getStreak();
    const longestStreak = AppData.getLongestStreak();
    const targets = AppData.getTargets();
    const schedule = AppData.getSchedule();
    const now = new Date();
    const todayKey = Gamification.dayKeyFromDate(now);
    const today = schedule[todayKey];
    const achievements = AppData.getAchievements();
    const prs = AppData.getPersonalRecords();
    const settings = AppData.getSettings();

    // Pola 14 hari terakhir: hari apa saja yang di-skip vs selesai, supaya AI
    // bisa lihat pola nyata ("sering skip Rabu", dsb) — bukan cuma tebak-tebak.
    const logs = await WorkoutLogs.all();
    const logMap = {};
    logs.forEach((l) => { logMap[l.date] = l; });
    const last14 = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dKey = Gamification.dayKeyFromDate(d);
      const dayDef = schedule[dKey];
      const dateStr = Gamification.dateKey(d);
      const log = logMap[dateStr];
      if (dayDef.type === "REST") {
        last14.push(`${dateStr} (${dKey}): REST`);
      } else if (log && log.allCompleted) {
        last14.push(`${dateStr} (${dKey}): SELESAI — ${dayDef.type}`);
      } else if (i === 0) {
        last14.push(`${dateStr} (${dKey}): hari ini, belum selesai — ${dayDef.type}`);
      } else {
        last14.push(`${dateStr} (${dKey}): DI-SKIP — ${dayDef.type}`);
      }
    }

    const prLines = Object.values(prs).slice(0, 10).map((p) => `${p.name}: ${p.value}`).join("; ") || "belum ada";

    return [
      `Codename: ${codename}`,
      `Rank: ${rank.name} (Level ${rank.level}), XP: ${xp}`,
      `Streak saat ini: ${streak} hari (rekor terpanjang: ${longestStreak} hari)`,
      `Target: berat ${targets.weight_kg ?? "belum diisi"} kg, push-up KAI ${targets.pushup_target}, sit-up KAI ${targets.situp_target}`,
      `Hari ini (${todayKey}): ${today.label} (${today.type})`,
      `Achievement terbuka: ${achievements.length}/${ACHIEVEMENTS.length}`,
      `Personal record: ${prLines}`,
      settings.pmo_tracker_enabled ? `Anti-PMO Clean Days: ${AppData.getPmoStreak()}` : null,
      `14 hari terakhir:\n${last14.join("\n")}`
    ].filter(Boolean).join("\n");
  },

  systemPrompt(context) {
    return `Kamu adalah "COACH" — pelatih pribadi di dalam aplikasi VILLAIN ARC, fitness tracker RPG bertema dark-villain. Nada bicaramu tajam, provokatif, tanpa basa-basi ala villain anime, TAPI selalu jujur dan berbasis data nyata pengguna — jangan cuma motivasi kosong. Jawab dalam Bahasa Indonesia, ringkas (idealnya di bawah 150 kata kecuali diminta detail), dan actionable — kasih langkah konkret, bukan cuma semangat-semangatan. Kalau data menunjukkan pola buruk (sering skip, target ketinggalan, dst), tegur dengan tegas tapi tetap membangun. Kamu TIDAK bisa mengubah data aplikasi (jadwal, XP, dsb) secara langsung — kalau user minta perubahan konkret, arahkan mereka ke halaman/tombol yang tepat di app (mis. "Command Center > Edit Jadwal").

DATA PENGGUNA SAAT INI:
${context}`;
  },

  async sendMessage(userText) {
    const settings = AppData.getAISettings();
    if (!settings.enabled) throw new Error("AI Coach belum diaktifkan. Aktifkan dulu di Command Center.");
    if (!settings.apiKey) throw new Error("API key belum diisi. Masukkan di Command Center > AI Coach.");

    const history = AppData.getAIChatHistory();
    history.push({ role: "user", content: userText, ts: Date.now() });

    const context = await this.buildContextSummary();
    const system = this.systemPrompt(context);
    const recent = history.slice(-this.MAX_HISTORY_SENT);

    const replyText = settings.provider === "openai"
      ? await this._callOpenAI(settings, system, recent)
      : await this._callAnthropic(settings, system, recent);

    history.push({ role: "assistant", content: replyText, ts: Date.now() });
    AppData.setAIChatHistory(history.slice(-this.MAX_HISTORY_STORED));
    return replyText;
  },

  async _callAnthropic(settings, systemPrompt, history) {
    let res;
    try {
      res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": settings.apiKey,
          "anthropic-version": "2023-06-01",
          "content-type": "application/json",
          // Wajib untuk panggilan langsung dari browser (CORS) — tanpa header
          // ini Anthropic menolak request dari client-side dengan authentication_error.
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify({
          model: settings.model || "claude-sonnet-5",
          max_tokens: 1024,
          system: systemPrompt,
          messages: history.map((m) => ({ role: m.role, content: m.content }))
        })
      });
    } catch (e) {
      throw new Error("Gagal menghubungi Anthropic API. Cek koneksi internet.");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `Anthropic API error (HTTP ${res.status})`);
    }
    const data = await res.json();
    const textBlock = (data.content || []).find((b) => b.type === "text");
    return textBlock ? textBlock.text : "(tidak ada respons teks)";
  },

  async _callOpenAI(settings, systemPrompt, history) {
    let res;
    try {
      res = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${settings.apiKey}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          model: settings.model || "gpt-4o-mini",
          messages: [{ role: "system", content: systemPrompt }, ...history.map((m) => ({ role: m.role, content: m.content }))]
        })
      });
    } catch (e) {
      throw new Error("Gagal menghubungi OpenAI API. Cek koneksi internet.");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `OpenAI API error (HTTP ${res.status})`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content || "(tidak ada respons teks)";
  },

  /** Panggilan super ringan buat validasi API key di tombol "Test Koneksi". */
  async testConnection(settings) {
    const probe = [{ role: "user", content: "Balas dengan tepat satu kata: OK" }];
    return settings.provider === "openai"
      ? this._callOpenAI(settings, "Kamu asisten uji koneksi. Ikuti instruksi user persis.", probe)
      : this._callAnthropic(settings, "Kamu asisten uji koneksi. Ikuti instruksi user persis.", probe);
  }
};

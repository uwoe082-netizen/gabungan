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

// ------------------------------------------------------------
// AGENTIC ACTIONS — daftar "tool" yang boleh diusulkan AI Coach.
// PENTING: AI TIDAK PERNAH langsung menulis ke storage. Setiap tool call
// yang balik dari API cuma jadi PROPOSAL (lihat App.applyAIProposal di
// app.js) yang wajib di-review & di-"Terapkan" manual oleh user lewat
// tombol di chat. Ini pilihan desain sadar: kasih AI kuasa reorganisasi
// jadwal/target/notifikasi TANPA membuatnya bisa mengubah data user secara
// diam-diam hanya karena API mengembalikan tool_use — user tetap yang
// pegang kendali terakhir atas datanya sendiri.
const AI_TOOL_DEFS = [
  {
    name: "propose_schedule_change",
    description: "Usulkan mengubah jenis latihan pada satu hari dalam seminggu (mis. ganti Selasa dari REST jadi PUSH). Tidak langsung diterapkan — hanya jadi usulan yang harus disetujui user.",
    parameters: {
      type: "object",
      properties: {
        day: { type: "string", enum: DAY_KEYS, description: "Hari yang diubah" },
        template_type: { type: "string", enum: [...new Set(SCHEDULE_TEMPLATES.map((t) => t.type))], description: "Tipe hari baru, ambil dari template yang sudah ada" },
        reason: { type: "string", description: "Alasan singkat berbasis data user" }
      },
      required: ["day", "template_type", "reason"]
    }
  },
  {
    name: "propose_targets_change",
    description: "Usulkan mengubah target berat badan dan/atau target reps KAI (push-up/sit-up). Field yang tidak diubah boleh dikosongkan/null.",
    parameters: {
      type: "object",
      properties: {
        weight_kg: { type: ["number", "null"], description: "Target berat badan baru (kg), null jika tidak diubah" },
        pushup_target: { type: ["number", "null"], description: "Target push-up KAI baru, null jika tidak diubah" },
        situp_target: { type: ["number", "null"], description: "Target sit-up KAI baru, null jika tidak diubah" },
        reason: { type: "string", description: "Alasan singkat berbasis data user" }
      },
      required: ["reason"]
    }
  },
  {
    name: "propose_notification_change",
    description: "Usulkan mengubah jam pengingat harian dan/atau isi pesan notifikasi.",
    parameters: {
      type: "object",
      properties: {
        notification_time: { type: "string", description: "Format HH:MM 24 jam, kosongkan jika tidak diubah" },
        notification_message: { type: "string", description: "Pesan notifikasi baru, kosongkan jika tidak diubah" },
        reason: { type: "string", description: "Alasan singkat berbasis data user" }
      },
      required: ["reason"]
    }
  }
];

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

  systemPrompt(context, autoApply, webSearchAvailable) {
    const autonomyClause = autoApply
      ? `Mode kamu sekarang FULL-AUTO: setiap tool call yang kamu panggil akan LANGSUNG diterapkan ke data user tanpa konfirmasi manual. Karena itu, WAJIB: (1) bandingkan dulu progress aktual user (14 hari terakhir, PR, streak) terhadap target/tujuan mereka sebelum memutuskan berubah apa, (2) hanya panggil tool kalau perbandingan itu benar-benar menunjukkan penyesuaian diperlukan (bukan asal-asalan tiap chat), (3) di teks balasanmu, jelaskan SINGKAT data mana yang jadi dasar keputusan (mis. "3 dari 4 minggu terakhir hari Rabu di-skip, jadi saya turunkan intensitas Rabu"), (4) jangan mengubah hal yang sama berkali-kali dalam waktu berdekatan tanpa data baru yang mendukung.`
      : `Kamu punya tools untuk MENGUSULKAN perubahan konkret ke jadwal/target/notifikasi user. Tool call itu TIDAK langsung mengubah data — akan ditampilkan ke user sebagai usulan yang harus mereka setujui manual (tombol Terapkan/Tolak di chat). Panggil tool kalau user secara eksplisit minta perubahan, atau kalau kamu lihat pola data yang jelas butuh penyesuaian dan mau mengusulkannya proaktif.`;

    const searchClause = webSearchAvailable
      ? `Kamu JUGA punya akses pencarian web real-time. Pakai itu buat mendasari saranmu pada pengetahuan luas yang up-to-date — bukan cuma data internal user — misalnya: riset terbaru soal progressive overload / periodisasi / recovery, rekomendasi kalori & protein per kg berat badan dari sumber kredibel (ACSM, NSCA, studi peer-review), teknik form yang benar untuk gerakan tertentu, atau cara mengatasi plateau. WAJIB cari kalau: user tanya sesuatu yang butuh info faktual di luar data mereka (nutrisi, teknik, sains olahraga, cedera), atau saat kamu mau mengusulkan perubahan besar dan ingin mengecek apakah itu selaras dengan best practice umum. Gabungkan temuan itu DENGAN data spesifik user (bukan cuma teori generik) supaya reason di tool call maupun jawabanmu berbasis DUA hal: pola data user + pengetahuan umum yang relevan. Jangan cari kalau pertanyaannya sudah jelas jawabannya dari data user saja atau cuma obrolan ringan — hemat pencarian buat yang benar-benar butuh.`
      : `Kamu TIDAK punya akses internet saat ini — jawab dari pengetahuan umum yang sudah kamu punya, dan bilang terus terang kalau sesuatu butuh verifikasi sumber terkini yang tidak bisa kamu akses sekarang.`;

    return `Kamu adalah "COACH" — pelatih pribadi di dalam aplikasi VILLAIN ARC, fitness tracker RPG bertema dark-villain. Nada bicaramu tajam, provokatif, tanpa basa-basi ala villain anime, TAPI selalu jujur dan berbasis data nyata pengguna — jangan cuma motivasi kosong. Jawab dalam Bahasa Indonesia, ringkas (idealnya di bawah 150 kata kecuali diminta detail), dan actionable — kasih langkah konkret, bukan cuma semangat-semangatan. Kalau data menunjukkan pola buruk (sering skip, target ketinggalan, dst), tegur dengan tegas tapi tetap membangun.

Setiap kali mempertimbangkan perubahan, selalu bandingkan progress AKTUAL user (lihat "14 hari terakhir", personal record, streak, di bawah) terhadap TARGET/TUJUAN yang mereka set (target berat, target push-up/sit-up KAI). Contoh penalaran: kalau push-up KAI user masih jauh di bawah target dan tren PR stagnan, itu alasan valid buat naikkan volume/adjust jadwal — bukan sekadar tebakan.

${searchClause}

${autonomyClause} Selalu sertakan field "reason" yang jujur dan berbasis data spesifik di atas tiap tool call.

DATA PENGGUNA SAAT INI:
${context}`;
  },

  /** Ambil hanya field berguna dari tool input jadi objek proposal siap-tampil. */
  _normalizeProposal(name, input) {
    const labels = {
      propose_schedule_change: "Usulan Ubah Jadwal",
      propose_targets_change: "Usulan Ubah Target",
      propose_notification_change: "Usulan Ubah Notifikasi"
    };
    return { id: `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: name, label: labels[name] || name, input, applied: false };
  },

  async sendMessage(userText) {
    const settings = AppData.getAISettings();
    if (!settings.enabled) throw new Error("AI Coach belum diaktifkan. Aktifkan dulu di Command Center.");
    if (!settings.apiKey) throw new Error("API key belum diisi. Masukkan di Command Center > AI Coach.");

    const history = AppData.getAIChatHistory();
    history.push({ role: "user", content: userText, ts: Date.now() });

    const context = await this.buildContextSummary();
    const webSearchAvailable = !!settings.webSearch && settings.provider !== "openai"; // OpenAI chat/completions endpoint belum dukung web search native
    const system = this.systemPrompt(context, !!settings.autoApply, webSearchAvailable);
    const recent = history.slice(-this.MAX_HISTORY_SENT);

    let result;
    if (settings.provider === "openai") result = await this._callOpenAI(settings, system, recent);
    else if (settings.provider === "gemini") result = await this._callGemini(settings, system, recent, true, webSearchAvailable);
    else result = await this._callAnthropic(settings, system, recent, true, webSearchAvailable);

    const replyText = result.text || (result.proposals.length ? "(Coach mengusulkan perubahan berikut — review & terapkan kalau setuju.)" : "(tidak ada respons teks)");
    history.push({ role: "assistant", content: replyText, ts: Date.now() });
    AppData.setAIChatHistory(history.slice(-this.MAX_HISTORY_STORED));
    return { text: replyText, proposals: result.proposals, autoApply: !!settings.autoApply };
  },

  async _callAnthropic(settings, systemPrompt, history, useTools = true, webSearch = false) {
    const tools = useTools ? AI_TOOL_DEFS.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters })) : [];
    // Tool pencarian web bawaan Anthropic — server-side, hasilnya otomatis
    // diproses & dikutip Claude sendiri dalam blok teks balasannya.
    if (webSearch) tools.push({ type: "web_search_20250305", name: "web_search", max_uses: 4 });
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
          max_tokens: 1536,
          system: systemPrompt,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
          ...(tools.length ? { tools } : {})
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
    const blocks = data.content || [];
    // Blok teks bisa lebih dari satu kalau ada web_search_tool_result di antaranya — gabung semua teks jadi satu balasan.
    const text = blocks.filter((b) => b.type === "text").map((b) => b.text).join("\n").trim();
    const proposals = blocks.filter((b) => b.type === "tool_use").map((b) => this._normalizeProposal(b.name, b.input));
    return { text, proposals };
  },

  async _callOpenAI(settings, systemPrompt, history, useTools = true) {
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
          messages: [{ role: "system", content: systemPrompt }, ...history.map((m) => ({ role: m.role, content: m.content }))],
          ...(useTools ? { tools: AI_TOOL_DEFS.map((t) => ({ type: "function", function: { name: t.name, description: t.description, parameters: t.parameters } })) } : {})
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
    const msg = data.choices?.[0]?.message || {};
    const text = (msg.content || "").trim();
    const proposals = (msg.tool_calls || []).map((tc) => {
      let input = {};
      try { input = JSON.parse(tc.function.arguments || "{}"); } catch (e) { /* ignore malformed args */ }
      return this._normalizeProposal(tc.function.name, input);
    });
    return { text, proposals };
  },

  async _callGemini(settings, systemPrompt, history, useTools = true, webSearch = false) {
    const model = settings.model || "gemini-2.5-flash";
    const tools = [];
    if (useTools) tools.push({ functionDeclarations: AI_TOOL_DEFS.map((t) => ({ name: t.name, description: t.description, parameters: t.parameters })) });
    // Grounding pencarian Google bawaan Gemini. Catatan: Gemini tidak selalu
    // mengizinkan menggabungkan google_search dengan function-calling custom
    // dalam satu request tergantung model — kalau API menolak kombinasi ini,
    // pesan error dari Gemini akan tampil apa adanya ke user di chat.
    if (webSearch) tools.push({ google_search: {} });
    let res;
    try {
      res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(settings.apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: history.map((m) => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
          ...(tools.length ? { tools } : {})
        })
      });
    } catch (e) {
      throw new Error("Gagal menghubungi Gemini API. Cek koneksi internet.");
    }
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body?.error?.message || `Gemini API error (HTTP ${res.status})`);
    }
    const data = await res.json();
    const parts = data.candidates?.[0]?.content?.parts || [];
    const text = parts.filter((p) => p.text).map((p) => p.text).join("\n").trim();
    const proposals = parts.filter((p) => p.functionCall).map((p) => this._normalizeProposal(p.functionCall.name, p.functionCall.args || {}));
    return { text, proposals };
  },

  /** Panggilan super ringan buat validasi API key di tombol "Test Koneksi". */
  async testConnection(settings) {
    const probe = [{ role: "user", content: "Balas dengan tepat satu kata: OK" }];
    const sys = "Kamu asisten uji koneksi. Ikuti instruksi user persis.";
    if (settings.provider === "openai") return (await this._callOpenAI(settings, sys, probe, false)).text;
    if (settings.provider === "gemini") return (await this._callGemini(settings, sys, probe, false)).text;
    return (await this._callAnthropic(settings, sys, probe, false)).text;
  },

  /** Ambil daftar model dari provider (dipakai buat isi datalist "Model" di Command Center). */
  async fetchModels(provider, apiKey) {
    if (!apiKey) throw new Error("Isi API key dulu.");
    if (provider === "openai") {
      const res = await fetch("https://api.openai.com/v1/models", { headers: { "Authorization": `Bearer ${apiKey}` } });
      if (!res.ok) throw new Error(`OpenAI API error (HTTP ${res.status})`);
      const data = await res.json();
      return (data.data || [])
        .map((m) => m.id)
        .filter((id) => /^(gpt-|o[1-9])/.test(id))
        .sort();
    }
    if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(apiKey)}`);
      if (!res.ok) throw new Error(`Gemini API error (HTTP ${res.status})`);
      const data = await res.json();
      return (data.models || [])
        .filter((m) => (m.supportedGenerationMethods || []).includes("generateContent"))
        .map((m) => m.name.replace(/^models\//, ""))
        .sort();
    }
    // anthropic
    const res = await fetch("https://api.anthropic.com/v1/models", {
      headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01", "anthropic-dangerous-direct-browser-access": "true" }
    });
    if (!res.ok) throw new Error(`Anthropic API error (HTTP ${res.status})`);
    const data = await res.json();
    return (data.data || []).map((m) => m.id).sort();
  }
};

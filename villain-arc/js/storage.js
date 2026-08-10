// ============================================================
// VILLAIN ARC — Storage abstraction (localStorage + IndexedDB)
// ============================================================

const LS_KEYS = {
  codename: "va_codename",
  targets: "va_targets",
  xp: "va_current_xp",
  level: "va_current_level",
  streak: "va_current_streak",
  longestStreak: "va_longest_streak",
  achievements: "va_achievements",
  settings: "va_settings",
  pmoStreak: "va_pmo_streak",
  pmoLastReset: "va_pmo_last_reset",
  customSchedule: "va_custom_schedule",
  quoteHistory: "va_quote_history",
  lastQuoteDate: "va_last_quote_date",
  onboarded: "va_onboarded",
  personalRecords: "va_personal_records",
  earlyRiserCount: "va_early_riser_count",
  dawnWarriorCount: "va_dawn_warrior_count",
  totalPushupReps: "va_total_pushup_reps",
  heartbreakCompletedCount: "va_heartbreak_completed_count",
  aiSettings: "va_ai_settings",
  aiChatHistory: "va_ai_chat_history"
};

const DEFAULT_SETTINGS = {
  notification_time: "04:55",
  notification_enabled: true,
  notification_message: NOTIFICATION_PRESETS ? NOTIFICATION_PRESETS[0] : "",
  pmo_tracker_enabled: false,
  sound_enabled: true
};

// AI Coach: "bring your own API key" — key TERSIMPAN LOKAL saja (localStorage
// di device ini) dan panggilan API dibuat LANGSUNG dari browser ke provider.
// Tidak pernah dikirim ke server manapun milik VILLAIN ARC (tidak ada server).
const DEFAULT_AI_SETTINGS = {
  enabled: false,
  provider: "anthropic", // "anthropic" | "openai" | "gemini"
  apiKey: "",
  model: "claude-sonnet-5",
  autoApply: false // true = usulan perubahan jadwal/target/notifikasi langsung dieksekusi tanpa konfirmasi
};

const Store = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      if (raw === null) return fallback;
      return JSON.parse(raw);
    } catch (e) {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (e) {
      console.error("Storage set failed", key, e);
      return false;
    }
  },
  remove(key) {
    localStorage.removeItem(key);
  },
  clearAll() {
    Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
    // va_reminder_seen_<tanggal> dibuat dinamis di notifications.js (di luar
    // LS_KEYS karena key-nya berubah tiap hari) — ikut disapu di sini supaya
    // "Reset Semua Data" benar-benar bersih total, bukan cuma yang terdaftar.
    Object.keys(localStorage)
      .filter((k) => k.startsWith("va_reminder_seen_"))
      .forEach((k) => localStorage.removeItem(k));
  }
};

// ---- Typed accessors ----
const AppData = {
  isOnboarded() { return Store.get(LS_KEYS.onboarded, false) === true; },
  setOnboarded(v) { Store.set(LS_KEYS.onboarded, v); },

  getCodename() { return Store.get(LS_KEYS.codename, "SHADOW"); },
  setCodename(v) { Store.set(LS_KEYS.codename, v || "SHADOW"); },

  getTargets() { return Store.get(LS_KEYS.targets, DEFAULT_TARGETS); },
  setTargets(v) { Store.set(LS_KEYS.targets, v); },

  getXP() { return Store.get(LS_KEYS.xp, 0); },
  setXP(v) { Store.set(LS_KEYS.xp, v); },
  addXP(amount) {
    const cur = this.getXP();
    const next = Math.max(0, cur + amount);
    this.setXP(next);
    return next;
  },

  getLevel() { return Store.get(LS_KEYS.level, 1); },
  setLevel(v) { Store.set(LS_KEYS.level, v); },

  getStreak() { return Store.get(LS_KEYS.streak, 0); },
  setStreak(v) { Store.set(LS_KEYS.streak, v); },

  getLongestStreak() { return Store.get(LS_KEYS.longestStreak, 0); },
  setLongestStreak(v) { Store.set(LS_KEYS.longestStreak, v); },

  getAchievements() { return Store.get(LS_KEYS.achievements, []); },
  unlockAchievement(id) {
    const list = this.getAchievements();
    if (!list.find((a) => a.id === id)) {
      list.push({ id, unlockedAt: new Date().toISOString() });
      Store.set(LS_KEYS.achievements, list);
      return true;
    }
    return false;
  },

  getSettings() { return Store.get(LS_KEYS.settings, DEFAULT_SETTINGS); },
  setSettings(v) { Store.set(LS_KEYS.settings, { ...DEFAULT_SETTINGS, ...v }); },

  // Clean Days dihitung LIVE dari selisih tanggal kalender ke pmoLastReset,
  // bukan angka statis. Sebelumnya nilai ini di-set ke 0 saat aktifkan/reset
  // dan tidak pernah bertambah lagi — jadi Clean Days permanen 0 dan
  // achievement "no-fap-warrior" (butuh >=30) mustahil didapat.
  getPmoStreak() {
    const lastReset = this.getPmoLastReset();
    if (!lastReset) return 0;
    const resetDate = new Date(lastReset);
    const now = new Date();
    const startOfReset = new Date(resetDate.getFullYear(), resetDate.getMonth(), resetDate.getDate());
    const startOfNow = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const msPerDay = 24 * 60 * 60 * 1000;
    const days = Math.round((startOfNow - startOfReset) / msPerDay);
    return Math.max(0, days);
  },
  setPmoStreak(v) { Store.set(LS_KEYS.pmoStreak, v); },
  getPmoLastReset() { return Store.get(LS_KEYS.pmoLastReset, null); },
  setPmoLastReset(v) { Store.set(LS_KEYS.pmoLastReset, v); },

  getCustomSchedule() { return Store.get(LS_KEYS.customSchedule, null); },
  setCustomSchedule(v) { Store.set(LS_KEYS.customSchedule, v); },
  getSchedule() { return this.getCustomSchedule() || WORKOUT_SCHEDULE_DEFAULT; },

  getQuoteHistory() { return Store.get(LS_KEYS.quoteHistory, []); },
  setQuoteHistory(v) { Store.set(LS_KEYS.quoteHistory, v); },
  getLastQuoteDate() { return Store.get(LS_KEYS.lastQuoteDate, null); },
  setLastQuoteDate(v) { Store.set(LS_KEYS.lastQuoteDate, v); },

  getPersonalRecords() { return Store.get(LS_KEYS.personalRecords, {}); },
  setPersonalRecords(v) { Store.set(LS_KEYS.personalRecords, v); },

  getEarlyRiserCount() { return Store.get(LS_KEYS.earlyRiserCount, 0); },
  setEarlyRiserCount(v) { Store.set(LS_KEYS.earlyRiserCount, v); },
  getDawnWarriorCount() { return Store.get(LS_KEYS.dawnWarriorCount, 0); },
  setDawnWarriorCount(v) { Store.set(LS_KEYS.dawnWarriorCount, v); },
  getTotalPushupReps() { return Store.get(LS_KEYS.totalPushupReps, 0); },
  setTotalPushupReps(v) { Store.set(LS_KEYS.totalPushupReps, v); },
  getHeartbreakCompletedCount() { return Store.get(LS_KEYS.heartbreakCompletedCount, 0); },
  setHeartbreakCompletedCount(v) { Store.set(LS_KEYS.heartbreakCompletedCount, v); },

  getAISettings() { return { ...DEFAULT_AI_SETTINGS, ...Store.get(LS_KEYS.aiSettings, {}) }; },
  setAISettings(v) { Store.set(LS_KEYS.aiSettings, { ...this.getAISettings(), ...v }); },
  getAIChatHistory() { return Store.get(LS_KEYS.aiChatHistory, []); },
  setAIChatHistory(v) { Store.set(LS_KEYS.aiChatHistory, v); },
  clearAIChatHistory() { Store.remove(LS_KEYS.aiChatHistory); },

  exportAll() {
    const dump = {};
    Object.entries(LS_KEYS).forEach(([name, key]) => {
      dump[key] = Store.get(key, null);
    });
    // API key SENGAJA tidak ikut ke-export — file backup ini sering dibagikan
    // (dikirim ke device lain, disimpan di cloud drive, dsb), dan API key
    // adalah kredensial rahasia, beda kelas dari data workout biasa. Setting
    // AI Coach lain (provider/model/enabled) tetap ikut supaya UX restore
    // tetap nyaman — user cuma perlu isi ulang key-nya setelah import.
    if (dump[LS_KEYS.aiSettings]) {
      dump[LS_KEYS.aiSettings] = { ...dump[LS_KEYS.aiSettings], apiKey: "" };
    }
    return dump;
  },
  importAll(dump) {
    Object.values(LS_KEYS).forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(dump, key)) {
        Store.set(key, dump[key]);
      }
    });
  }
};

// ============================================================
// IndexedDB — "VillainArcDB"
// ============================================================
const IDB = {
  dbName: "VillainArcDB",
  version: 1,
  db: null,

  open() {
    if (this.db) return Promise.resolve(this.db);
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(this.dbName, this.version);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("workout_logs")) {
          db.createObjectStore("workout_logs", { keyPath: "date" });
        }
        if (!db.objectStoreNames.contains("body_stats")) {
          db.createObjectStore("body_stats", { keyPath: "date" });
        }
        if (!db.objectStoreNames.contains("kai_test_history")) {
          db.createObjectStore("kai_test_history", { keyPath: "date" });
        }
      };
      req.onsuccess = (e) => { this.db = e.target.result; resolve(this.db); };
      req.onerror = (e) => reject(e);
    });
  },

  async put(storeName, value) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).put(value);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  },

  async get(storeName, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = (e) => reject(e);
    });
  },

  async getAll(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = (e) => reject(e);
    });
  },

  async delete(storeName, key) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).delete(key);
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  },

  async clear(storeName) {
    const db = await this.open();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(storeName, "readwrite");
      tx.objectStore(storeName).clear();
      tx.oncomplete = () => resolve(true);
      tx.onerror = (e) => reject(e);
    });
  },

  async clearAllStores() {
    await this.clear("workout_logs");
    await this.clear("body_stats");
    await this.clear("kai_test_history");
  }
};

// Workout log convenience API
const WorkoutLogs = {
  async getByDate(dateStr) {
    return IDB.get("workout_logs", dateStr);
  },
  async save(log) {
    return IDB.put("workout_logs", log);
  },
  async all() {
    return IDB.getAll("workout_logs");
  }
};

const BodyStats = {
  async save(entry) { return IDB.put("body_stats", entry); },
  async all() { return IDB.getAll("body_stats"); }
};

const KaiTestHistory = {
  async save(entry) { return IDB.put("kai_test_history", entry); },
  async all() {
    const rows = await IDB.getAll("kai_test_history");
    return rows.sort((a, b) => a.date.localeCompare(b.date));
  }
};

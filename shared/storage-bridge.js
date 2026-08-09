/* ============================================================
   SHARED — storage-bridge.js
   Unified cross-app storage abstraction.

   Ini TIDAK menggantikan storage.js milik masing-masing app
   (hafiz/js/storage.js, villain-arc/js/storage.js). App-app itu
   tetap memakai storage lokal mereka sendiri untuk data detail.

   File ini menyediakan lapisan TAMBAHAN yang dipakai bersama,
   khusus untuk data yang perlu terlihat lintas-app:
     - PersonalEcosystemDB (IndexedDB baru, terpisah dari
       HafizDB / VillainArcDB agar tidak menabrak schema yang
       sudah ada)
         · store "activity_log"      -> semua unit XP lintas-app
         · store "kai_psikotes_history" -> hasil tes KAI Psikotes
           Simulator (Kraepelin/TPA/Spasial/Memori/Kepribadian).
           INI BUKAN "kai_test_history" milik Villain Arc — nama
           itu sengaja dibedakan karena skema Villain Arc
           (pushup_count/situp_count, keyPath "date" per-hari)
           adalah fitur lain (tes fisik), bukan psikotes kognitif.
     - localStorage prefix "pe:" -> ringkasan profil per-domain
       yang dipakai dashboard (tidak menduplikasi data detail).

   Same-origin note: jika ketiga app di-deploy dalam satu domain
   (mis. GitHub Pages repo ini), IndexedDB dapat dibuka dari path
   manapun (root/, hafiz/, villain-arc/, kai/) karena origin sama.
   Jika file ini dibuka dari file:// atau origin berbeda saat
   development lokal per-folder, semua fungsi di sini gagal secara
   aman (try/catch) dan tidak akan merusak app masing-masing.
   ============================================================ */

const SharedStorage = (() => {
  const DB_NAME = 'PersonalEcosystemDB';
  const DB_VERSION = 1;
  let dbPromise = null;

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (typeof indexedDB === 'undefined') { reject(new Error('IndexedDB unavailable')); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('activity_log')) {
          const store = db.createObjectStore('activity_log', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by_source', 'source', { unique: false });
          store.createIndex('by_date', 'date', { unique: false });
        }
        if (!db.objectStoreNames.contains('kai_psikotes_history')) {
          const store = db.createObjectStore('kai_psikotes_history', { keyPath: 'id', autoIncrement: true });
          store.createIndex('by_module', 'module', { unique: false });
          store.createIndex('by_date', 'date', { unique: false });
        }
      };
      req.onsuccess = (e) => resolve(e.target.result);
      req.onerror = (e) => reject(e.target.error);
    });
    return dbPromise;
  }

  async function add(storeName, value) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite');
        const req = tx.objectStore(storeName).add(value);
        req.onsuccess = () => resolve(req.result);
        req.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn('[SharedStorage] add failed (non-fatal):', err.message);
      return null;
    }
  }

  async function getAll(storeName) {
    try {
      const db = await openDB();
      return await new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly');
        const req = tx.objectStore(storeName).getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = (e) => reject(e.target.error);
      });
    } catch (err) {
      console.warn('[SharedStorage] getAll failed (non-fatal):', err.message);
      return [];
    }
  }

  // ---- Cross-app activity log (every XP-earning event, any app) ----
  function logActivity({ source, type, amount, meta }) {
    return add('activity_log', {
      source,                 // 'hafiz' | 'villain-arc' | 'kai'
      type,                   // e.g. 'sabak', 'workout', 'kraepelin'
      amount,                 // XP amount (can be negative)
      meta: meta || {},
      date: new Date().toISOString()
    });
  }
  function getActivityLog() { return getAll('activity_log'); }

  // ---- KAI Psikotes Simulator history ----
  function saveKaiPsikotesResult(entry) {
    // entry: { module, correct, total, pct, label, extra }
    return add('kai_psikotes_history', { ...entry, date: new Date().toISOString() });
  }
  function getKaiPsikotesHistory() { return getAll('kai_psikotes_history'); }

  // ---- localStorage summary (cheap, synchronous, used by dashboard) ----
  const LS_PREFIX = 'pe:';
  function lsGet(key, fallback = null) {
    try {
      const raw = localStorage.getItem(LS_PREFIX + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (e) { return fallback; }
  }
  function lsSet(key, value) {
    try { localStorage.setItem(LS_PREFIX + key, JSON.stringify(value)); } catch (e) {}
  }

  return {
    openDB, logActivity, getActivityLog,
    saveKaiPsikotesResult, getKaiPsikotesHistory,
    lsGet, lsSet
  };
})();

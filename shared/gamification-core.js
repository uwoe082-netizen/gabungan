/* ============================================================
   SHARED — gamification-core.js
   Unified cross-app XP / Global Rank engine.

   Ini TIDAK menggantikan sistem XP/level lokal masing-masing app
   (Hafiz punya 10 level "Mubtadi' -> Sahibul Qur'an", Villain Arc
   punya 12 rank "Shadow Initiate -> Apex Predator"). Kedua sistem
   itu tetap jalan apa adanya — dipertahankan sesuai instruksi
   "minimum invasion".

   File ini menambah SATU angka XP global tambahan yang terpisah,
   diisi dari ketiga app sebagai "kontribusi" ke satu progression
   gabungan (dipakai di Cross-App Dashboard). Menggunakan
   localStorage (bukan IndexedDB) karena hanya satu angka + log
   ringkas — cukup untuk dibaca cepat & sinkron di root dashboard.

   Same-origin required (lihat catatan di storage-bridge.js).
   Semua fungsi aman dipanggil walau localStorage tidak tersedia.
   ============================================================ */

const SharedGamification = (() => {
  const LS_KEY = 'pe:global_profile';

  // XP per unit aktivitas lintas-domain (dipakai sbg referensi UI,
  // app pengirim boleh kirim amount aktualnya sendiri juga)
  const XP_UNITS = {
    hafiz_sabak: 100,      // 1 halaman baru dihafal
    hafiz_session: 20,     // sesi setoran/murojaah lain
    workout_day: 80,       // 1 hari workout selesai
    kai_pass: 120          // 1 tes KAI Psikotes skor > 80%
  };

  // Rank global gabungan — narasi menyatukan 3 domain
  // (spiritual x fisik x kognitif), independen dari rank lokal app.
  const GLOBAL_RANKS = [
    { level: 1, name: 'Pencari Jalan',        xp: 0 },
    { level: 2, name: 'Murid Tiga Jalan',     xp: 200 },
    { level: 3, name: 'Penempa Diri',         xp: 600 },
    { level: 4, name: 'Penjaga Istiqomah',    xp: 1200 },
    { level: 5, name: 'Ksatria Seimbang',     xp: 2500 },
    { level: 6, name: 'Pendekar Tiga Ranah',  xp: 4500 },
    { level: 7, name: 'Sang Mutqin',          xp: 7500 },
    { level: 8, name: 'Ultimate Rank',        xp: 12000 }
  ];

  function safeGet() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      return raw ? JSON.parse(raw) : { xp: 0, byDomain: { hafiz: 0, 'villain-arc': 0, kai: 0 }, log: [] };
    } catch (e) {
      return { xp: 0, byDomain: { hafiz: 0, 'villain-arc': 0, kai: 0 }, log: [] };
    }
  }
  function safeSet(profile) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(profile)); } catch (e) {}
  }

  function rankForXP(xp) {
    let current = GLOBAL_RANKS[0];
    for (const r of GLOBAL_RANKS) if (xp >= r.xp) current = r;
    const idx = GLOBAL_RANKS.indexOf(current);
    const next = GLOBAL_RANKS[idx + 1] || null;
    return {
      ...current,
      next,
      progressToNext: next ? Math.min(100, Math.max(0, Math.round((xp - current.xp) / (next.xp - current.xp) * 100))) : 100
    };
  }

  /** Panggil dari app manapun setiap kali XP lokal diberikan. */
  function awardXP(domain, amount, reason) {
    const profile = safeGet();
    profile.xp = Math.max(0, (profile.xp || 0) + amount);
    profile.byDomain = profile.byDomain || { hafiz: 0, 'villain-arc': 0, kai: 0 };
    profile.byDomain[domain] = (profile.byDomain[domain] || 0) + amount;
    profile.log = profile.log || [];
    profile.log.push({ domain, amount, reason: reason || '', date: new Date().toISOString() });
    if (profile.log.length > 200) profile.log = profile.log.slice(-200); // cegah localStorage membengkak
    safeSet(profile);

    // Best-effort: log detail ke IndexedDB lintas-app jika storage-bridge.js tersedia
    if (typeof SharedStorage !== 'undefined') {
      SharedStorage.logActivity({ source: domain, type: reason, amount });
    }

    const rank = rankForXP(profile.xp);
    return { total: profile.xp, rank, byDomain: profile.byDomain };
  }

  function getGlobalProfile() {
    const profile = safeGet();
    return { ...profile, rank: rankForXP(profile.xp || 0) };
  }

  return { XP_UNITS, GLOBAL_RANKS, awardXP, getGlobalProfile, rankForXP };
})();

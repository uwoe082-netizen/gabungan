# 🚀 Personal Ecosystem — Spiritual × Fisik × Kognitif

Monorepo gabungan tiga app personal:
- `/hafiz/` — Tahfidz Al-Qur'an (setoran, murojaah, SM-2 spaced repetition)
- `/villain-arc/` — Workout tracker RPG dark-fantasy
- `/kai/` — KAI Psikotes Simulator (Kraepelin, TPA, Spasial, Daya Ingat, Kepribadian)
- `/` (root) — Cross-App Dashboard + `/shared/` modul bersama

## Deploy ke GitHub Pages (3 langkah)

1. Buat repo baru di GitHub (misal `personal-ecosystem`)
2. Push seluruh isi folder ini:
   ```bash
   git init
   git add .
   git commit -m "Initial deploy — unified ecosystem"
   git branch -M main
   git remote add origin https://github.com/USERNAME/personal-ecosystem.git
   git push -u origin main
   ```
3. Settings → Pages → Source: `main` / `/ (root)` → Save. Akses di
   `https://USERNAME.github.io/personal-ecosystem/`

**Penting:** cross-app bridging (dashboard, XP global, riwayat KAI) memakai
`localStorage` dan `IndexedDB`, yang di-scope per **origin**, bukan per
folder. Selama ketiga app dan `/shared/` di-deploy dalam satu domain seperti
struktur repo ini, semuanya otomatis nyambung. Kalau salah satu app dibuka
berdiri sendiri dari domain/file lain, app itu tetap jalan normal (semua
pemanggilan modul shared dibungkus try/catch dan mengecek `typeof ... !==
'undefined'` dulu) — hanya fitur cross-app-nya yang non-aktif.

## Jalankan lokal

```bash
npx serve .
# atau
python -m http.server 8080
```

## Apa yang sudah dikerjakan (Sprint 1 — Foundation)

- ✅ **Koreksi temuan penting:** `kai_test_history` di Villain Arc **bukan**
  tempat penyimpanan hasil KAI Psikotes Simulator seperti asumsi di brief —
  store itu sudah dipakai untuk fitur lain (tes fisik pushup/situp,
  field `pushup_count`/`situp_count`). Menulis data psikotes ke sana akan
  merusak fitur yang sudah ada. Sebagai gantinya dibuat store baru yang
  terpisah: `kai_psikotes_history` di dalam IndexedDB baru
  `PersonalEcosystemDB` (lihat `shared/storage-bridge.js`).
- ✅ **KAI Simulator sekarang punya persistence** — skor terakhir per modul
  dan riwayat lengkap tersimpan di `localStorage` (`kai:lastScores`,
  `kai:history`), tidak hilang lagi saat refresh.
- ✅ **`shared/storage-bridge.js`** — abstraksi IndexedDB bersama
  (`PersonalEcosystemDB`) + helper `localStorage` untuk data ringkas lintas-app.
- ✅ **`shared/gamification-core.js`** — satu angka XP global + 8-tier rank
  gabungan (`Pencari Jalan` → `Ultimate Rank`), diisi dari ketiga app tanpa
  mengubah sistem XP/level lokal masing-masing (Hafiz tetap 10 level,
  Villain Arc tetap 12 rank — keduanya dipertahankan apa adanya).
  - Hafiz: setiap sesi setoran/murojaah selesai → `SharedGamification.awardXP('hafiz', xp, sessionType)`
  - Villain Arc: satu hook di `Gamification.awardXP()` (menutup semua call site sekaligus)
  - KAI: setiap modul dengan skor selesai → XP global (tes ≥80% = bonus penuh)
- ✅ **Cross-App Dashboard** (`index.html` root) — Global Rank bar + 3 kartu
  status (sudah/belum aktivitas hari ini per domain), link ke tiap app.
- ✅ Root `manifest.json`, `sw.js` (scope dashboard saja), `.nojekyll`.

## Yang sengaja BELUM dikerjakan di paket ini (transparansi)

Brief aslinya juga meminta Sprint 2 lanjutan (achievement/badge lintas-app,
narasi "Ultimate Rank" penuh), modularisasi KAI dari single-file HTML ke
multi-file, bundling Chart.js lokal + Service Worker offline untuk `/kai/`,
audit mendalam algoritma SM-2/prosedural KAI/speech recognition, dan audit
kualitas kode (race condition, memory leak). Semua itu perubahan besar yang
lebih aman dikerjakan bertahap dengan verifikasi di antaranya (persis seperti
"Langkah 5: Verifikasi & Edge Cases" di brief), bukan sekaligus tanpa
pengecekan. Sprint 1 di atas sudah live dan berfungsi; kabari kalau mau
lanjut ke Sprint 2/3 tertentu.

Satu keterbatasan teknis: environment yang dipakai untuk membuat paket ini
tidak punya akses jaringan, jadi Chart.js di `/kai/` masih memuat dari CDN
(`cdn.jsdelivr.net`) seperti aslinya — belum bisa dibundel lokal dari sini.

## Struktur

```
personal-ecosystem/
├── index.html, manifest.json, sw.js, .nojekyll
├── shared/
│   ├── storage-bridge.js
│   └── gamification-core.js
├── hafiz/          (tidak diubah selain 1 hook XP + 2 <script> tag)
├── villain-arc/     (tidak diubah selain 1 hook XP + 2 <script> tag)
└── kai/            (index.html — persistence + bridge ditambahkan)
```

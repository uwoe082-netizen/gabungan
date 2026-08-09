# 🔥 VILLAIN ARC — Workout Tracker PWA

Fitness tracker & motivational engine bergaya RPG dark-fantasy. Vanilla HTML/CSS/JS, tanpa framework, installable sebagai PWA dan bisa dipakai offline.

## Menjalankan secara lokal

Browser modern membutuhkan konteks HTTP (bukan `file://`) agar Service Worker & IndexedDB berjalan normal. Jalankan server statis sederhana dari folder ini:

```bash
python3 -m http.server 8080
# lalu buka http://localhost:8080
```

atau dengan Node:

```bash
npx serve .
```

## Deploy ke GitHub Pages

1. Push folder ini ke repo GitHub (root repo atau folder `docs/`).
2. Settings → Pages → pilih branch & folder → Save.
3. Buka `https://<username>.github.io/<repo>/`.

## Struktur

```
villain-arc/
├── index.html          # Entry point SPA
├── manifest.json        # PWA manifest
├── sw.js                 # Service worker (offline cache-first + push)
├── css/                  # variables, base, components, animations, pages
├── js/
│   ├── data.js            # Jadwal latihan, quotes, rank, achievement definitions
│   ├── storage.js         # localStorage + IndexedDB (VillainArcDB) abstraction
│   ├── gamification.js    # XP, level, streak, achievement logic
│   ├── quotes.js           # Rotasi quote harian tanpa repeat
│   ├── timer.js             # Timer tes KAI 60 detik + rest timer
│   ├── notifications.js     # Push notification + fallback in-app reminder
│   ├── ui.js                 # Toast, confetti, celebration overlay, ember particles
│   └── app.js                 # Routing (hash-based), rendering semua halaman, event handling
└── assets/icons/                # Icon PWA 192x192 & 512x512
```

## Fitur utama

- **Onboarding** 5 langkah (welcome → codename → target → notifikasi → ready)
- **War Room (Dashboard)**: greeting dinamis berdasarkan jam, quote harian, checklist exercise dengan animasi XP float & mission-complete celebration, stats bar, XP progress bar
- **War Journal (Progress)**: calendar heatmap, grafik KAI test (SVG line chart), personal records, body stats tracker
- **Hall of Shadows (Achievements)**: rank ladder 12 level, 20 achievement badge dengan lock/unlock
- **Command Center (Settings)**: profile, notifikasi (waktu + preset pesan), anti-PMO tracker terpisah, export/import JSON, reset data (konfirmasi ganda)
- **Data persistence**: `localStorage` untuk profil/XP/streak/settings, `IndexedDB` (`VillainArcDB`) untuk `workout_logs`, `body_stats`, `kai_test_history`
- **PWA**: installable, offline cache-first via Service Worker, Web Push API + fallback in-app reminder saat Push API tidak tersedia

## Catatan implementasi

- Push notification terjadwal (misalnya tiap jam 04:55) bergantung pada dukungan browser untuk *periodic background sync* / *notification triggers*, yang belum tersedia merata di semua browser. Sebagai fallback, app menampilkan reminder in-app saat dibuka pertama kali di hari itu.
- Ganti ikon di `assets/icons/` dengan aset final sebelum production deploy — ikon saat ini adalah placeholder yang digenerate otomatis.

---

> *"Pain is the raw material. Discipline is the forge. This app is the weapon."*

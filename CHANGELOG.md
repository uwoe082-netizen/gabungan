# CHANGELOG

## v1.0 — Sprint 1: Foundation

### BARU
- `shared/storage-bridge.js` — IndexedDB bersama `PersonalEcosystemDB`
  (stores: `activity_log`, `kai_psikotes_history`) + helper localStorage.
- `shared/gamification-core.js` — engine XP/rank global lintas-app.
- `index.html` (root) — Cross-App Dashboard.
- `manifest.json`, `sw.js`, `.nojekyll`, `README.md` (root).

### MODIFIKASI
- `kai/index.html` (sebelumnya `kai-psikotes-simulator-v2.html`)
  - Baris ~9: tambah `<script>` shared modules.
  - `lastScores` sekarang dimuat/disimpan dari `localStorage` (`kai:lastScores`)
    — sebelumnya in-memory saja, hilang saat refresh.
  - `reportScore(id, label)` → `reportScore(id, label, detail)` — parameter
    `detail` opsional berisi `{correct, total, pct}`. Menambah riwayat
    lengkap ke `localStorage` (`kai:history`) dan mem-bridge ke
    `SharedStorage.saveKaiPsikotesResult()` + `SharedGamification.awardXP()`.
  - 4 dari 5 call site `reportScore()` (Kraepelin, TPA, Spasial, Memori)
    diperbarui mengirim `detail`. Modul Kepribadian (ipsatif, tidak ada
    correct/total) sengaja tidak diubah.
  - Header: judul jadi link `<a href="../">` kembali ke dashboard.
  - **Dampak:** tidak mengubah generator soal maupun UI tes sama sekali.
- `hafiz/index.html`
  - Tambah 2 `<script>` tag shared modules sebelum `js/utils.js`.
- `hafiz/js/app.js`
  - Baris ~557-559 (`endSession`/setelah `state.profile.xp += xp`): tambah
    3 baris pemanggilan `SharedGamification.awardXP('hafiz', xp, sessionType)`.
  - **Dampak:** tidak mengubah `state.profile.xp` atau `Storage.lsSet` yang
    sudah ada — XP lokal Hafiz App tetap identik seperti sebelumnya.
- `villain-arc/index.html`
  - Tambah 2 `<script>` tag shared modules sebelum `js/data.js`.
- `villain-arc/js/gamification.js`
  - `Gamification.awardXP(amount, reason)`: tambah 3 baris pemanggilan
    `SharedGamification.awardXP('villain-arc', amount, reason)` sebelum
    `return`. Satu titik ini menutupi seluruh 6 call site yang ada
    (exercise check, PR baru, streak milestone, undo, dsb) tanpa perlu
    menyentuh `app.js` sama sekali.
  - **Dampak:** tidak mengubah `AppData.addXP()`/level-up logic yang ada.

### TIDAK DIUBAH (sengaja)
- `villain-arc` store `kai_test_history` (fitur tes fisik pushup/situp) —
  dibiarkan sepenuhnya seperti semula, lihat catatan di README.
- Semua CSS, generator soal KAI, algoritma SM-2 Hafiz, dan struktur
  IndexedDB `HafizDB`/`VillainArcDB` yang sudah ada.

## Migration notes
Tidak ada migrasi data yang diperlukan. Semua penyimpanan lama
(`hafiz:*` di localStorage, `HafizDB`, `va_*` di localStorage,
`VillainArcDB`) tetap memakai key/skema yang sama persis — hanya
ditambah lapisan baru (`pe:*`, `PersonalEcosystemDB`) yang independen.
User lama tidak kehilangan data apapun saat upgrade ke paket ini.

## Testing checklist (sudah diverifikasi struktur & sintaks, belum browser)
- [ ] Buka `/` di server lokal → dashboard tampil, 3 kartu menuju app benar
- [ ] Selesaikan 1 sesi Hafiz → cek `pe:global_profile` di localStorage bertambah
- [ ] Selesaikan 1 hari workout Villain Arc → cek `pe:global_profile` bertambah
- [ ] Selesaikan modul Kraepelin di KAI → refresh halaman → skor tidak hilang
- [ ] Cek IndexedDB `PersonalEcosystemDB` via DevTools → store `kai_psikotes_history` terisi
- [ ] Buka `/kai/index.html` berdiri sendiri (tanpa root) → tidak ada error fatal di console
- [ ] Test offline setelah 1x online (root SW ter-install)

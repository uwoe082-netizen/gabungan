# VILLAIN ARC Push Server — Panduan Deploy

Server kecil (gratis, Cloudflare Workers) yang kirim notifikasi push ke HP/browser
kamu **tepat di jam target**, walau app/browser dalam keadaan tertutup total.

## 0. Key VAPID — generate sendiri

> **Catatan dari Claude:** versi sebelumnya file ini menaruh key VAPID
> (termasuk **private key**-nya) langsung dalam bentuk teks di README. Karena
> repo ini publik di GitHub, saya hapus key itu supaya tidak ikut ter-commit
> dan bisa dibaca siapa saja. Generate pasanganmu sendiri lewat langkah di
> bawah — hanya butuh sekali, lalu simpan private key-nya di tempat aman
> (bukan di git), misal password manager.

Generate di komputer kamu sendiri (bukan di sini):
```bash
npx web-push generate-vapid-keys
```
Ini akan mengeluarkan sepasang key:
```
Public Key:  <public key kamu>
Private Key: <private key kamu>
```
- `VAPID_PUBLIC_KEY` (boleh publik/aman ditaruh di client) → dipakai di langkah 3 & di `js/notifications.js` (`VAPID_PUBLIC_KEY` const).
- Private key → **jangan pernah commit ke git**. Dipakai langsung di langkah 4 (`wrangler secret put`), lalu bisa dihapus dari clipboard/terminal history.

## 1. Siapkan akun & tool

1. Daftar/login ke [dash.cloudflare.com](https://dash.cloudflare.com) — gratis, tanpa kartu kredit untuk tier ini.
2. Di komputer kamu (bukan di sini), install Wrangler (CLI Cloudflare):
   ```bash
   npm install -g wrangler
   wrangler login
   ```
   Ini akan buka browser untuk login ke akun Cloudflare kamu.

## 2. Buat KV Namespace (tempat nyimpen subscription)

```bash
cd push-server
wrangler kv namespace create SUBSCRIPTIONS
```
Output-nya bakal kasih `id = "xxxxxxxxxxxx"`. Copy id itu, tempel ke
`wrangler.toml` menggantikan `PASTE_KV_NAMESPACE_ID_DI_SINI`.

## 3. Isi `wrangler.toml`

Edit `wrangler.toml`:
- `VAPID_PUBLIC_KEY` → isi dengan public key di atas.
- `VAPID_SUBJECT` → ganti dengan `mailto:emailkamu@...` (dipakai push service buat kontak kalau ada masalah, wajib diisi tapi tidak akan dihubungi kecuali ada abuse).

## 4. Set private key sebagai secret (JANGAN taruh di wrangler.toml)

```bash
wrangler secret put VAPID_PRIVATE_JWK
```
Pas diminta paste value, tempel persis JSON `VAPID_PRIVATE_JWK` di atas (satu baris).

## 5. Deploy

```bash
wrangler deploy
```
Setelah sukses, kamu akan dapat URL seperti:
```
https://villain-arc-push.<username-kamu>.workers.dev
```
Itu **Worker URL** kamu.

## 6. Sambungkan ke aplikasi VILLAIN ARC

1. Buka app → Command Center → cari bagian **"Push Server (Notifikasi Terjadwal)"**.
2. Tempel Worker URL di atas ke field **Push Server URL**.
3. Klik **Aktifkan Push Server** → browser akan minta izin notifikasi, izinkan.
4. Klik **Kirim Tes Notifikasi** untuk pastikan alurnya kerja end-to-end (worker
   akan kirim 1 notifikasi tes ke device kamu dalam beberapa detik).
5. Kalau tes berhasil, notifikasi harian otomatis akan datang tepat di jam yang
   kamu set di Settings → jam notifikasi, walau app ditutup.

## Catatan jujur soal keterbatasan

- **Biaya**: gratis untuk pemakaian pribadi (Cloudflare Workers Free: 100.000
  request/hari, jauh di atas kebutuhan cron per-menit + 1 subscription).
- **iOS**: push web (Web Push API) di iOS Safari baru jalan kalau app di-**Add
  to Home Screen** dulu (jadi PWA "terinstall") — iOS tidak izinkan web push
  dari tab browser biasa.
- Kalau kamu ganti device/browser/reinstall app, kamu perlu klik "Aktifkan
  Push Server" lagi di device yang baru (subscription terikat ke
  browser+device tertentu).
- Worker ini murni untuk kamu sendiri (single/beberapa user kecil) — tidak ada
  autentikasi di endpoint `/subscribe`, jadi jangan sebar Worker URL kamu ke
  publik (walau risikonya kecil — paling-paling orang lain bisa daftar
  subscription palsu ke KV kamu, tidak bisa akses data app kamu).

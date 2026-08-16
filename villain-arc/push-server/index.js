// ============================================================
// VILLAIN ARC — Push Server (Cloudflare Worker)
// ------------------------------------------------------------
// Server kecil yang:
//  1. Nyimpen push subscription + jam notifikasi user ke KV.
//  2. Tiap menit (Cron Trigger) ngecek semua subscription, kalau
//     jam lokal user sudah cocok sama jam target & belum dikirim
//     hari ini -> kirim Web Push (RFC 8291 encryption + RFC 8292
//     VAPID auth), lewat Web Crypto API bawaan Workers, TANPA
//     dependency npm apa pun (bisa deploy langsung).
//
// Endpoint:
//   POST /subscribe    { subscription, notification_time, message, tz_offset_minutes }
//   POST /unsubscribe  { endpoint }
//   POST /test         { endpoint }  -> kirim 1 notifikasi tes langsung
//
// Env yang wajib di-set (lihat README.md):
//   VAPID_PRIVATE_KEY  (secret, teks base64url polos — persis output "Private Key"
//                        dari `npx web-push generate-vapid-keys`, BUKAN JSON)
//   VAPID_PUBLIC_KEY   (plain var, base64url raw public key 65-byte)
//   VAPID_SUBJECT      (plain var, mis. "mailto:kamu@email.com")
//   Binding KV: SUBSCRIPTIONS
// ============================================================

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders() }
  });
}

// ---------- base64url helpers ----------
function b64urlToBytes(str) {
  // Bersihkan whitespace/newline yang kadang ikut ke-paste dari terminal/clipboard.
  const clean = String(str).trim().replace(/[\r\n\s]/g, "");
  const pad = clean.length % 4 === 0 ? "" : "=".repeat(4 - (clean.length % 4));
  const b64 = clean.replace(/-/g, "+").replace(/_/g, "/") + pad;
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
}
function bytesToB64url(bytes) {
  let bin = "";
  const arr = new Uint8Array(bytes);
  for (let i = 0; i < arr.length; i++) bin += String.fromCharCode(arr[i]);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function concatBytes(...parts) {
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) { out.set(p, offset); offset += p.length; }
  return out;
}
const utf8 = (s) => new TextEncoder().encode(s);

// ---------- KV key: hash endpoint jadi key pendek & aman ----------
async function endpointKey(endpoint) {
  const digest = await crypto.subtle.digest("SHA-256", utf8(endpoint));
  return "sub:" + bytesToB64url(new Uint8Array(digest)).slice(0, 32);
}

// ---------- Bangun JWK dari raw public+private key (format asli output `web-push generate-vapid-keys`) ----------
// Catatan penting: `npx web-push generate-vapid-keys` TIDAK mengeluarkan JSON Web Key (JWK) object —
// dia keluarin Public Key & Private Key sebagai teks base64url polos. Web Crypto API butuh JWK
// lengkap (x, y, d) untuk import private key, jadi kita rekonstruksi JWK-nya di sini: x & y diambil
// dari raw public key (65 byte, uncompressed point 0x04||X||Y), d = raw private key apa adanya.
function jwkFromRawKeys(publicKeyB64url, privateKeyB64url) {
  const pubBytes = b64urlToBytes(publicKeyB64url); // 65 bytes
  const privBytes = b64urlToBytes(privateKeyB64url); // wajib 32 bytes (scalar P-256)

  if (pubBytes.length !== 65) {
    throw new Error(`VAPID_PUBLIC_KEY panjangnya salah (${pubBytes.length} byte, harusnya 65). Cek ada karakter kepotong/ekstra saat copy-paste.`);
  }
  if (pubBytes[0] !== 0x04) {
    throw new Error("VAPID_PUBLIC_KEY tidak diawali byte 0x04 (uncompressed point) — kemungkinan formatnya bukan raw public key P-256 yang benar.");
  }
  if (privBytes.length !== 32) {
    throw new Error(`VAPID_PRIVATE_KEY panjangnya salah (${privBytes.length} byte, harusnya 32). Cek ada karakter kepotong/ekstra/whitespace saat wrangler secret put.`);
  }

  const x = pubBytes.slice(1, 33);
  const y = pubBytes.slice(33, 65);
  return {
    kty: "EC",
    crv: "P-256",
    x: bytesToB64url(x),
    y: bytesToB64url(y),
    d: bytesToB64url(privBytes),
    ext: true
  };
}

// ---------- VAPID JWT (RFC 8292) ----------
async function buildVapidHeader(env, endpoint) {
  const aud = new URL(endpoint).origin;
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: env.VAPID_SUBJECT || "mailto:admin@example.com"
  };
  const unsigned = bytesToB64url(utf8(JSON.stringify(header))) + "." + bytesToB64url(utf8(JSON.stringify(payload)));

  const jwk = jwkFromRawKeys(env.VAPID_PUBLIC_KEY, env.VAPID_PRIVATE_KEY);
  const privateKey = await crypto.subtle.importKey(
    "jwk", jwk, { name: "ECDSA", namedCurve: "P-256" }, false, ["sign"]
  );
  const sigBuf = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" }, privateKey, utf8(unsigned)
  );
  const jwt = unsigned + "." + bytesToB64url(new Uint8Array(sigBuf));
  return `vapid t=${jwt}, k=${env.VAPID_PUBLIC_KEY}`;
}

// ---------- Enkripsi payload (RFC 8291 aes128gcm) ----------
async function encryptPayload(payloadObj, subscriptionKeys) {
  const receiverPublicRaw = b64urlToBytes(subscriptionKeys.p256dh); // 65 bytes
  const authSecret = b64urlToBytes(subscriptionKeys.auth); // 16 bytes

  const receiverKey = await crypto.subtle.importKey(
    "raw", receiverPublicRaw, { name: "ECDH", namedCurve: "P-256" }, false, []
  );
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]
  );
  const localPublicRaw = new Uint8Array(await crypto.subtle.exportKey("raw", localKeyPair.publicKey));

  const sharedSecretBuf = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverKey }, localKeyPair.privateKey, 256
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  // Tahap 1: IKM' = HKDF(salt=auth_secret, ikm=ecdh_secret, info=key_info, 32)
  const keyInfo = concatBytes(utf8("WebPush: info"), new Uint8Array([0]), receiverPublicRaw, localPublicRaw);
  const ecdhSecretKey = await crypto.subtle.importKey("raw", new Uint8Array(sharedSecretBuf), "HKDF", false, ["deriveBits"]);
  const ikmPrimeBuf = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret, info: keyInfo }, ecdhSecretKey, 256
  );

  // Tahap 2: CEK & NONCE = HKDF(salt=salt, ikm=IKM', info=..., n)
  const ikmPrimeKey = await crypto.subtle.importKey("raw", new Uint8Array(ikmPrimeBuf), "HKDF", false, ["deriveBits"]);
  const cekInfo = concatBytes(utf8("Content-Encoding: aes128gcm"), new Uint8Array([0]));
  const nonceInfo = concatBytes(utf8("Content-Encoding: nonce"), new Uint8Array([0]));
  const cekBuf = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: cekInfo }, ikmPrimeKey, 128);
  const nonceBuf = await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info: nonceInfo }, ikmPrimeKey, 96);

  const plaintext = concatBytes(utf8(JSON.stringify(payloadObj)), new Uint8Array([2])); // delimiter 0x02, tanpa padding tambahan
  const aesKey = await crypto.subtle.importKey("raw", new Uint8Array(cekBuf), { name: "AES-GCM" }, false, ["encrypt"]);
  const cipherBuf = await crypto.subtle.encrypt({ name: "AES-GCM", iv: new Uint8Array(nonceBuf) }, aesKey, plaintext);
  const ciphertext = new Uint8Array(cipherBuf);

  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, ciphertext.length, false);
  const idlen = new Uint8Array([localPublicRaw.length]);

  const body = concatBytes(salt, rs, idlen, localPublicRaw, ciphertext);
  return body;
}

async function sendWebPush(env, subscription, payloadObj) {
  const body = await encryptPayload(payloadObj, subscription.keys);
  const authHeader = await buildVapidHeader(env, subscription.endpoint);
  const res = await fetch(subscription.endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Encoding": "aes128gcm",
      "TTL": "86400",
      "Authorization": authHeader
    },
    body
  });
  // Debug: log status + body respons asli dari push service (FCM/Mozilla/dst),
  // supaya kelihatan lewat `wrangler tail` kalau ada yang ditolak diam-diam.
  const resBodyText = await res.clone().text().catch(() => "(gagal baca body)");
  console.log(`[push] endpoint=${subscription.endpoint.slice(0, 60)}... status=${res.status} body=${resBodyText.slice(0, 300)}`);
  return res;
}

// ---------- HTTP handlers ----------
async function handleSubscribe(request, env) {
  const data = await request.json();
  if (!data.subscription || !data.subscription.endpoint) return json({ error: "subscription tidak valid" }, 400);
  const key = await endpointKey(data.subscription.endpoint);
  const entry = {
    subscription: data.subscription,
    notification_time: data.notification_time || "04:55",
    message: data.message || "",
    tz_offset_minutes: typeof data.tz_offset_minutes === "number" ? data.tz_offset_minutes : 0,
    last_sent_date: null
  };
  await env.SUBSCRIPTIONS.put(key, JSON.stringify(entry));
  return json({ ok: true });
}

async function handleUnsubscribe(request, env) {
  const data = await request.json();
  if (!data.endpoint) return json({ error: "endpoint wajib diisi" }, 400);
  const key = await endpointKey(data.endpoint);
  await env.SUBSCRIPTIONS.delete(key);
  return json({ ok: true });
}

async function handleTest(request, env) {
  const data = await request.json();
  if (!data.endpoint) return json({ error: "endpoint wajib diisi" }, 400);
  const key = await endpointKey(data.endpoint);
  const raw = await env.SUBSCRIPTIONS.get(key);
  if (!raw) return json({ error: "subscription belum terdaftar, coba aktifkan push dulu di app" }, 404);
  const entry = JSON.parse(raw);
  try {
    const res = await sendWebPush(env, entry.subscription, {
      title: "VILLAIN ARC ⚔️ (Tes)",
      body: "Kalau kamu lihat ini, push server kamu jalan dengan benar."
    });
    const bodyText = await res.text().catch(() => "");
    return json({ ok: res.ok, status: res.status, pushServiceBody: bodyText.slice(0, 300) });
  } catch (e) {
    return json({ error: String(e.message || e) }, 500);
  }
}

function localHHMMAndDate(tzOffsetMinutes) {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  let localTotal = (utcMinutes + tzOffsetMinutes) % 1440;
  if (localTotal < 0) localTotal += 1440;
  const hh = String(Math.floor(localTotal / 60)).padStart(2, "0");
  const mm = String(localTotal % 60).padStart(2, "0");
  // Tanggal lokal (kasar, cukup buat dedup 1x/hari): geser waktu UTC by offset lalu ambil tanggal ISO.
  const shifted = new Date(now.getTime() + tzOffsetMinutes * 60000);
  const dateStr = shifted.toISOString().slice(0, 10);
  return { hhmm: `${hh}:${mm}`, dateStr };
}

async function runScheduledCheck(env) {
  const list = await env.SUBSCRIPTIONS.list();
  for (const k of list.keys) {
    const raw = await env.SUBSCRIPTIONS.get(k.name);
    if (!raw) continue;
    const entry = JSON.parse(raw);
    const { hhmm, dateStr } = localHHMMAndDate(entry.tz_offset_minutes || 0);
    if (hhmm !== entry.notification_time) continue;
    if (entry.last_sent_date === dateStr) continue; // sudah dikirim hari ini

    try {
      await sendWebPush(env, entry.subscription, {
        title: "VILLAIN ARC ⚔️",
        body: entry.message || "Waktunya latihan. Jangan kasih alasan."
      });
      entry.last_sent_date = dateStr;
      await env.SUBSCRIPTIONS.put(k.name, JSON.stringify(entry));
    } catch (e) {
      // Kalau endpoint sudah tidak valid (410 Gone dsb), hapus biar tidak nyampah tiap menit.
      const msg = String(e.message || e);
      if (msg.includes("410") || msg.includes("404")) {
        await env.SUBSCRIPTIONS.delete(k.name);
      }
    }
  }
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") return new Response(null, { headers: corsHeaders() });
    const url = new URL(request.url);
    if (request.method === "POST" && url.pathname === "/subscribe") return handleSubscribe(request, env);
    if (request.method === "POST" && url.pathname === "/unsubscribe") return handleUnsubscribe(request, env);
    if (request.method === "POST" && url.pathname === "/test") return handleTest(request, env);
    return json({ ok: true, service: "villain-arc-push-server" });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledCheck(env));
  }
};

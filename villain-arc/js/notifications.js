// ============================================================
// VILLAIN ARC — Notification logic
// ============================================================

// Public VAPID key punya push-server (lihat push-server/README.md).
// Ini AMAN untuk ditaruh di client — VAPID public key memang didesain publik,
// yang wajib rahasia cuma private key-nya (disimpan sbg Cloudflare secret).
const VAPID_PUBLIC_KEY = "BCq2swJnlQ2YlAYlj2vrK_hEDB_jO7GDRQZyZ_bfa1oClMAy9xsXTPAplzvSDerRZbpeofdQ5kVwDxdAql8-lXs";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) outputArray[i] = rawData.charCodeAt(i);
  return outputArray;
}

const Notifications = {
  async requestPermission() {
    if (!("Notification" in window)) return "unsupported";
    try {
      const result = await Notification.requestPermission();
      return result;
    } catch (e) {
      return "denied";
    }
  },

  permissionState() {
    if (!("Notification" in window)) return "unsupported";
    return Notification.permission;
  },

  async registerServiceWorker() {
    if (!("serviceWorker" in navigator)) return null;
    try {
      const reg = await navigator.serviceWorker.register("./sw.js");
      return reg;
    } catch (e) {
      console.error("SW registration failed", e);
      return null;
    }
  },

  buildTodayMessage() {
    const schedule = AppData.getSchedule();
    const dayKey = Gamification.dayKeyFromDate(new Date());
    const day = schedule[dayKey];
    const settings = AppData.getSettings();
    if (!day || day.type === "REST") {
      return "Rest day. Pulihkan tubuhmu. Besok perang lagi.";
    }
    const quote = settings.notification_message || QuoteEngine.getRandom();
    return `Hari ini: ${day.label}. ${quote}`;
  },

  /**
   * Fires a local notification immediately (used for testing / fallback).
   * Real scheduled delivery relies on the Notification Triggers /
   * periodic background sync where supported by the browser.
   */
  fireLocalNotification(title, body) {
    if (this.permissionState() !== "granted") return false;
    try {
      if (navigator.serviceWorker && navigator.serviceWorker.controller) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon: "assets/icons/icon-192.png",
            badge: "assets/icons/icon-192.png",
            tag: "villain-arc-daily"
          });
        });
      } else {
        new Notification(title, { body, icon: "assets/icons/icon-192.png" });
      }
      return true;
    } catch (e) {
      return false;
    }
  },

  /**
   * In-app fallback: check on load whether "now" is within the
   * notification window and the user hasn't seen today's reminder.
   */
  checkFallbackReminder() {
    const settings = AppData.getSettings();
    if (!settings.notification_enabled) return null;

    // Sebelumnya kondisi jam di komentar di atas tidak pernah benar-benar
    // dicek — reminder muncul kapan saja app dibuka, termasuk jam 8 malam,
    // meski user set jam notifikasi 04:55. Sekarang dibandingkan ke
    // settings.notification_time.
    const [targetH, targetM] = (settings.notification_time || "04:55").split(":").map(Number);
    const now = new Date();
    const isPastTarget = now.getHours() > targetH || (now.getHours() === targetH && now.getMinutes() >= targetM);
    if (!isPastTarget) return null;

    const today = Gamification.dateKey();
    const seenKey = "va_reminder_seen_" + today;
    if (Store.get(seenKey, false)) return null;
    Store.set(seenKey, true);
    return {
      title: "VILLAIN ARC ⚔️",
      body: this.buildTodayMessage()
    };
  },

  // ------------------------------------------------------------
  // PUSH SERVER (opsional) — supaya notifikasi tetap masuk walau
  // app/browser tertutup. Butuh Worker URL dari push-server/README.md.
  // ------------------------------------------------------------

  async subscribeToPush(workerUrl) {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      throw new Error("Browser ini tidak mendukung Push API.");
    }
    const perm = await this.requestPermission();
    if (perm !== "granted") throw new Error("Izin notifikasi ditolak.");

    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
      });
    }

    const settings = AppData.getSettings();
    const tzOffsetMinutes = -new Date().getTimezoneOffset(); // menit di timur UTC (WIB = 420)

    const res = await fetch(workerUrl.replace(/\/+$/, "") + "/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subscription: sub.toJSON(),
        notification_time: settings.notification_time || "04:55",
        message: settings.notification_message || "",
        tz_offset_minutes: tzOffsetMinutes
      })
    });
    if (!res.ok) throw new Error(`Push server menolak (HTTP ${res.status}). Cek Worker URL & deployment.`);
    Store.set("va_push_endpoint", sub.endpoint);
    Store.set("va_push_worker_url", workerUrl);
    return sub;
  },

  async unsubscribeFromPush() {
    const workerUrl = Store.get("va_push_worker_url", "");
    const reg = await navigator.serviceWorker.ready.catch(() => null);
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    if (sub) {
      if (workerUrl) {
        await fetch(workerUrl.replace(/\/+$/, "") + "/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint })
        }).catch(() => {});
      }
      await sub.unsubscribe().catch(() => {});
    }
    Store.set("va_push_endpoint", null);
  },

  isPushSubscribed() {
    return !!Store.get("va_push_endpoint", null);
  },

  async sendTestPush(workerUrl) {
    const endpoint = Store.get("va_push_endpoint", null);
    if (!endpoint) throw new Error("Belum aktifkan push server.");
    const res = await fetch(workerUrl.replace(/\/+$/, "") + "/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint })
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data.error) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  }
};

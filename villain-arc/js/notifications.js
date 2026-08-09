// ============================================================
// VILLAIN ARC — Notification logic
// ============================================================

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
  }
};

// ============================================================
// VILLAIN ARC — Timer module (test timer + rest timer)
// ============================================================

const Timer = {
  interval: null,
  remaining: 0,
  total: 0,
  onTick: null,
  onComplete: null,
  running: false,

  start(seconds, { onTick, onComplete } = {}) {
    this.stop();
    this.total = seconds;
    this.remaining = seconds;
    this.onTick = onTick || (() => {});
    this.onComplete = onComplete || (() => {});
    this.running = true;
    this._beep(880, 100);
    this._vibrate([80]);
    this.onTick(this.remaining, this.total);
    this.interval = setInterval(() => {
      this.remaining -= 1;
      this.onTick(this.remaining, this.total);
      if (this.remaining <= 0) {
        this.stop();
        this._beep(440, 300);
        this._vibrate([200, 100, 200]);
        this.onComplete();
      }
    }, 1000);
  },

  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this.running = false;
  },

  formatTime(seconds) {
    const s = Math.max(0, seconds);
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  },

  getZone(remaining, total) {
    if (total <= 60) {
      if (remaining > 30) return "ok";
      if (remaining > 10) return "warn";
      return "critical";
    }
    const pct = remaining / total;
    if (pct > 0.5) return "ok";
    if (pct > 0.15) return "warn";
    return "critical";
  },

  _vibrate(pattern) {
    if (navigator.vibrate) {
      try { navigator.vibrate(pattern); } catch (e) { /* ignore */ }
    }
  },

  _audioCtx: null,
  _beep(freq, duration) {
    const settings = AppData.getSettings();
    if (!settings.sound_enabled) return;
    try {
      if (!this._audioCtx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        this._audioCtx = new AC();
      }
      const ctx = this._audioCtx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = "sine";
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch (e) { /* ignore audio errors */ }
  }
};

// ---- Rest timer (lightweight, separate from main Timer) ----
const RestTimer = {
  interval: null,
  remaining: 0,
  defaultSeconds: 45,

  start(seconds, onTick, onComplete) {
    this.stop();
    this.remaining = seconds;
    onTick(this.remaining);
    this.interval = setInterval(() => {
      this.remaining -= 1;
      onTick(this.remaining);
      if (this.remaining <= 0) {
        this.stop();
        if (navigator.vibrate) { try { navigator.vibrate(150); } catch (e) {} }
        onComplete();
      }
    }, 1000);
  },

  stop() {
    if (this.interval) { clearInterval(this.interval); this.interval = null; }
  }
};

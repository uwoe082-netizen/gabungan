// ============================================================
// VILLAIN ARC — UI helpers: particles, toast, confetti, celebration
// ============================================================

const UI = {
  toastTimeout: null,

  toast(message, duration = 2200) {
    let el = document.getElementById("toast");
    if (!el) {
      el = document.createElement("div");
      el.id = "toast";
      el.className = "toast";
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.classList.add("is-visible");
    clearTimeout(this.toastTimeout);
    this.toastTimeout = setTimeout(() => el.classList.remove("is-visible"), duration);
  },

  screenFlash() {
    const flash = document.createElement("div");
    flash.className = "screen-flash";
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 550);
  },

  confettiBurst(count = 40) {
    const colors = ["#dc2626", "#f59e0b", "#8b5cf6", "#10b981", "#f4f4f5"];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = Math.random() * 100 + "vw";
      piece.style.background = colors[Math.floor(Math.random() * colors.length)];
      piece.style.animationDelay = (Math.random() * 0.4) + "s";
      piece.style.borderRadius = Math.random() > 0.5 ? "50%" : "2px";
      document.body.appendChild(piece);
      setTimeout(() => piece.remove(), 2800);
    }
  },

  showCelebration({ title = "MISSION COMPLETE", xp = 0, sub = "" }) {
    this.screenFlash();
    this.confettiBurst();
    const overlay = document.createElement("div");
    overlay.className = "celebration-overlay";
    overlay.innerHTML = `
      <div class="celebration-title">${title}</div>
      <div class="celebration-xp">+${xp} XP</div>
      <div class="celebration-sub">${sub}</div>
      <button class="btn btn-primary mt-lg" style="max-width:220px" data-action="close-celebration">LANJUTKAN</button>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
    overlay.querySelector('[data-action="close-celebration"]').addEventListener("click", () => {
      overlay.classList.remove("is-visible");
      setTimeout(() => overlay.remove(), 350);
    });
  },

  floatXP(anchorEl, amount) {
    if (!anchorEl) return;
    const el = document.createElement("div");
    el.className = "xp-float";
    el.textContent = `+${amount} XP`;
    anchorEl.appendChild(el);
    setTimeout(() => el.remove(), 950);
  },

  openModal(contentHTML) {
    let overlay = document.getElementById("modal-overlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "modal-overlay";
      overlay.className = "modal-overlay";
      document.body.appendChild(overlay);
      overlay.addEventListener("click", (e) => {
        if (e.target === overlay) UI.closeModal();
      });
    }
    overlay.innerHTML = `<div class="modal-sheet">${contentHTML}</div>`;
    requestAnimationFrame(() => overlay.classList.add("is-open"));
  },

  closeModal() {
    const overlay = document.getElementById("modal-overlay");
    if (overlay) overlay.classList.remove("is-open");
  },

  formatNumber(n) {
    return new Intl.NumberFormat("id-ID").format(n);
  },

  escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
  },

  // ---- Ember particle background (lightweight canvas) ----
  initEmberCanvas() {
    let canvas = document.getElementById("ember-canvas");
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.id = "ember-canvas";
      document.body.appendChild(canvas);
    }
    const ctx = canvas.getContext("2d");
    let particles = [];
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener("resize", resize);

    function makeParticle() {
      return {
        x: Math.random() * canvas.width,
        y: canvas.height + 10,
        r: Math.random() * 2 + 0.5,
        speed: Math.random() * 0.4 + 0.15,
        drift: (Math.random() - 0.5) * 0.3,
        opacity: Math.random() * 0.4 + 0.1,
        hue: Math.random() > 0.5 ? "220,38,38" : "245,158,11"
      };
    }

    const count = prefersReduced ? 0 : 28;
    for (let i = 0; i < count; i++) particles.push(makeParticle());

    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach((p) => {
        p.y -= p.speed;
        p.x += p.drift;
        if (p.y < -10) Object.assign(p, makeParticle(), { y: canvas.height + 10 });
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${p.hue},${p.opacity})`;
        ctx.fill();
      });
      if (!prefersReduced) requestAnimationFrame(tick);
    }
    if (!prefersReduced) requestAnimationFrame(tick);
  }
};

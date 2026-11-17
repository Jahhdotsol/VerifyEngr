// verifyEngr — motion
// Everything that moves: headline reveals, counting numbers, scroll effects,
// the 3D dotted building, and the tilt on cards and the certificate.
// If the visitor's device is set to "reduce motion", things simply appear.

(function () {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);

  // ---------- Header turns solid after scrolling ----------
  const header = document.querySelector(".site-header");
  const onScrollHeader = () => header && header.classList.toggle("scrolled", window.scrollY > 24);
  onScrollHeader();
  window.addEventListener("scroll", onScrollHeader, { passive: true });

  // ---------- Reveal on scroll (headlines, text, cards) ----------
  const revealables = document.querySelectorAll(".reveal-lines, .fade-up, .cards.animate");
  if (reduce || !("IntersectionObserver" in window)) {
    revealables.forEach((el) => el.classList.add("in"));
  } else {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    revealables.forEach((el) => io.observe(el));
  }

  // ---------- Numbers count up when they come into view ----------
  const counters = document.querySelectorAll("[data-count]");
  const formatNum = (el, v) => {
    const dec = Number(el.dataset.decimals || 0);
    el.textContent = v.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec }) + (el.dataset.suffix || "");
  };
  const runCount = (el) => {
    const end = Number(el.dataset.count);
    if (reduce) return formatNum(el, end);
    const t0 = performance.now(), dur = 1800;
    const tick = (now) => {
      const p = clamp((now - t0) / dur);
      formatNum(el, end * easeOut(p));
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  if ("IntersectionObserver" in window) {
    const cio = new IntersectionObserver((entries) => entries.forEach((en) => {
      if (en.isIntersecting) { runCount(en.target); cio.unobserve(en.target); }
    }), { threshold: 0.6 });
    counters.forEach((el) => cio.observe(el));
  } else counters.forEach((el) => formatNum(el, Number(el.dataset.count)));

  // ---------- Scroll-linked effects ----------
  const marquee = document.getElementById("marquee");
  const wavePath = document.getElementById("wavePath");
  const steps = document.getElementById("steps");
  const stepsLine = document.getElementById("stepsProgress");
  const stepEls = steps ? steps.querySelectorAll(".step") : [];

  // how far an element has travelled through the screen: 0 (just below) to 1 (just above)
  const progress = (el) => {
    const r = el.getBoundingClientRect(), vh = window.innerHeight;
    return clamp((vh - r.top) / (vh + r.height));
  };

  function onScroll() {
    if (marquee) {
      const p = progress(marquee.parentElement);
      marquee.style.transform = `translate3d(${(-p * 45).toFixed(2)}%, 0, 0)`;
    }
    if (wavePath) {
      const p = progress(wavePath.closest(".wave"));
      const a = 30 + 60 * Math.sin(p * Math.PI * 1.5), b = 150 - 60 * Math.sin(p * Math.PI);
      wavePath.setAttribute("d", `M0 90 C 360 ${a.toFixed(1)}, 720 ${b.toFixed(1)}, 1080 90 S 1440 ${(60 + 40 * p).toFixed(1)}, 1440 60 V180 H0 Z`);
    }
    if (steps) {
      const r = steps.getBoundingClientRect(), vh = window.innerHeight;
      const p = clamp((vh * 0.8 - r.top) / (r.height + vh * 0.3));
      if (stepsLine) stepsLine.setAttribute("stroke-dashoffset", String(1000 - 1000 * p));
      stepEls.forEach((s, i) => s.classList.toggle("lit", p >= i / stepEls.length + 0.05 || reduce));
    }
  }
  if (!reduce) {
    let ticking = false;
    window.addEventListener("scroll", () => {
      if (!ticking) { requestAnimationFrame(() => { onScroll(); ticking = false; }); ticking = true; }
    }, { passive: true });
  }
  onScroll();
  if (reduce) stepEls.forEach((s) => s.classList.add("lit"));

  // ---------- The glowing ring around Quick verify slowly turns ----------
  const ring = document.querySelector(".verify");
  if (ring && !reduce) {
    const spin = (now) => { ring.style.setProperty("--ring-angle", `${(now / 25) % 360}deg`); requestAnimationFrame(spin); };
    requestAnimationFrame(spin);
  }

  // "Check an engineer" button: scroll to the top and put the cursor in the box
  const ctaVerify = document.getElementById("cta-verify");
  if (ctaVerify) ctaVerify.addEventListener("click", () => setTimeout(() => document.getElementById("verify-input").focus({ preventScroll: true }), 700));

  // ---------- Tilt cards and the certificate towards the pointer ----------
  function bindTilt() {
    if (!canHover || reduce) return;
    document.querySelectorAll(".tilt:not([data-tilt])").forEach((el) => {
      el.dataset.tilt = "1";
      const max = el.classList.contains("cert") ? 5 : 8;
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
        el.style.setProperty("--ry", `${((x - 0.5) * max).toFixed(2)}deg`);
        el.style.setProperty("--rx", `${((0.5 - y) * max).toFixed(2)}deg`);
        el.style.setProperty("--mx", `${(x * 100).toFixed(1)}%`);
        el.style.setProperty("--my", `${(y * 100).toFixed(1)}%`);
        el.style.setProperty("--sheen", `${(x * 100).toFixed(1)}%`);
      });
      el.addEventListener("pointerleave", () => {
        ["--rx", "--ry"].forEach((p) => el.style.setProperty(p, "0deg"));
      });
    });
  }

  // replay the card entrance whenever the list changes (search, filters, show more)
  document.addEventListener("cards:updated", () => {
    bindTilt();
    const cards = document.querySelector(".cards.animate");
    if (cards && !reduce && cards.classList.contains("in")) {
      cards.classList.remove("in");
      void cards.offsetWidth; // restart the transition
      requestAnimationFrame(() => cards.classList.add("in"));
    }
  });
  bindTilt();

  // ---------- 3D dotted building frame (hero) ----------
  const canvas = document.getElementById("frame3d");
  if (canvas) initFrame(canvas);

  function initFrame(cv) {
    const ctx = cv.getContext("2d");
    const pts = [];
    const BX = 4, BZ = 3, FLOORS = 11, FH = 0.62;      // bays across, bays deep, floors, floor height
    const x0 = -BX / 2, z0 = -BZ / 2, H = FLOORS * FH;

    // beams along every grid line on every floor
    for (let f = 0; f <= FLOORS; f++) {
      const y = f * FH;
      for (let i = 0; i <= BX; i++) for (let s = 0; s <= BZ; s += 0.1) pts.push([x0 + i, y, z0 + s, 1]);
      for (let k = 0; k <= BZ; k++) for (let s = 0; s <= BX; s += 0.1) pts.push([x0 + s, y, z0 + k, 1]);
      // light halftone fill on each slab
      for (let a = 0.25; a < BX; a += 0.25) for (let b = 0.25; b < BZ; b += 0.25) if ((Math.round(a * 4) + Math.round(b * 4) + f) % 3 === 0) pts.push([x0 + a, y, z0 + b, 0.45]);
    }
    // columns at every grid node
    for (let i = 0; i <= BX; i++) for (let k = 0; k <= BZ; k++) for (let y = 0; y <= H; y += 0.09) pts.push([x0 + i, y, z0 + k, 1]);
    // a ring of dots on the ground
    for (let a = 0; a < Math.PI * 2; a += 0.035) pts.push([Math.cos(a) * 3.6, 0, Math.sin(a) * 3.6, 0.5]);

    let w = 0, h = 0, dpr = 1, mouseX = 0, mouseY = 0, visible = true;
    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const r = cv.getBoundingClientRect();
      w = r.width; h = r.height;
      cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener("resize", resize);
    if (canHover) window.addEventListener("pointermove", (e) => {
      mouseX = e.clientX / window.innerWidth - 0.5; mouseY = e.clientY / window.innerHeight - 0.5;
    });
    if ("IntersectionObserver" in window) new IntersectionObserver((en) => (visible = en[0].isIntersecting)).observe(cv);

    function draw(t) {
      ctx.clearRect(0, 0, w, h);
      const yaw = 0.6 + t * 0.00016 + window.scrollY * 0.0016 + mouseX * 0.5;
      const pitch = -0.38 + mouseY * 0.15;
      const cy = Math.cos(yaw), sy = Math.sin(yaw), cp = Math.cos(pitch), sp = Math.sin(pitch);
      const scale = Math.min(w, h) * 0.105, camera = 15;
      const dotScale = clamp(Math.min(w, h) / 640, 0.55, 1);   // smaller dots on small screens
      const scan = (Math.sin(t * 0.0007) * 0.5 + 0.5) * H;   // the green "scan" line moving up and down
      for (let n = 0; n < pts.length; n++) {
        const [px, py, pz, weight] = pts[n];
        // rotate around the vertical axis, then tilt
        const X = px * cy - pz * sy, Z0 = px * sy + pz * cy, Y0 = py - H / 2;
        const Y = Y0 * cp - Z0 * sp, Z = Y0 * sp + Z0 * cp;
        const k = camera / (camera + Z);
        const sx = w / 2 + X * scale * k, syy = h / 2 - Y * scale * k;
        const depth = clamp((Z + 4) / 8);
        const near = Math.abs(py - scan) < 0.16;
        const r = ((near ? 2.1 : 1.35) * k * weight + 0.25) * dotScale;
        ctx.fillStyle = near ? `rgba(24, 200, 120, ${0.95 - depth * 0.4})` : `rgba(35, 72, 232, ${(0.92 - depth * 0.62) * weight})`;
        ctx.fillRect(sx - r, syy - r, r * 2, r * 2);
      }
    }
    if (reduce) { draw(0); return; }
    const loop = (t) => { if (visible) draw(t); requestAnimationFrame(loop); };
    requestAnimationFrame(loop);
  }
})();

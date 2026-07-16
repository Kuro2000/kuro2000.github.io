/* Three motion primitives, per the Hallmark stamp:
   1. hero entrance stagger (pure CSS, .reveal)
   2. HP3 cursor spotlight, scoped to the hero
   3. number tick on the stat strip (one-shot, IntersectionObserver)
   Everything respects prefers-reduced-motion. */

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---- deep-link landing ----
     The browser resolves #hash before web fonts and lazy images settle, so the
     anchor scroll lands short. Re-land once everything has its final height. */
  if (location.hash) {
    let target = null;
    try { target = document.querySelector(location.hash); } catch { /* not a valid selector */ }
    if (target) {
      // Landing must be instant, not an animated crawl from the top of the page.
      // html has scroll-behavior: smooth, so suspend it for this one jump.
      const land = () => {
        const html = document.documentElement;
        const previous = html.style.scrollBehavior;
        html.style.scrollBehavior = "auto";
        target.scrollIntoView({ block: "start", behavior: "instant" });
        html.style.scrollBehavior = previous;
      };
      window.addEventListener("load", land, { once: true });
      if (document.fonts && document.fonts.ready) document.fonts.ready.then(land);
    }
  }

  /* ---- nav sheet (mobile) ---- */
  const toggle = document.querySelector(".nav-toggle");
  const sheet = document.querySelector(".nav-sheet");
  if (toggle && sheet) {
    const close = () => {
      sheet.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    };
    toggle.addEventListener("click", () => {
      const open = sheet.classList.toggle("is-open");
      toggle.setAttribute("aria-expanded", String(open));
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape") close();
    });
    document.addEventListener("click", (e) => {
      if (!sheet.contains(e.target) && !toggle.contains(e.target)) close();
    });
  }

  /* ---- HP3 cursor spotlight, hero-scoped ---- */
  const hero = document.querySelector(".hero");
  const spotlight = document.querySelector(".hero__spotlight");
  if (hero && spotlight && !reduceMotion.matches) {
    hero.addEventListener("pointermove", (e) => {
      const r = hero.getBoundingClientRect();
      hero.style.setProperty("--mx", `${e.clientX - r.left}px`);
      hero.style.setProperty("--my", `${e.clientY - r.top}px`);
    });
  }

  /* ---- number tick (one-shot) ---- */
  const stats = document.querySelectorAll("[data-count]");
  const fmt = (el, value) => {
    if (el.dataset.format === "compact") {
      return value >= 1_000_000
        ? `${Math.round(value / 1_000_000)}M`
        : new Intl.NumberFormat("en").format(value);
    }
    return new Intl.NumberFormat("en").format(value);
  };
  const finalText = (el) => fmt(el, Number(el.dataset.count)) + (el.dataset.suffix || "");

  if (stats.length && "IntersectionObserver" in window && !reduceMotion.matches) {
    const tick = (el) => {
      const target = Number(el.dataset.count);
      const dur = 1200;
      const t0 = performance.now();
      const step = (t) => {
        const p = Math.min((t - t0) / dur, 1);
        const eased = 1 - Math.pow(1 - p, 3);
        el.textContent = fmt(el, Math.round(target * eased)) + (p === 1 ? el.dataset.suffix || "" : "");
        if (p < 1) requestAnimationFrame(step);
      };
      requestAnimationFrame(step);
    };
    const seen = new WeakSet();
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !seen.has(entry.target)) {
            seen.add(entry.target);
            tick(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    stats.forEach((el) => {
      el.setAttribute("aria-label", finalText(el));
      io.observe(el);
    });
  } else {
    stats.forEach((el) => { el.textContent = finalText(el); });
  }
})();

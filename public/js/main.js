(() => {
  "use strict";

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  /* ---------- loader ---------- */
  const loader = document.getElementById("loader");
  window.addEventListener("load", () => {
    if (!loader) return;
    setTimeout(() => loader.classList.add("is-done"), reduceMotion ? 0 : 700);
  });

  /* ---------- mobile nav ---------- */
  const header = document.getElementById("header");
  const toggle = document.querySelector(".nav-toggle");
  const mobileNav = document.getElementById("mobile-nav");

  function setNav(open) {
    if (!toggle || !mobileNav) return;
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    mobileNav.hidden = !open;
  }

  if (toggle && mobileNav) {
    toggle.addEventListener("click", () => {
      const open = toggle.getAttribute("aria-expanded") !== "true";
      setNav(open);
    });
    mobileNav.querySelectorAll("a").forEach((a) => {
      a.addEventListener("click", () => setNav(false));
    });
  }

  /* ---------- header show / hide ---------- */
  let lastY = window.scrollY;
  function onScrollHeader() {
    if (!header) return;
    const y = window.scrollY;
    header.classList.toggle("is-scrolled", y > 24);
    if (y > 120 && y > lastY) header.classList.add("is-hidden");
    else header.classList.remove("is-hidden");
    lastY = y;
  }
  window.addEventListener("scroll", onScrollHeader, { passive: true });
  onScrollHeader();

  /* ---------- custom cursor ---------- */
  const cursor = document.querySelector(".cursor");
  const cursorRing = cursor?.querySelector(".cursor-ring");
  const cursorDot = cursor?.querySelector(".cursor-dot");
  if (cursor && cursorRing && cursorDot && !reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    let x = -100, y = -100;
    let rx = -100, ry = -100;
    let dx = -100, dy = -100;
    let seen = false;

    window.addEventListener("mousemove", (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!seen) {
        seen = true;
        rx = dx = x;
        ry = dy = y;
        cursor.classList.add("is-active");
      }
    }, { passive: true });

    document.addEventListener("mouseleave", () => cursor.classList.remove("is-active"));
    document.addEventListener("mouseenter", () => {
      if (seen) cursor.classList.add("is-active");
    });
    window.addEventListener("mousedown", () => cursor.classList.add("is-down"));
    window.addEventListener("mouseup", () => cursor.classList.remove("is-down"));

    function loopCursor() {
      // dot — почти сразу, ring — мягко догоняет
      dx += (x - dx) * 0.35;
      dy += (y - dy) * 0.35;
      rx += (x - rx) * 0.14;
      ry += (y - ry) * 0.14;
      cursorDot.style.transform = `translate3d(${dx}px, ${dy}px, 0)`;
      cursorRing.style.transform = `translate3d(${rx}px, ${ry}px, 0)`;
      requestAnimationFrame(loopCursor);
    }
    loopCursor();

    document.querySelectorAll("a, button, input, textarea, [data-magnetic]").forEach((el) => {
      el.addEventListener("mouseenter", () => cursor.classList.add("is-hover"));
      el.addEventListener("mouseleave", () => cursor.classList.remove("is-hover"));
    });
  }

  /* ---------- magnetic buttons ---------- */
  if (!reduceMotion && window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
    document.querySelectorAll("[data-magnetic]").forEach((el) => {
      el.addEventListener("mousemove", (e) => {
        const r = el.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2);
        const dy = e.clientY - (r.top + r.height / 2);
        el.style.transform = `translate(${dx * 0.18}px, ${dy * 0.22}px)`;
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "";
      });
    });
  }

  /* ---------- smooth scroll (Lenis) ---------- */
  let lenis = null;
  const gsapReady = typeof window.gsap !== "undefined";
  const stReady = typeof window.ScrollTrigger !== "undefined";

  if (!reduceMotion && typeof window.Lenis !== "undefined") {
    lenis = new window.Lenis({
      duration: 1.15,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    if (gsapReady) {
      lenis.on("scroll", () => window.ScrollTrigger?.update());
      window.gsap.ticker.add((time) => lenis.raf(time * 1000));
      window.gsap.ticker.lagSmoothing(0);
    } else {
      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);
    }
  }

  // Anchor links via Lenis when available
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", (e) => {
      const id = anchor.getAttribute("href");
      if (!id || id === "#") return;
      const target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      if (lenis) lenis.scrollTo(target, { offset: -20 });
      else target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" });
    });
  });

  /* ---------- GSAP animations ---------- */
  if (gsapReady && stReady && !reduceMotion) {
    const gsap = window.gsap;
    const ScrollTrigger = window.ScrollTrigger;
    gsap.registerPlugin(ScrollTrigger);

    // Hero title words
    gsap.from(".hero-title .word", {
      yPercent: 120,
      autoAlpha: 0,
      duration: 1,
      ease: "power3.out",
      stagger: 0.08,
      delay: 0.75,
    });

    // Generic reveals
    gsap.utils.toArray(".reveal").forEach((el) => {
      gsap.from(el, {
        autoAlpha: 0,
        y: 40,
        duration: 0.9,
        ease: "power2.out",
        scrollTrigger: {
          trigger: el,
          start: "top 88%",
          toggleActions: "play none none none",
        },
      });
    });

    // Service rows stagger
    gsap.from(".service-row", {
      autoAlpha: 0,
      x: -30,
      duration: 0.8,
      ease: "power2.out",
      stagger: 0.08,
      scrollTrigger: {
        trigger: ".services-list",
        start: "top 80%",
      },
    });

    // Price rows
    gsap.from(".price-row", {
      autoAlpha: 0,
      y: 24,
      duration: 0.7,
      ease: "power2.out",
      stagger: 0.06,
      scrollTrigger: {
        trigger: ".price-table",
        start: "top 82%",
      },
    });

    // Panel assembly scrub
    const panel = document.getElementById("panel-svg");
    if (panel) {
      const base = panel.querySelectorAll(".part-base");
      const door = panel.querySelectorAll(".part-door");
      const rail = panel.querySelectorAll(".part-rail");
      const breakers = panel.querySelectorAll(".part-breaker");
      const modules = panel.querySelectorAll(".part-module");
      const wires = panel.querySelectorAll(".part-wire");
      const cover = panel.querySelectorAll(".part-cover");
      const screws = panel.querySelectorAll(".part-screw");
      const glow = panel.querySelectorAll(".panel-glow");

      const wirePaths = Array.from(wires)
        .map((w) => w.querySelector("path"))
        .filter(Boolean);
      wirePaths.forEach((path) => {
        const length = path.getTotalLength();
        path.style.strokeDasharray = String(length);
        path.style.strokeDashoffset = String(length);
      });

      const tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: ".process",
          start: "top 65%",
          end: "bottom 55%",
          scrub: 0.6,
        },
      });

      tl.from(base, { autoAlpha: 0, scale: 0.86, transformOrigin: "50% 50%", duration: 1 })
        .from(rail, { y: -70, autoAlpha: 0, duration: 1 }, 0.15)
        .from(screws, { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%", stagger: 0.1, duration: 0.8 }, 0.2)
        .from(breakers, { y: -110, autoAlpha: 0, stagger: 0.16, duration: 1.1 }, 0.35)
        .from(modules, {
          x: (i) => (i % 2 === 0 ? -120 : 120),
          y: 40,
          autoAlpha: 0,
          stagger: 0.2,
          duration: 1.2,
        }, 0.7)
        .to(wirePaths, { strokeDashoffset: 0, stagger: 0.12, duration: 1.2 }, 1.1)
        .from(wires, { autoAlpha: 0, duration: 0.4 }, 1.1)
        .from(cover, { y: 90, autoAlpha: 0, duration: 1.1 }, 1.5)
        .from(door, {
          x: -40,
          rotationY: -55,
          autoAlpha: 0,
          transformOrigin: "0% 50%",
          duration: 1.2,
        }, 1.7)
        .from(glow, { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.8 }, 2.1);

      gsap.to(panel, {
        y: -18,
        ease: "none",
        scrollTrigger: {
          trigger: ".process",
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      });
    }

  }

  /* ---------- form → Telegram backend ---------- */
  const form = document.getElementById("order-form");
  const success = document.getElementById("form-success");

  function setInvalid(field, on) {
    field.classList.toggle("invalid", on);
  }

  if (form) {
    form.querySelectorAll("input, textarea").forEach((field) => {
      field.addEventListener("input", () => setInvalid(field, false));
    });

    form.addEventListener("submit", async (event) => {
      event.preventDefault();

      const nameInput = form.elements.namedItem("name");
      const phoneInput = form.elements.namedItem("phone");
      const taskInput = form.elements.namedItem("task");
      const submitBtn = form.querySelector('button[type="submit"]');
      const label = submitBtn?.querySelector(".btn-label");

      const fields = [nameInput, phoneInput, taskInput];
      let valid = true;
      fields.forEach((field) => {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
        const empty = !field.value.trim();
        setInvalid(field, empty);
        if (empty) valid = false;
      });

      const phone = phoneInput instanceof HTMLInputElement ? phoneInput.value.trim() : "";
      if (phone && !/^[\d\s()+\-]{10,20}$/.test(phone)) {
        setInvalid(phoneInput, true);
        valid = false;
      }
      if (!valid) return;

      const payload = {
        name: nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "",
        phone,
        task: taskInput instanceof HTMLTextAreaElement ? taskInput.value.trim() : "",
        source: "site-form",
      };

      if (submitBtn) submitBtn.disabled = true;
      if (label) label.textContent = "Отправляем…";

      try {
        const res = await fetch("/api/lead", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await res.json().catch(() => ({ ok: false }));

        if (res.ok && data.ok) {
          form.reset();
          if (success) {
            const successText = success.querySelector("p");
            if (successText && data.queued) {
              successText.textContent =
                "Заявка принята и сохранена. Отвечу в ближайшее время. Если срочно — звоните.";
            }
            success.hidden = false;
          }
          setTimeout(() => {
            if (success) success.hidden = true;
          }, 5000);
        } else if (data.error) {
          // Бэкенд ответил (валидация / rate-limit) — показываем его текст
          showFormError(data.error);
        } else {
          // Нет API (GitHub Pages / 404 HTML) — запасной путь
          showFormError(
            "Не удалось отправить заявку: сервер заявок сейчас недоступен. " +
              "Напишите в Telegram https://t.me/li4niirobotbot_bot или позвоните +7 903 419-16-92 (tel:+79034191692)."
          );
        }
      } catch {
        showFormError(
          "Нет связи с сервером заявок. Откройте Telegram https://t.me/li4niirobotbot_bot " +
            "или позвоните +7 903 419-16-92 (tel:+79034191692)."
        );
      } finally {
        if (submitBtn) submitBtn.disabled = false;
        if (label) label.textContent = "Отправить заявку";
      }
    });
  }

  function showFormError(message) {
    let box = document.getElementById("form-error");
    if (!box) {
      box = document.createElement("div");
      box.id = "form-error";
      box.className = "form-error";
      box.setAttribute("role", "alert");
      form?.insertBefore(box, form.querySelector(".form-note"));
    }
    box.textContent = "";
    // Линкуем t.me и tel: из текста ошибки (запасной путь без API)
    const linkRe = /(https:\/\/t\.me\/[A-Za-z0-9_]+)|(tel:\+?[\d\s()\-]{10,20})/g;
    let last = 0;
    let m;
    while ((m = linkRe.exec(message)) !== null) {
      box.appendChild(document.createTextNode(message.slice(last, m.index)));
      const a = document.createElement("a");
      a.href = m[0];
      if (m[0].startsWith("https://")) {
        a.target = "_blank";
        a.rel = "noopener noreferrer";
      }
      a.textContent = m[0].startsWith("tel:") ? "+7 903 419-16-92" : m[0];
      box.appendChild(a);
      last = m.index + m[0].length;
    }
    box.appendChild(document.createTextNode(message.slice(last)));
    box.hidden = false;
    clearTimeout(showFormError._t);
    showFormError._t = setTimeout(() => {
      box.hidden = true;
    }, 8000);
  }
})();

(() => {
  const yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = String(new Date().getFullYear());

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.querySelector(".nav");

  if (toggle && header && nav) {
    toggle.addEventListener("click", () => {
      const open = header.classList.toggle("nav-open");
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
    });

    nav.querySelectorAll("a").forEach((link) => {
      link.addEventListener("click", () => {
        header.classList.remove("nav-open");
        toggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  const form = document.getElementById("order-form");
  if (form) {
    form.addEventListener("submit", (event) => {
      event.preventDefault();

      const nameInput = form.elements.namedItem("name");
      const phoneInput = form.elements.namedItem("phone");
      const taskInput = form.elements.namedItem("task");

      const name = nameInput instanceof HTMLInputElement ? nameInput.value.trim() : "";
      const phone = phoneInput instanceof HTMLInputElement ? phoneInput.value.trim() : "";
      const task = taskInput instanceof HTMLTextAreaElement ? taskInput.value.trim() : "";

      let valid = true;

      [nameInput, phoneInput, taskInput].forEach((field) => {
        if (!(field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement)) return;
        const empty = !field.value.trim();
        field.classList.toggle("invalid", empty);
        if (empty) valid = false;
      });

      if (!valid) return;

      const message = [
        "Здравствуйте! Заявка с сайта.",
        `Имя: ${name}`,
        `Телефон: ${phone}`,
        `Задача: ${task}`,
      ].join("\n");

      const url = `https://t.me/+79034191692?text=${encodeURIComponent(message)}`;
      window.open(url, "_blank", "noopener,noreferrer");
    });

    form.querySelectorAll("input, textarea").forEach((field) => {
      field.addEventListener("input", () => field.classList.remove("invalid"));
    });
  }

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const gsapReady = typeof window.gsap !== "undefined" && typeof window.ScrollTrigger !== "undefined";

  if (reduceMotion || !gsapReady) return;

  const gsap = window.gsap;
  const ScrollTrigger = window.ScrollTrigger;
  gsap.registerPlugin(ScrollTrigger);

  const revealItems = gsap.utils.toArray(".reveal");
  revealItems.forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0,
      y: 36,
      duration: 0.85,
      ease: "power2.out",
      scrollTrigger: {
        trigger: el,
        start: "top 88%",
        toggleActions: "play none none reverse",
      },
    });
  });

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

    const wirePaths = Array.from(wires).map((wire) => wire.querySelector("path")).filter(Boolean);
    wirePaths.forEach((path) => {
      const length = path.getTotalLength();
      path.style.strokeDasharray = String(length);
      path.style.strokeDashoffset = String(length);
    });

    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: ".assembly",
        start: "top 70%",
        end: "bottom 55%",
        scrub: true,
      },
    });

    tl.from(base, { autoAlpha: 0, scale: 0.86, transformOrigin: "50% 50%", duration: 1 })
      .from(rail, { y: -70, autoAlpha: 0, duration: 1 }, 0.15)
      .from(screws, { scale: 0, autoAlpha: 0, transformOrigin: "50% 50%", stagger: 0.12, duration: 0.8 }, 0.2)
      .from(breakers, { y: -110, autoAlpha: 0, stagger: 0.18, duration: 1.1 }, 0.35)
      .from(modules, { x: (i) => (i % 2 === 0 ? -120 : 120), y: 40, autoAlpha: 0, stagger: 0.22, duration: 1.2 }, 0.7)
      .to(wirePaths, { strokeDashoffset: 0, stagger: 0.14, duration: 1.2 }, 1.1)
      .from(wires, { autoAlpha: 0, duration: 0.4 }, 1.1)
      .from(cover, { y: 90, autoAlpha: 0, duration: 1.1 }, 1.5)
      .from(door, { x: -40, rotationY: -55, autoAlpha: 0, transformOrigin: "0% 50%", duration: 1.2 }, 1.7)
      .from(glow, { autoAlpha: 0, scale: 0.6, transformOrigin: "50% 50%", duration: 0.8 }, 2.1);

    gsap.to(panel, {
      y: -18,
      ease: "none",
      scrollTrigger: {
        trigger: ".assembly",
        start: "top bottom",
        end: "bottom top",
        scrub: true,
      },
    });
  }

})();

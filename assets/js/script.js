const services = [
  {
    name: "websites",
    image: "assets/img/service-website.png",
    alt: "Website: construção de sites e landing pages sob medida, responsivos e seguros.",
  },
  {
    name: "tráfego pago",
    image: "assets/img/service-traffic.png",
    alt: "Tráfego pago: mídia paga estratégica em Google, Meta, TikTok e LinkedIn.",
  },
  {
    name: "design gráfico",
    image: "assets/img/service-design.png",
    alt: "Design gráfico: criativos, identidade e peças visuais com padrão profissional.",
  },
  {
    name: "estruturação estratégica",
    image: "assets/img/service-strategy.png",
    alt: "Estruturação estratégica: direção para organizar o marketing antes da execução.",
  },
];

const root = document.documentElement;

function observeMotionPreference() {
  const reduceMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  const finePointerQuery = window.matchMedia("(hover: hover) and (pointer: fine)");
  const state = {
    reduceMotion: reduceMotionQuery.matches,
    finePointer: finePointerQuery.matches,
  };

  const sync = () => {
    state.reduceMotion = reduceMotionQuery.matches;
    state.finePointer = finePointerQuery.matches;
    root.classList.toggle("reduced-motion", state.reduceMotion);
    root.classList.toggle("fine-pointer", state.finePointer);
  };

  const bind = (query, handler) => {
    if (query.addEventListener) {
      query.addEventListener("change", handler);
      return;
    }

    query.addListener(handler);
  };

  sync();
  bind(reduceMotionQuery, sync);
  bind(finePointerQuery, sync);

  return state;
}

function initRevealAnimations(state) {
  const revealElements = [...document.querySelectorAll(".reveal")];
  if (!revealElements.length) return;

  if (state.reduceMotion || !("IntersectionObserver" in window)) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const revealObserver = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      });
    },
    { threshold: 0.14, rootMargin: "0px 0px -12%" },
  );

  revealElements.forEach((element) => {
    revealObserver.observe(element);
  });
}

function initServiceCarousel(state) {
  const serviceImage = document.querySelector(".service-image");
  const serviceTabs = [...document.querySelectorAll(".service-tab")];
  const serviceDots = [...document.querySelectorAll(".carousel-dots button")];
  const previousButton = document.querySelector(".carousel-arrow--prev");
  const nextButton = document.querySelector(".carousel-arrow--next");
  const serviceStage = document.querySelector(".service-stage");

  if (
    !serviceImage ||
    !serviceTabs.length ||
    !serviceDots.length ||
    !previousButton ||
    !nextButton ||
    !serviceStage
  ) {
    return;
  }

  let activeService = 0;
  let changingService = false;
  let touchStartX = 0;

  services.forEach(({ image }) => {
    const preload = new Image();
    preload.src = image;
  });

  const syncServiceState = (index) => {
    const nextService = services[index];

    serviceTabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    serviceDots.forEach((dot, dotIndex) => {
      const selected = dotIndex === index;
      dot.classList.toggle("is-active", selected);
      dot.setAttribute("aria-current", selected ? "true" : "false");
    });

    serviceStage.setAttribute("aria-label", nextService.name);
    activeService = index;
  };

  const getDirection = (rawIndex, normalizedIndex) => {
    if (rawIndex < 0 || rawIndex === activeService - 1) return -1;
    if (rawIndex >= services.length || rawIndex === activeService + 1) return 1;
    return normalizedIndex > activeService ? 1 : -1;
  };

  const updateService = (rawIndex) => {
    const normalizedIndex = (rawIndex + services.length) % services.length;
    if (changingService || normalizedIndex === activeService) return;

    const nextService = services[normalizedIndex];
    const direction = getDirection(rawIndex, normalizedIndex);

    serviceStage.style.setProperty("--carousel-direction", String(direction));

    if (state.reduceMotion) {
      serviceImage.src = nextService.image;
      serviceImage.alt = nextService.alt;
      syncServiceState(normalizedIndex);
      return;
    }

    changingService = true;
    serviceStage.classList.add("is-changing");
    serviceImage.classList.add("is-leaving");

    window.setTimeout(() => {
      serviceImage.classList.remove("is-leaving");
      serviceImage.classList.add("is-entering");
      serviceImage.src = nextService.image;
      serviceImage.alt = nextService.alt;
      syncServiceState(normalizedIndex);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          serviceImage.classList.remove("is-entering");
          serviceStage.classList.remove("is-changing");
          changingService = false;
        });
      });
    }, 210);
  };

  syncServiceState(activeService);

  document.querySelectorAll("[data-service]").forEach((control) => {
    control.addEventListener("click", () => {
      updateService(Number(control.dataset.service));
    });
  });

  previousButton.addEventListener("click", () => updateService(activeService - 1));
  nextButton.addEventListener("click", () => updateService(activeService + 1));

  serviceTabs.forEach((tab, index) => {
    tab.addEventListener("keydown", (event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();

      let nextIndex = index;
      if (event.key === "ArrowLeft") nextIndex = index - 1;
      if (event.key === "ArrowRight") nextIndex = index + 1;
      if (event.key === "Home") nextIndex = 0;
      if (event.key === "End") nextIndex = services.length - 1;

      nextIndex = (nextIndex + services.length) % services.length;
      updateService(nextIndex);
      serviceTabs[nextIndex].focus();
    });
  });

  serviceStage.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") updateService(activeService - 1);
    if (event.key === "ArrowRight") updateService(activeService + 1);
  });

  serviceStage.addEventListener(
    "touchstart",
    (event) => {
      touchStartX = event.changedTouches[0].clientX;
    },
    { passive: true },
  );

  serviceStage.addEventListener(
    "touchend",
    (event) => {
      const distance = event.changedTouches[0].clientX - touchStartX;
      if (Math.abs(distance) < 45) return;
      updateService(activeService + (distance < 0 ? 1 : -1));
    },
    { passive: true },
  );
}

function initPointerDepth(state) {
  const depthElements = [...document.querySelectorAll("[data-depth]")];
  if (!depthElements.length) return;

  const profiles = {
    card: { rotate: 0.9, shift: 7, scale: 1.012, glow: 0.95 },
    media: { rotate: 0.7, shift: 5, scale: 1.008, glow: 0.78 },
    review: { rotate: 0.45, shift: 3, scale: 1.008, glow: 0 },
  };

  depthElements.forEach((element) => {
    const profile = profiles[element.dataset.depth];
    if (!profile) return;

    let frameId = 0;
    let current = { rx: 0, ry: 0, tx: 0, ty: 0, scale: 1, glow: 0 };
    let target = { ...current };

    const applyStyles = () => {
      element.style.setProperty("--depth-rotate-x", `${current.rx.toFixed(3)}deg`);
      element.style.setProperty("--depth-rotate-y", `${current.ry.toFixed(3)}deg`);
      element.style.setProperty("--depth-shift-x", `${current.tx.toFixed(3)}px`);
      element.style.setProperty("--depth-shift-y", `${current.ty.toFixed(3)}px`);
      element.style.setProperty("--depth-scale", current.scale.toFixed(4));
      element.style.setProperty("--glow-opacity", current.glow.toFixed(3));
    };

    const scheduleFrame = () => {
      if (frameId) return;
      element.style.willChange = "transform";
      frameId = requestAnimationFrame(renderFrame);
    };

    const resetTarget = () => {
      target = { rx: 0, ry: 0, tx: 0, ty: 0, scale: 1, glow: 0 };
      scheduleFrame();
    };

    const renderFrame = () => {
      frameId = 0;

      current.rx += (target.rx - current.rx) * 0.14;
      current.ry += (target.ry - current.ry) * 0.14;
      current.tx += (target.tx - current.tx) * 0.18;
      current.ty += (target.ty - current.ty) * 0.18;
      current.scale += (target.scale - current.scale) * 0.14;
      current.glow += (target.glow - current.glow) * 0.16;

      applyStyles();

      const stillMoving =
        Math.abs(target.rx - current.rx) > 0.01 ||
        Math.abs(target.ry - current.ry) > 0.01 ||
        Math.abs(target.tx - current.tx) > 0.05 ||
        Math.abs(target.ty - current.ty) > 0.05 ||
        Math.abs(target.scale - current.scale) > 0.001 ||
        Math.abs(target.glow - current.glow) > 0.01;

      if (stillMoving) {
        scheduleFrame();
        return;
      }

      element.style.removeProperty("will-change");
    };

    applyStyles();

    element.addEventListener("pointermove", (event) => {
      if (!state.finePointer || state.reduceMotion || event.pointerType === "touch") {
        resetTarget();
        return;
      }

      const bounds = element.getBoundingClientRect();
      const pointerX = (event.clientX - bounds.left) / bounds.width;
      const pointerY = (event.clientY - bounds.top) / bounds.height;
      const normalizedX = pointerX - 0.5;
      const normalizedY = pointerY - 0.5;

      target = {
        rx: (0.5 - pointerY) * profile.rotate * 2,
        ry: normalizedX * profile.rotate * 2,
        tx: normalizedX * profile.shift * 2,
        ty: normalizedY * profile.shift * 2,
        scale: profile.scale,
        glow: element.hasAttribute("data-glow") ? profile.glow : 0,
      };

      element.style.setProperty("--glow-x", `${(pointerX * 100).toFixed(2)}%`);
      element.style.setProperty("--glow-y", `${(pointerY * 100).toFixed(2)}%`);
      scheduleFrame();
    });

    element.addEventListener("pointerleave", resetTarget);
    element.addEventListener("pointercancel", resetTarget);
  });
}

function initPremiumButtons(state) {
  const buttons = [...document.querySelectorAll(".cta-button")];
  if (!buttons.length) return;

  buttons.forEach((button) => {
    button.addEventListener("pointermove", (event) => {
      if (!state.finePointer || state.reduceMotion || event.pointerType === "touch") {
        button.style.setProperty("--glow-opacity", "0");
        return;
      }

      const bounds = button.getBoundingClientRect();
      const pointerX = ((event.clientX - bounds.left) / bounds.width) * 100;
      const pointerY = ((event.clientY - bounds.top) / bounds.height) * 100;

      button.style.setProperty("--glow-x", `${pointerX.toFixed(2)}%`);
      button.style.setProperty("--glow-y", `${pointerY.toFixed(2)}%`);
      button.style.setProperty("--glow-opacity", "0.72");
      button.style.willChange = "transform";
    });

    const resetButton = () => {
      button.style.setProperty("--glow-opacity", "0");
      button.style.removeProperty("will-change");
    };

    button.addEventListener("pointerleave", resetButton);
    button.addEventListener("pointercancel", resetButton);
  });
}

function initLeadForms() {
  document.querySelectorAll("[data-lead-form]").forEach((form) => {
    const phoneInput = form.querySelector('input[type="tel"]');
    const status = form.querySelector(".form-status");
    if (!phoneInput || !status) return;

    phoneInput.addEventListener("input", () => {
      const digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
      let formatted = digits;

      if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length > 7) {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
      }

      phoneInput.value = formatted;
    });

    form.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!form.reportValidity()) return;

      const button = form.querySelector(".cta-button");
      if (!button) return;

      const originalText = button.innerHTML;
      button.disabled = true;
      button.textContent = "Solicitação enviada";
      status.textContent = "Obrigado. Nossa equipe entrará em contato em até 24h.";

      window.setTimeout(() => {
        button.disabled = false;
        button.innerHTML = originalText;
        form.reset();
      }, 2600);
    });
  });
}

function initMobileMotion() {
  const menuToggle = document.querySelector(".menu-toggle");
  const mainNav = document.querySelector(".main-nav");

  if (!menuToggle || !mainNav) return;

  const closeMenu = () => {
    menuToggle.setAttribute("aria-expanded", "false");
    mainNav.classList.remove("is-open");
    document.body.classList.remove("menu-open");
  };

  menuToggle.addEventListener("click", () => {
    const open = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!open));
    mainNav.classList.toggle("is-open", !open);
    document.body.classList.toggle("menu-open", !open);
  });

  mainNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", closeMenu);
  });

  window.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    closeMenu();
  });
}

const motionState = observeMotionPreference();

initRevealAnimations(motionState);
initServiceCarousel(motionState);
initPointerDepth(motionState);
initPremiumButtons(motionState);
initLeadForms();
initMobileMotion();

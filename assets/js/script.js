const services = [
  {
    name: "websites",
    title: "Website",
    description: "Construção de sites e landing pages sob medida, responsivos e seguros.",
    desktop: { src: "assets/img/service-website.png", width: 1052, height: 454 },
    mobile: { src: "assets/img/service-website-mobile.webp", width: 680, height: 454 },
  },
  {
    name: "tráfego pago",
    title: "Tráfego pago",
    description: "Mídia paga estratégica em Google, Meta, TikTok e LinkedIn com foco em aquisição rentável.",
    desktop: { src: "assets/img/service-traffic.png", width: 920, height: 448 },
    mobile: { src: "assets/img/service-traffic-mobile.webp", width: 450, height: 448 },
  },
  {
    name: "design gráfico",
    title: "Design gráfico",
    description: "Criativos, identidade e peças visuais com padrão profissional.",
    desktop: { src: "assets/img/service-design.png", width: 955, height: 428 },
    mobile: { src: "assets/img/service-design-mobile.webp", width: 490, height: 428 },
  },
  {
    name: "estruturação estratégica",
    title: "Estruturação estratégica",
    description: "Direção para organizar o marketing antes da execução.",
    desktop: { src: "assets/img/service-strategy.png", width: 1050, height: 438 },
    mobile: { src: "assets/img/service-strategy-mobile.webp", width: 550, height: 438 },
  },
];

const root = document.documentElement;
const leadButtonContentCache = new WeakMap();
const leadRequestTimeoutMs = 12000;
const leadStatusMessages = {
  loading: "Enviando...",
  success: "Solicitação enviada com sucesso.",
  validation: "Revise os dados informados.",
  rateLimit: "Aguarde alguns instantes antes de tentar novamente.",
  timeout: "O envio demorou mais do que o esperado. Tente novamente.",
  network: "Não foi possível enviar agora. Verifique sua conexão e tente novamente.",
  server: "Não foi possível enviar agora. Tente novamente.",
};
const leadFormAnchorMap = {
  hero: "inicio",
  final_cta: "contato",
};
const leadTrackingFieldNames = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"];

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
  const serviceTitle = document.querySelector(".service-title");
  const serviceDescription = document.querySelector(".service-description");
  const mobileViewportQuery = window.matchMedia("(max-width: 860px)");

  if (
    !serviceImage ||
    !serviceTabs.length ||
    !serviceDots.length ||
    !previousButton ||
    !nextButton ||
    !serviceStage ||
    !serviceTitle ||
    !serviceDescription
  ) {
    return;
  }

  let activeService = 0;
  let changingService = false;
  let touchStartX = 0;
  const preloadedAssets = new Set();

  const bindQuery = (query, handler) => {
    if (query.addEventListener) {
      query.addEventListener("change", handler);
      return;
    }

    query.addListener(handler);
  };

  const getServiceAsset = (service) => (mobileViewportQuery.matches ? service.mobile : service.desktop);

  const preloadServiceAsset = (index) => {
    const nextIndex = (index + services.length) % services.length;
    const asset = getServiceAsset(services[nextIndex]);
    if (preloadedAssets.has(asset.src)) return;

    const preload = new Image();
    preload.decoding = "async";
    preload.src = asset.src;
    preloadedAssets.add(asset.src);
  };

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

    serviceTitle.textContent = nextService.title;
    serviceDescription.textContent = nextService.description;
    serviceStage.setAttribute("aria-labelledby", serviceTabs[index].id);
    activeService = index;
  };

  const setServiceAsset = (index) => {
    const asset = getServiceAsset(services[index]);
    serviceImage.src = asset.src;
    serviceImage.width = asset.width;
    serviceImage.height = asset.height;
    serviceImage.alt = "";
    preloadServiceAsset(index + 1);
  };

  const getDirection = (rawIndex, normalizedIndex) => {
    if (rawIndex < 0 || rawIndex === activeService - 1) return -1;
    if (rawIndex >= services.length || rawIndex === activeService + 1) return 1;
    return normalizedIndex > activeService ? 1 : -1;
  };

  const renderService = (index) => {
    syncServiceState(index);
    setServiceAsset(index);
  };

  const updateService = (rawIndex, { animate = true, force = false } = {}) => {
    const normalizedIndex = (rawIndex + services.length) % services.length;
    if (changingService || (!force && normalizedIndex === activeService)) return;

    const direction = getDirection(rawIndex, normalizedIndex);

    serviceStage.style.setProperty("--carousel-direction", String(direction));

    if (state.reduceMotion || !animate) {
      renderService(normalizedIndex);
      return;
    }

    changingService = true;
    serviceStage.classList.add("is-changing");
    serviceImage.classList.add("is-leaving");

    window.setTimeout(() => {
      serviceImage.classList.remove("is-leaving");
      serviceImage.classList.add("is-entering");
      renderService(normalizedIndex);

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          serviceImage.classList.remove("is-entering");
          serviceStage.classList.remove("is-changing");
          changingService = false;
        });
      });
    }, 210);
  };

  renderService(activeService);

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

  bindQuery(mobileViewportQuery, () => {
    if (changingService) return;
    renderService(activeService);
  });
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

function getLeadFormOrigin(form) {
  return form.querySelector('input[name="form_origin"]')?.value ?? "";
}

function getLeadFormAnchor(form) {
  const origin = getLeadFormOrigin(form);
  return leadFormAnchorMap[origin] ?? form.closest("section[id]")?.id ?? "contato";
}

function cacheLeadButtonContent(button) {
  if (leadButtonContentCache.has(button)) return;

  leadButtonContentCache.set(
    button,
    [...button.childNodes].map((node) => node.cloneNode(true)),
  );
}

function restoreLeadButtonContent(button) {
  const cachedNodes = leadButtonContentCache.get(button);
  if (!cachedNodes) return;

  button.replaceChildren(...cachedNodes.map((node) => node.cloneNode(true)));
}

function setLeadFormStatus(statusElement, message) {
  statusElement.textContent = message;
}

function setLeadFormBusyState(form, button, busy) {
  form.setAttribute("aria-busy", String(busy));
  button.disabled = busy;
  button.setAttribute("aria-disabled", String(busy));
  form.dataset.submitting = busy ? "true" : "false";
}

function populateLeadTrackingFields(form) {
  const currentUrl = new URL(window.location.href);
  const pageUrlInput = form.querySelector('input[name="page_url"]');
  if (pageUrlInput) {
    pageUrlInput.value = currentUrl.toString();
  }

  leadTrackingFieldNames.forEach((fieldName) => {
    const input = form.querySelector(`input[name="${fieldName}"]`);
    if (!input) return;

    input.value = currentUrl.searchParams.get(fieldName) ?? "";
  });
}

function getLeadResponseMessage(responseStatus, data) {
  if (data && typeof data.message === "string" && data.message.trim()) {
    return data.message.trim();
  }

  if (responseStatus === 400) return leadStatusMessages.validation;
  if (responseStatus === 429) return leadStatusMessages.rateLimit;
  if (responseStatus === 500 || responseStatus === 503) return leadStatusMessages.server;

  return leadStatusMessages.server;
}

function handleLeadFallbackStatus(forms) {
  const currentUrl = new URL(window.location.href);
  const status = currentUrl.searchParams.get("status");
  if (!status || !["success", "error"].includes(status)) return;

  const hashId = window.location.hash.replace(/^#/, "");
  const targetForm =
    forms.find((form) => getLeadFormAnchor(form) === hashId) ??
    forms.find((form) => getLeadFormOrigin(form) === "final_cta") ??
    forms[0];

  const statusElement = targetForm?.querySelector(".form-status");
  if (statusElement) {
    setLeadFormStatus(
      statusElement,
      status === "success" ? leadStatusMessages.success : leadStatusMessages.server,
    );
  }

  currentUrl.searchParams.delete("status");
  const cleanSearch = currentUrl.searchParams.toString();
  const cleanUrl = `${currentUrl.pathname}${cleanSearch ? `?${cleanSearch}` : ""}${currentUrl.hash}`;
  window.history.replaceState({}, "", cleanUrl);
}

function initLeadForms() {
  const forms = [...document.querySelectorAll("[data-lead-form]")];
  if (!forms.length) return;

  const canEnhanceSubmission =
    typeof window.fetch === "function" &&
    typeof window.AbortController === "function" &&
    typeof window.FormData === "function";

  forms.forEach((form) => {
    const phoneInput = form.querySelector('input[type="tel"]');
    const statusElement = form.querySelector(".form-status");
    const button = form.querySelector(".cta-button");
    if (!phoneInput || !statusElement || !button) return;

    cacheLeadButtonContent(button);
    populateLeadTrackingFields(form);
    setLeadFormBusyState(form, button, false);

    phoneInput.addEventListener("input", () => {
      const digits = phoneInput.value.replace(/\D/g, "").slice(0, 11);
      let formatted = digits;

      if (digits.length > 2) formatted = `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
      if (digits.length > 7) {
        formatted = `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
      }

      phoneInput.value = formatted;
    });

    if (!canEnhanceSubmission) return;

    form.addEventListener("submit", async (event) => {
      event.preventDefault();
      if (form.dataset.submitting === "true") return;

      populateLeadTrackingFields(form);

        if (!form.reportValidity()) {
          setLeadFormStatus(statusElement, leadStatusMessages.validation);
          const invalidField = form.querySelector(":invalid");
          invalidField?.focus();
          return;
        }

      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), leadRequestTimeoutMs);

      setLeadFormBusyState(form, button, true);
      button.textContent = leadStatusMessages.loading;
      setLeadFormStatus(statusElement, leadStatusMessages.loading);

      try {
        const response = await fetch(form.action, {
          method: "POST",
          body: new FormData(form),
          headers: {
            Accept: "application/json",
            "X-Requested-With": "XMLHttpRequest",
          },
          credentials: "same-origin",
          signal: controller.signal,
        });

        const rawResponse = await response.text();
        let data = null;

        if (rawResponse) {
          try {
            data = JSON.parse(rawResponse);
          } catch (error) {
            data = null;
          }
        }

        if (response.ok && data?.ok === true) {
          setLeadFormStatus(statusElement, leadStatusMessages.success);
          form.reset();
          populateLeadTrackingFields(form);
          return;
        }

        setLeadFormStatus(statusElement, getLeadResponseMessage(response.status, data));

        const invalidField = form.querySelector(":invalid");
        invalidField?.focus();
      } catch (error) {
        const message =
          error instanceof DOMException && error.name === "AbortError"
            ? leadStatusMessages.timeout
            : leadStatusMessages.network;

        setLeadFormStatus(statusElement, message);
      } finally {
        window.clearTimeout(timeoutId);
        restoreLeadButtonContent(button);
        setLeadFormBusyState(form, button, false);
      }
    });
  });

  handleLeadFallbackStatus(forms);
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
root.classList.add("reveal-ready");

initRevealAnimations(motionState);
initServiceCarousel(motionState);
initPointerDepth(motionState);
initPremiumButtons(motionState);
initLeadForms();
initMobileMotion();

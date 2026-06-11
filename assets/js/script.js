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

const serviceImage = document.querySelector(".service-image");
const serviceTabs = [...document.querySelectorAll(".service-tab")];
const serviceDots = [...document.querySelectorAll(".carousel-dots button")];
const previousButton = document.querySelector(".carousel-arrow--prev");
const nextButton = document.querySelector(".carousel-arrow--next");
const serviceStage = document.querySelector(".service-stage");
let activeService = 0;
let changingService = false;

services.forEach(({ image }) => {
  const preload = new Image();
  preload.src = image;
});

function updateService(index) {
  if (changingService || index === activeService) return;

  changingService = true;
  const normalizedIndex = (index + services.length) % services.length;
  const nextService = services[normalizedIndex];

  serviceImage.classList.add("is-leaving");

  window.setTimeout(() => {
    serviceImage.classList.remove("is-leaving");
    serviceImage.classList.add("is-entering");
    serviceImage.src = nextService.image;
    serviceImage.alt = nextService.alt;

    serviceTabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === normalizedIndex;
      tab.classList.toggle("is-active", selected);
      tab.setAttribute("aria-selected", String(selected));
      tab.tabIndex = selected ? 0 : -1;
    });

    serviceDots.forEach((dot, dotIndex) => {
      dot.classList.toggle("is-active", dotIndex === normalizedIndex);
    });

    activeService = normalizedIndex;
    serviceStage.setAttribute("aria-label", nextService.name);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        serviceImage.classList.remove("is-entering");
        changingService = false;
      });
    });
  }, 210);
}

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

let touchStartX = 0;
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

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("is-visible");
      revealObserver.unobserve(entry.target);
    });
  },
  { threshold: 0.12, rootMargin: "0px 0px -40px" },
);

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});

document.querySelectorAll("[data-lead-form]").forEach((form) => {
  const phoneInput = form.querySelector('input[type="tel"]');
  const status = form.querySelector(".form-status");

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

const menuToggle = document.querySelector(".menu-toggle");
const mainNav = document.querySelector(".main-nav");

menuToggle.addEventListener("click", () => {
  const open = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!open));
  mainNav.classList.toggle("is-open", !open);
});

mainNav.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    menuToggle.setAttribute("aria-expanded", "false");
    mainNav.classList.remove("is-open");
  });
});

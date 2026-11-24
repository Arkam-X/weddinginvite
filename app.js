(() => {
  "use strict";

  const CONFIG = window.INVITATION_CONFIG || {};
  const $ = (selector, root = document) => root.querySelector(selector);
  const gate = $("#gate");
  const openButton = $("#openInvitation");
  const experience = $("#invitationExperience");
  const track = $("#scrollTrack");
  const card = $("#invitationCard");
  const petalLayer = $("#petalLayer");
  const gardenBackground = $("#gardenBackground");
  const prompt = $("#scrollPrompt");
  const audio = $("#ambience");
  const soundToggle = $("#soundToggle");
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  if (!gate || !openButton || !experience || !track || !card) return;

  let opened = false;
  let countdownTimer = null;
  let nativeScrollHandler = null;
  let lenis = null;

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));
  const setText = (selector, value) => {
    const node = $(selector);
    if (node && value !== undefined && value !== null) node.textContent = String(value);
  };

  function applyConfiguration() {
    setText("#gateGroom", CONFIG.groom || "Asif Khan");
    setText("#gateBride", CONFIG.bride || "Shifa Chaudhary");
    setText("#cardGroom", CONFIG.groom || "Asif Khan");
    setText("#cardBride", CONFIG.bride || "Shifa Chaudhary");
    setText("#gateDate", (CONFIG.dateLabel || "Thursday · 10 December 2026").replace(" · ", " | "));
    setText("#eventDateLabel", CONFIG.dateLabel || "Thursday · 10 December 2026");
    setText("#eventTimeLabel", CONFIG.timeLabel || "After Maghrib");
    setText("#venueName", CONFIG.venueName || "Gazeebo Hall");
    setText("#venueAddress", CONFIG.venueAddress || "Goawala Compound, Opposite Sahara Hotel, Kurla, Mumbai");

    const locationLink = $("#locationLink");
    if (locationLink && CONFIG.mapUrl) locationLink.href = CONFIG.mapUrl;

    if (CONFIG.audioSrc && String(CONFIG.audioSrc).trim()) {
      audio.src = String(CONFIG.audioSrc).trim();
      soundToggle.hidden = false;
      soundToggle.setAttribute("aria-label", "Turn invitation music on");
    } else {
      soundToggle.hidden = true;
    }
  }

  function updateCountdown() {
    const target = new Date(CONFIG.weddingDayStart || "2026-12-10T00:00:00+05:30").getTime();
    if (!Number.isFinite(target)) return;

    const remaining = Math.max(0, target - Date.now());
    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    setText("#countDays", String(days).padStart(2, "0"));
    setText("#countHours", String(hours).padStart(2, "0"));
    setText("#countMinutes", String(minutes).padStart(2, "0"));
    setText("#countSeconds", String(seconds).padStart(2, "0"));
    if (Date.now() >= target) setText("#countdownLabel", "The wedding day is here");
  }

  function randomBetween(min, max) {
    return min + Math.random() * (max - min);
  }

  function createFallingPetals() {
    if (!petalLayer || reducedMotion.matches || petalLayer.childElementCount) return;
    const petals = [
      "assets/petals/rose-burgundy.webp",
      "assets/petals/rose-dusty.webp",
      "assets/petals/bougainvillea.webp",
      "assets/petals/ivory-petal.webp"
    ];

    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 12; index += 1) {
      const petal = document.createElement("img");
      const size = randomBetween(17, 29);
      const duration = randomBetween(15, 25);
      petal.className = "falling-petal";
      petal.src = petals[index % petals.length];
      petal.alt = "";
      petal.draggable = false;
      petal.decoding = "async";
      petal.style.setProperty("--left", `${randomBetween(0, 100)}vw`);
      petal.style.setProperty("--size", `${size}px`);
      petal.style.setProperty("--duration", `${duration}s`);
      petal.style.setProperty("--delay", `${-randomBetween(0, duration)}s`);
      petal.style.setProperty("--drift", `${randomBetween(-95, 95)}px`);
      petal.style.setProperty("--spin", `${randomBetween(240, 620)}deg`);
      petal.style.setProperty("--petal-opacity", randomBetween(.44, .68).toFixed(2));
      fragment.appendChild(petal);
    }
    petalLayer.appendChild(fragment);
  }

  function startMusicFromGesture() {
    if (!audio || !CONFIG.audioSrc || !String(CONFIG.audioSrc).trim()) return;
    audio.volume = 0;
    audio.muted = false;
    const playback = audio.play();
    if (!playback || typeof playback.then !== "function") return;
    playback.then(() => {
      soundToggle.textContent = "Mute";
      soundToggle.setAttribute("aria-pressed", "true");
      const startedAt = performance.now();
      const fade = now => {
        if (audio.paused || audio.muted) return;
        const progress = clamp((now - startedAt) / 3000);
        audio.volume = .2 * progress;
        if (progress < 1) requestAnimationFrame(fade);
      };
      requestAnimationFrame(fade);
    }).catch(() => {
      soundToggle.textContent = "Sound off";
      soundToggle.setAttribute("aria-pressed", "false");
    });
  }

  function bindSoundToggle() {
    soundToggle.addEventListener("click", () => {
      if (!CONFIG.audioSrc || !String(CONFIG.audioSrc).trim()) return;
      if (audio.paused) {
        audio.muted = false;
        audio.play().then(() => {
          soundToggle.textContent = "Mute";
          soundToggle.setAttribute("aria-pressed", "true");
        }).catch(() => {
          soundToggle.textContent = "Sound off";
          soundToggle.setAttribute("aria-pressed", "false");
        });
        return;
      }
      audio.muted = !audio.muted;
      soundToggle.textContent = audio.muted ? "Sound on" : "Mute";
      soundToggle.setAttribute("aria-pressed", String(!audio.muted));
    });
  }

  function setCardProgress(progress) {
    const p = clamp(progress);
    // A gentle ease-out: the invitation rises into place, then stays still.
    const eased = 1 - Math.pow(1 - p, 3);
    const y = (1 - eased) * 78;
    const scale = .975 + eased * .025;
    card.style.opacity = String(eased);
    card.style.transform = `translate3d(0, ${y}px, 0) scale(${scale})`;
    card.style.pointerEvents = eased > .96 ? "auto" : "none";
    if (prompt) prompt.style.opacity = String(1 - clamp(p * 2.6));
  }

  function initScrollReveal() {
    if (reducedMotion.matches) {
      track.style.height = "100svh";
      setCardProgress(1);
      if (prompt) prompt.hidden = true;
      return;
    }

    if (window.gsap && window.ScrollTrigger) {
      const gsap = window.gsap;
      const ScrollTrigger = window.ScrollTrigger;
      gsap.registerPlugin(ScrollTrigger);

      if (window.Lenis) {
        lenis = new window.Lenis({
          duration: 1.18,
          easing: t => 1 - Math.pow(2, -10 * t),
          smoothWheel: true,
          syncTouch: false,
          touchMultiplier: 1
        });
        lenis.on("scroll", ScrollTrigger.update);
        gsap.ticker.add(time => lenis.raf(time * 1000));
        gsap.ticker.lagSmoothing(0);
      }

      gsap.fromTo(card,
        { y: 78, autoAlpha: 0, scale: .975 },
        {
          y: 0,
          autoAlpha: 1,
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: track,
            start: "top top",
            end: () => `+=${Math.round(window.innerHeight * .72)}`,
            scrub: 1.2,
            invalidateOnRefresh: true,
            onUpdate: self => {
              if (prompt) prompt.style.opacity = String(1 - clamp(self.progress * 2.6));
              card.style.pointerEvents = self.progress > .96 ? "auto" : "none";
            }
          }
        }
      );
      ScrollTrigger.refresh();
      return;
    }

    const update = () => {
      const revealDistance = Math.max(1, window.innerHeight * .72);
      setCardProgress(window.scrollY / revealDistance);
    };
    nativeScrollHandler = update;
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  }

  function applyGardenMotionPreference() {
    if (!gardenBackground) return;
    const staticSource = gardenBackground.dataset.staticSrc || "assets/images/garden-hero.webp";
    const breezeSource = gardenBackground.dataset.breezeSrc || "assets/images/garden-hero-breeze.webp";
    const selectedSource = reducedMotion.matches ? staticSource : breezeSource;
    if (gardenBackground.getAttribute("src") !== selectedSource) {
      gardenBackground.setAttribute("src", selectedSource);
    }
  }

  function openInvitation() {
    if (opened) return;
    opened = true;
    startMusicFromGesture();
    applyGardenMotionPreference();
    experience.hidden = false;
    document.body.classList.remove("is-locked");
    gate.classList.add("is-opening");
    createFallingPetals();

    window.setTimeout(() => {
      gate.hidden = true;
      initScrollReveal();
    }, reducedMotion.matches ? 40 : 1500);
  }

  applyConfiguration();
  updateCountdown();
  if (typeof reducedMotion.addEventListener === "function") {
    reducedMotion.addEventListener("change", () => {
      if (opened) applyGardenMotionPreference();
    });
  }
  countdownTimer = window.setInterval(updateCountdown, 1000);
  bindSoundToggle();
  openButton.addEventListener("click", openInvitation, { once: true });

  window.addEventListener("pagehide", () => {
    if (countdownTimer) window.clearInterval(countdownTimer);
    if (nativeScrollHandler) {
      window.removeEventListener("scroll", nativeScrollHandler);
      window.removeEventListener("resize", nativeScrollHandler);
    }
    if (lenis) lenis.destroy();
  });
})();

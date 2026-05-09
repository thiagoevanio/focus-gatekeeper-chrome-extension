const TICK_INTERVAL_MS = 1000;
const OVERLAY_ID = "focus-gatekeeper-overlay";
const WARNING_ID = "focus-gatekeeper-warning";
const I18N = {
  en: {
    brand: "Focus Gatekeeper",
    title: "Time to reset",
    message: "Your focus limit is up. Take a short pause and come back with intention.",
    siteFallback: "this site",
    footnote: "This page unlocks automatically when the pause ends.",
    warningTitle: "Almost time to pause",
    warningMessage: "{time} left on {site}"
  },
  "pt-BR": {
    brand: "Guardião do Foco",
    title: "Hora de reiniciar",
    message: "Seu limite de foco acabou. Faça uma pausa curta e volte com intenção.",
    siteFallback: "este site",
    footnote: "Esta página será liberada automaticamente quando a pausa terminar.",
    warningTitle: "Quase na hora de pausar",
    warningMessage: "Faltam {time} em {site}"
  }
};

let lastTickAt = Date.now();
let countdownTimer = null;

void requestStatus();
setInterval(sendUsageTick, TICK_INTERVAL_MS);

document.addEventListener("visibilitychange", () => {
  lastTickAt = Date.now();
  if (document.visibilityState === "visible") {
    void requestStatus();
  }
});

window.addEventListener("focus", () => {
  lastTickAt = Date.now();
  void requestStatus();
});

async function sendUsageTick() {
  if (document.visibilityState !== "visible") {
    lastTickAt = Date.now();
    return;
  }

  const now = Date.now();
  const deltaMs = now - lastTickAt;
  lastTickAt = now;

  const status = await sendMessage({
    type: "FGK_TICK",
    url: window.location.href,
    deltaMs
  });

  applyStatus(status);
}

async function requestStatus() {
  const status = await sendMessage({
    type: "FGK_STATUS",
    url: window.location.href
  });

  applyStatus(status);
}

function applyStatus(status) {
  if (!status?.ok) {
    return;
  }

  if (status.shouldBlock) {
    removeWarning();
    showOverlay(status);
    return;
  }

  updateWarning(status);
  removeOverlay();
}

function showOverlay(status) {
  const existing = document.getElementById(OVERLAY_ID);
  const overlay = existing || document.createElement("div");

  overlay.id = OVERLAY_ID;
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.dataset.theme = getTheme(status.settings);
  overlay.innerHTML = buildOverlayMarkup(status);

  if (!existing) {
    document.documentElement.appendChild(overlay);
  }

  document.documentElement.classList.add("focus-gatekeeper-locked");
  startCountdown(status.breakEndsAt, status.breakStartedAt);
}

function updateWarning(status) {
  const warningSeconds = Number(status.settings?.warningSeconds || 60);
  const shouldWarn = Boolean(
    status.settings?.warningEnabled !== false &&
    status.matchedSite &&
    status.remainingMs > 0 &&
    status.remainingMs <= warningSeconds * 1000
  );

  if (!shouldWarn) {
    removeWarning();
    return;
  }

  const warning = document.getElementById(WARNING_ID) || document.createElement("div");
  const language = getLanguage(status.settings);
  const copy = I18N[language];
  const siteName = status.matchedSite?.label || status.matchedSite?.domain || copy.siteFallback;
  const message = copy.warningMessage
    .replace("{time}", formatHumanDuration(status.remainingMs, language))
    .replace("{site}", siteName);

  warning.id = WARNING_ID;
  warning.dataset.theme = getTheme(status.settings);
  warning.setAttribute("role", "status");
  warning.innerHTML = `
    <strong>${escapeHtml(copy.warningTitle)}</strong>
    <span>${escapeHtml(message)}</span>
  `;

  if (!warning.parentNode) {
    document.documentElement.appendChild(warning);
  }
}

function removeWarning() {
  const warning = document.getElementById(WARNING_ID);

  if (warning) {
    warning.remove();
  }
}

function buildOverlayMarkup(status) {
  const language = getLanguage(status.settings);
  const copy = I18N[language];
  const title = escapeHtml(getLocalizedOverlayValue(status.settings?.overlayTitle, "title", language));
  const message = escapeHtml(getLocalizedOverlayValue(status.settings?.overlayMessage, "message", language));
  const siteName = escapeHtml(status.matchedSite?.label || status.matchedSite?.domain || copy.siteFallback);
  const siteDomain = escapeHtml(status.matchedSite?.domain || "");
  const progress = getBreakProgress(status);

  return `
    <div class="fgk-backdrop" aria-hidden="true"></div>
    <section class="fgk-panel">
      <div class="fgk-mark" aria-hidden="true">
        <div class="fgk-shield">
          <span class="fgk-orbit"></span>
          <span class="fgk-pulse"></span>
          <span class="fgk-dot"></span>
        </div>
      </div>
      <p class="fgk-kicker">${escapeHtml(copy.brand)}</p>
      <h1>${title}</h1>
      <p class="fgk-message">${message}</p>
      <div class="fgk-site">
        <strong>${siteName}</strong>
        <span>${siteDomain}</span>
      </div>
      <div class="fgk-countdown-wrap" style="--fgk-progress: ${progress}%">
        <div class="fgk-countdown" aria-live="polite">--:--</div>
      </div>
      <p class="fgk-footnote">${escapeHtml(copy.footnote)}</p>
    </section>
  `;
}

function startCountdown(breakEndsAt, breakStartedAt) {
  if (countdownTimer) {
    clearInterval(countdownTimer);
  }

  const update = () => {
    const overlay = document.getElementById(OVERLAY_ID);
    const countdown = overlay?.querySelector(".fgk-countdown");
    const countdownWrap = overlay?.querySelector(".fgk-countdown-wrap");
    const remainingMs = Number(breakEndsAt || 0) - Date.now();

    if (!countdown) {
      return;
    }

    if (remainingMs <= 0) {
      countdown.textContent = "00:00";
      removeOverlay();
      void requestStatus();
      return;
    }

    countdown.textContent = formatDuration(remainingMs);

    if (countdownWrap && breakStartedAt && breakEndsAt) {
      const totalMs = Math.max(1, breakEndsAt - breakStartedAt);
      const elapsedMs = Math.min(totalMs, Date.now() - breakStartedAt);
      const progress = Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
      countdownWrap.style.setProperty("--fgk-progress", `${progress}%`);
    }
  };

  update();
  countdownTimer = setInterval(update, 1000);
}

function removeOverlay() {
  const overlay = document.getElementById(OVERLAY_ID);

  if (overlay) {
    overlay.remove();
  }

  document.documentElement.classList.remove("focus-gatekeeper-locked");

  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

function sendMessage(payload) {
  return new Promise((resolve) => {
    if (!chrome?.runtime?.id) {
      resolve(null);
      return;
    }

    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        resolve(null);
        return;
      }

      resolve(response);
    });
  });
}

function getBreakProgress(status) {
  if (!status.breakStartedAt || !status.breakEndsAt) {
    return 0;
  }

  const totalMs = Math.max(1, status.breakEndsAt - status.breakStartedAt);
  const elapsedMs = Math.min(totalMs, Date.now() - status.breakStartedAt);

  return Math.max(0, Math.min(100, Math.round((elapsedMs / totalMs) * 100)));
}

function formatDuration(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatHumanDuration(ms, language) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes > 0 && seconds > 0) {
    return language === "pt-BR" ? `${minutes}min ${seconds}s` : `${minutes}m ${seconds}s`;
  }

  if (minutes > 0) {
    return language === "pt-BR" ? `${minutes}min` : `${minutes}m`;
  }

  return `${seconds}s`;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function getLanguage(settings) {
  return settings?.language === "pt-BR" ? "pt-BR" : "en";
}

function getTheme(settings) {
  return settings?.theme === "dark" ? "dark" : "light";
}

function getLocalizedOverlayValue(value, key, language) {
  const raw = String(value || "").trim();
  const knownDefaults = [
    ...Object.values(I18N).map((copy) => copy[key]),
    "Time for a break",
    "Hora de pausar",
    "Your focus limit is up. Take a short pause, breathe, and come back with a cleaner head.",
    "Seu limite de foco acabou. Faça uma pausa curta, respire e volte com a cabeça mais limpa."
  ];

  if (!raw || knownDefaults.includes(raw)) {
    return I18N[language][key];
  }

  return raw;
}

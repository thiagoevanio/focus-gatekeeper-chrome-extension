const enabledInput = document.querySelector("#enabled");
const defaultFocusInput = document.querySelector("#defaultFocusLimitMinutes");
const defaultBreakInput = document.querySelector("#defaultBreakMinutes");
const usageTotal = document.querySelector("#usageTotal");
const weekUsage = document.querySelector("#weekUsage");
const timeSaved = document.querySelector("#timeSaved");
const activeBreak = document.querySelector("#activeBreak");
const currentSite = document.querySelector("#currentSite");
const trackCurrentSiteButton = document.querySelector("#trackCurrentSite");
const siteList = document.querySelector("#siteList");
const statusMessage = document.querySelector("#statusMessage");
const form = document.querySelector("#settingsForm");
const openOptionsButton = document.querySelector("#openOptions");
const I18N = {
  en: {
    today: "Today",
    trackingToggleTitle: "Enable or disable tracking",
    currentSite: "Current site",
    trackThisSite: "Track this site",
    trackedUsage: "Tracked usage",
    weekUsage: "Week usage",
    timeSaved: "Time saved",
    activeBreak: "Active break",
    defaultFocus: "Default focus",
    defaultBreak: "Default break",
    saveDefaults: "Save defaults",
    trackedSites: "Tracked sites",
    manage: "Manage",
    loading: "Loading...",
    none: "None",
    noWebsite: "No website tab detected",
    noTrackedSites: "No tracked sites yet.",
    defaultsSaved: "Defaults saved.",
    trackingEnabled: "Tracking enabled.",
    trackingPaused: "Tracking paused.",
    openWebsiteFirst: "Open a normal website tab first.",
    siteAdded: "Site added.",
    couldNotAddSite: "Could not add site."
  },
  "pt-BR": {
    today: "Hoje",
    trackingToggleTitle: "Ativar ou desativar monitoramento",
    currentSite: "Site atual",
    trackThisSite: "Monitorar este site",
    trackedUsage: "Uso monitorado",
    weekUsage: "Uso semanal",
    timeSaved: "Tempo poupado",
    activeBreak: "Pausa ativa",
    defaultFocus: "Foco padrão",
    defaultBreak: "Pausa padrão",
    saveDefaults: "Salvar padrões",
    trackedSites: "Sites monitorados",
    manage: "Gerenciar",
    loading: "Carregando...",
    none: "Nenhuma",
    noWebsite: "Nenhuma aba de site detectada",
    noTrackedSites: "Nenhum site monitorado ainda.",
    defaultsSaved: "Padrões salvos.",
    trackingEnabled: "Monitoramento ativado.",
    trackingPaused: "Monitoramento pausado.",
    openWebsiteFirst: "Abra uma aba de site normal primeiro.",
    siteAdded: "Site adicionado.",
    couldNotAddSite: "Não foi possível adicionar o site."
  }
};

let dashboard = null;
let currentDomain = "";
let refreshTimer = null;

void init();

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  const response = await sendMessage({
    type: "FGK_SAVE_SETTINGS",
    settings: {
      enabled: enabledInput.checked,
      defaultFocusLimitMinutes: Number(defaultFocusInput.value),
      defaultBreakMinutes: Number(defaultBreakInput.value)
    }
  });

  renderDashboard(response);
  showStatus(t("defaultsSaved"));
});

enabledInput.addEventListener("change", async () => {
  const response = await sendMessage({
    type: "FGK_SAVE_SETTINGS",
    settings: {
      enabled: enabledInput.checked
    }
  });

  renderDashboard(response);
  showStatus(enabledInput.checked ? t("trackingEnabled") : t("trackingPaused"));
});

trackCurrentSiteButton.addEventListener("click", async () => {
  if (!currentDomain) {
    showStatus(t("openWebsiteFirst"));
    return;
  }

  const response = await sendMessage({
    type: "FGK_ADD_SITE",
    site: {
      domain: currentDomain,
      label: titleFromDomain(currentDomain),
      limitMinutes: Number(defaultFocusInput.value) || 25,
      breakMinutes: Number(defaultBreakInput.value) || 5
    }
  });

  renderDashboard(response);
  showStatus(response?.ok ? t("siteAdded") : response?.error || t("couldNotAddSite"));
});

openOptionsButton.addEventListener("click", () => {
  chrome.runtime.openOptionsPage();
});

async function init() {
  currentDomain = await getCurrentDomain();
  trackCurrentSiteButton.disabled = !currentDomain;
  await loadDashboard();
  currentSite.textContent = currentDomain || t("noWebsite");
  refreshTimer = setInterval(loadDashboard, 1000);
}

window.addEventListener("unload", () => {
  if (refreshTimer) {
    clearInterval(refreshTimer);
  }
});

async function loadDashboard() {
  const response = await sendMessage({ type: "FGK_GET_DASHBOARD" });
  renderDashboard(response);
}

function renderDashboard(response) {
  if (!response?.ok) {
    showStatus(response?.error || "Could not load extension state.");
    return;
  }

  dashboard = response;
  const { settings, siteSummaries, statsSummary, now } = response;

  applyI18n();
  enabledInput.checked = Boolean(settings.enabled);
  defaultFocusInput.value = settings.defaultFocusLimitMinutes;
  defaultBreakInput.value = settings.defaultBreakMinutes;

  const totalMs = siteSummaries.reduce((sum, site) => sum + Number(site.usageMs || 0), 0);
  usageTotal.textContent = formatDuration(totalMs);
  weekUsage.textContent = formatDuration(statsSummary?.weekFocusMs || 0);
  timeSaved.textContent = formatDuration(statsSummary?.totalSavedMs || 0);

  const active = siteSummaries.find((site) => site.breakEndsAt && site.breakEndsAt > now);
  activeBreak.textContent = active ? `${active.label} ${formatCountdown(active.breakEndsAt - now)}` : t("none");
  currentSite.textContent = currentDomain || t("noWebsite");

  renderSiteList(siteSummaries);
}

function renderSiteList(summaries) {
  const visibleSites = [...summaries]
    .sort((a, b) => {
      if (a.breakEndsAt && !b.breakEndsAt) return -1;
      if (!a.breakEndsAt && b.breakEndsAt) return 1;
      return (b.usageMs || 0) - (a.usageMs || 0);
    })
    .slice(0, 5);

  if (!visibleSites.length) {
    siteList.innerHTML = `<div class="empty-state">${escapeHtml(t("noTrackedSites"))}</div>`;
    return;
  }

  siteList.innerHTML = visibleSites.map((site) => `
    <article class="site-card">
      <div class="site-card-header">
        <strong>${escapeHtml(site.label)}</strong>
      </div>
      <small>${escapeHtml(site.domain)}</small>
      <div class="progress" aria-hidden="true">
        <span class="progress-fill" style="--progress: ${site.usagePercent}%"></span>
        <b class="progress-label">${formatClockDuration(site.usageMs)} / ${formatClockDuration(site.limitMs)}</b>
      </div>
    </article>
  `).join("");
}

function sendMessage(payload) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(payload, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }

      resolve(response);
    });
  });
}

async function getCurrentDomain() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tabs[0]?.url || "";

  try {
    const parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return "";
    }

    return parsed.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function showStatus(message) {
  statusMessage.textContent = message;
  setTimeout(() => {
    if (statusMessage.textContent === message) {
      statusMessage.textContent = "";
    }
  }, 2200);
}

function applyI18n() {
  document.documentElement.lang = getLanguage() === "pt-BR" ? "pt-BR" : "en";
  document.documentElement.dataset.theme = getTheme();
  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-title]").forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });
  enabledInput.setAttribute("aria-label", t("trackingToggleTitle"));
}

function getLanguage() {
  return dashboard?.settings?.language === "pt-BR" ? "pt-BR" : "en";
}

function getTheme() {
  return dashboard?.settings?.theme === "dark" ? "dark" : "light";
}

function t(key) {
  const language = getLanguage();
  return I18N[language][key] || I18N.en[key] || key;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}${getLanguage() === "pt-BR" ? "min" : "m"}`;
  }

  if (totalMinutes > 0) {
    return `${minutes}${getLanguage() === "pt-BR" ? "min" : "m"} ${seconds}s`;
  }

  return `${seconds}s`;
}

function formatClockDuration(ms) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  if (minutes >= 60) {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    return `${hours}:${String(remainingMinutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function formatCountdown(ms) {
  const totalSeconds = Math.ceil(Math.max(0, ms) / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function titleFromDomain(domain) {
  const root = String(domain || "Site").split(".")[0] || "Site";
  return root
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

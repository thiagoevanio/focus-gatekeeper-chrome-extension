const enabledInput = document.querySelector("#enabled");
const languageInput = document.querySelector("#language");
const themeInput = document.querySelector("#theme");
const warningEnabledInput = document.querySelector("#warningEnabled");
const warningSecondsInput = document.querySelector("#warningSeconds");
const defaultFocusInput = document.querySelector("#defaultFocusLimitMinutes");
const defaultBreakInput = document.querySelector("#defaultBreakMinutes");
const shortBreakInput = document.querySelector("#shortBreakMinutes");
const longBreakInput = document.querySelector("#longBreakMinutes");
const overlayTitleInput = document.querySelector("#overlayTitle");
const overlayMessageInput = document.querySelector("#overlayMessage");
const sitesList = document.querySelector("#sitesList");
const historyList = document.querySelector("#historyList");
const statusMessage = document.querySelector("#statusMessage");
const settingsForm = document.querySelector("#settingsForm");
const addSiteForm = document.querySelector("#addSiteForm");
const resetButton = document.querySelector("#resetUsage");
const exportButton = document.querySelector("#exportData");
const importFileInput = document.querySelector("#importFile");
const newDomainInput = document.querySelector("#newDomain");
const newLabelInput = document.querySelector("#newLabel");
const newLimitInput = document.querySelector("#newLimitMinutes");
const newBreakInput = document.querySelector("#newBreakMinutes");
const newPauseModeInput = document.querySelector("#newPauseMode");
const todayFocus = document.querySelector("#todayFocus");
const weekFocus = document.querySelector("#weekFocus");
const totalSaved = document.querySelector("#totalSaved");
const breaksStarted = document.querySelector("#breaksStarted");
const weeklyChart = document.querySelector("#weeklyChart");

const I18N = {
  en: {
    extensionSettings: "Extension settings",
    tracking: "Tracking",
    language: "Language",
    theme: "Theme",
    themeLight: "Light",
    themeDark: "Dark",
    enableTracking: "Enable tracking",
    warningEnabled: "Pre-block warning",
    warningSeconds: "Warn seconds before",
    defaultFocusLimit: "Default focus limit",
    defaultForcedBreak: "Default forced break",
    shortBreak: "Short break",
    longBreak: "Long break",
    overlayCopy: "Overlay copy",
    title: "Title",
    message: "Message",
    trackedSites: "Tracked sites",
    trackedSitesHelp: "Each site can have its own focus limit, pause mode, and work-hours schedule.",
    saveAllChanges: "Save all changes",
    resetUsage: "Reset usage",
    export: "Export",
    import: "Import",
    addSite: "Add a site",
    domain: "Domain",
    label: "Label",
    focus: "Focus",
    break: "Break",
    pauseMode: "Pause mode",
    addSiteButton: "Add site",
    recentActivity: "Recent activity",
    remove: "Remove",
    noTrackedSites: "No tracked sites yet. Add your first one below.",
    noBreakActivity: "No break activity yet.",
    settingsSaved: "Settings saved.",
    siteAdded: "Site added.",
    couldNotAddSite: "Could not add site.",
    siteRemoved: "Site removed.",
    couldNotRemoveSite: "Could not remove site.",
    usageReset: "Usage reset.",
    exportReady: "Export ready.",
    couldNotExport: "Could not export settings.",
    settingsImported: "Settings imported.",
    importFailed: "Import failed.",
    breakStarted: "break started",
    breakCompleted: "break completed",
    site: "Site",
    overlayTitle: "Time to reset",
    overlayMessage: "Your focus limit is up. Take a short pause and come back with intention.",
    modeTimer: "Site timer",
    modeShort: "Short break",
    modeLong: "Long break",
    modeTomorrow: "Until tomorrow",
    todayFocus: "Today focus",
    weekFocus: "Week focus",
    totalSaved: "Total saved",
    breaksStarted: "Breaks started",
    lastSevenDays: "Last 7 days",
    workHours: "Work hours",
    schedule: "Schedule",
    active: "Active",
    inactive: "Inactive"
  },
  "pt-BR": {
    extensionSettings: "Configuracoes da extensao",
    tracking: "Monitoramento",
    language: "Idioma",
    theme: "Tema",
    themeLight: "Claro",
    themeDark: "Escuro",
    enableTracking: "Ativar monitoramento",
    warningEnabled: "Aviso antes do bloqueio",
    warningSeconds: "Avisar segundos antes",
    defaultFocusLimit: "Limite de foco padrao",
    defaultForcedBreak: "Pausa forcada padrao",
    shortBreak: "Pausa curta",
    longBreak: "Pausa longa",
    overlayCopy: "Texto da tela de bloqueio",
    title: "Titulo",
    message: "Mensagem",
    trackedSites: "Sites monitorados",
    trackedSitesHelp: "Cada site pode ter seu proprio limite de foco, modo de pausa e horario de trabalho.",
    saveAllChanges: "Salvar alteracoes",
    resetUsage: "Zerar uso",
    export: "Exportar",
    import: "Importar",
    addSite: "Adicionar site",
    domain: "Dominio",
    label: "Rotulo",
    focus: "Foco",
    break: "Pausa",
    pauseMode: "Modo de pausa",
    addSiteButton: "Adicionar site",
    recentActivity: "Atividade recente",
    remove: "Remover",
    noTrackedSites: "Nenhum site monitorado ainda. Adicione o primeiro abaixo.",
    noBreakActivity: "Nenhuma atividade de pausa ainda.",
    settingsSaved: "Configuracoes salvas.",
    siteAdded: "Site adicionado.",
    couldNotAddSite: "Nao foi possivel adicionar o site.",
    siteRemoved: "Site removido.",
    couldNotRemoveSite: "Nao foi possivel remover o site.",
    usageReset: "Uso zerado.",
    exportReady: "Exportacao pronta.",
    couldNotExport: "Nao foi possivel exportar as configuracoes.",
    settingsImported: "Configuracoes importadas.",
    importFailed: "Falha ao importar.",
    breakStarted: "pausa iniciada",
    breakCompleted: "pausa concluida",
    site: "Site",
    overlayTitle: "Hora de reiniciar",
    overlayMessage: "Seu limite de foco acabou. Faca uma pausa curta e volte com intencao.",
    modeTimer: "Timer do site",
    modeShort: "Pausa curta",
    modeLong: "Pausa longa",
    modeTomorrow: "Ate amanha",
    todayFocus: "Foco hoje",
    weekFocus: "Foco semanal",
    totalSaved: "Total poupado",
    breaksStarted: "Pausas iniciadas",
    lastSevenDays: "Ultimos 7 dias",
    workHours: "Horario de trabalho",
    schedule: "Horario",
    active: "Ativo",
    inactive: "Inativo"
  }
};

let dashboard = null;

void loadDashboard();

settingsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const response = await sendMessage({
    type: "FGK_SAVE_SETTINGS",
    settings: readSettingsForm()
  });

  renderDashboard(response);
  showStatus(t("settingsSaved"));
});

languageInput.addEventListener("change", () => {
  const nextLanguage = languageInput.value === "pt-BR" ? "pt-BR" : "en";

  if (dashboard?.settings) {
    dashboard.settings.language = nextLanguage;
  }

  overlayTitleInput.value = getLocalizedOverlayValue(overlayTitleInput.value, "overlayTitle", nextLanguage);
  overlayMessageInput.value = getLocalizedOverlayValue(overlayMessageInput.value, "overlayMessage", nextLanguage);
  applyI18n();
  renderStats(dashboard?.statsSummary);
  renderSites(dashboard?.siteSummaries || []);
  renderHistory(dashboard?.state?.history || []);
});

themeInput.addEventListener("change", () => {
  if (dashboard?.settings) {
    dashboard.settings.theme = themeInput.value === "dark" ? "dark" : "light";
  }

  applyI18n();
});

addSiteForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const response = await sendMessage({
    type: "FGK_ADD_SITE",
    site: {
      domain: newDomainInput.value,
      label: newLabelInput.value,
      limitMinutes: Number(newLimitInput.value),
      breakMinutes: Number(newBreakInput.value),
      pauseMode: newPauseModeInput.value
    }
  });

  renderDashboard(response);
  showStatus(response?.ok ? t("siteAdded") : response?.error || t("couldNotAddSite"));

  if (response?.ok) {
    addSiteForm.reset();
    newLimitInput.value = dashboard?.settings?.defaultFocusLimitMinutes || 25;
    newBreakInput.value = dashboard?.settings?.defaultBreakMinutes || 5;
    newPauseModeInput.value = "timer";
  }
});

sitesList.addEventListener("click", async (event) => {
  const removeButton = event.target.closest("[data-remove-site]");
  if (!removeButton) {
    return;
  }

  const response = await sendMessage({
    type: "FGK_REMOVE_SITE",
    siteId: removeButton.dataset.removeSite
  });

  renderDashboard(response);
  showStatus(response?.ok ? t("siteRemoved") : response?.error || t("couldNotRemoveSite"));
});

resetButton.addEventListener("click", async () => {
  const response = await sendMessage({ type: "FGK_RESET_USAGE" });
  renderDashboard(response);
  showStatus(t("usageReset"));
});

exportButton.addEventListener("click", async () => {
  const response = await sendMessage({ type: "FGK_EXPORT_DATA" });

  if (!response?.ok) {
    showStatus(response?.error || t("couldNotExport"));
    return;
  }

  const blob = new Blob([JSON.stringify(response, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "focus-gatekeeper-export.json";
  link.click();
  URL.revokeObjectURL(url);
  showStatus(t("exportReady"));
});

importFileInput.addEventListener("change", async () => {
  const file = importFileInput.files?.[0];
  if (!file) {
    return;
  }

  const payload = await file.text();
  const response = await sendMessage({
    type: "FGK_IMPORT_DATA",
    payload
  });

  renderDashboard(response);
  showStatus(response?.ok ? t("settingsImported") : response?.error || t("importFailed"));
  importFileInput.value = "";
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
  const { settings, siteSummaries, state, statsSummary } = response;

  languageInput.value = settings.language || "en";
  themeInput.value = settings.theme || "light";
  applyI18n();
  enabledInput.checked = Boolean(settings.enabled);
  warningEnabledInput.checked = settings.warningEnabled !== false;
  warningSecondsInput.value = settings.warningSeconds || 60;
  defaultFocusInput.value = settings.defaultFocusLimitMinutes;
  defaultBreakInput.value = settings.defaultBreakMinutes;
  shortBreakInput.value = settings.shortBreakMinutes;
  longBreakInput.value = settings.longBreakMinutes;
  overlayTitleInput.value = getLocalizedOverlayValue(settings.overlayTitle, "overlayTitle");
  overlayMessageInput.value = getLocalizedOverlayValue(settings.overlayMessage, "overlayMessage");
  newLimitInput.value ||= settings.defaultFocusLimitMinutes;
  newBreakInput.value ||= settings.defaultBreakMinutes;

  renderStats(statsSummary);
  renderSites(siteSummaries);
  renderHistory(state.history || []);
}

function renderStats(summary) {
  const stats = summary || {};

  todayFocus.textContent = formatDuration(stats.todayFocusMs || 0);
  weekFocus.textContent = formatDuration(stats.weekFocusMs || 0);
  totalSaved.textContent = formatDuration(stats.totalSavedMs || 0);
  breaksStarted.textContent = String(stats.breaksStarted || 0);
  renderWeeklyChart(stats.dailySeries || []);
}

function renderWeeklyChart(series) {
  const maxValue = Math.max(1, ...series.map((day) => day.focusMs || 0));

  weeklyChart.innerHTML = series.map((day) => {
    const height = Math.max(6, Math.round(((day.focusMs || 0) / maxValue) * 72));
    const label = formatDayLabel(day.dayKey);

    return `
      <div class="chart-day" title="${escapeAttribute(formatDuration(day.focusMs || 0))}">
        <span class="chart-bar" style="height: ${height}px"></span>
        <small>${escapeHtml(label)}</small>
      </div>
    `;
  }).join("");
}

function renderSites(summaries) {
  if (!summaries.length) {
    sitesList.innerHTML = `<div class="empty-state">${escapeHtml(t("noTrackedSites"))}</div>`;
    return;
  }

  sitesList.innerHTML = summaries.map((site) => `
    <article class="site-row" data-site-id="${escapeHtml(site.id)}">
      <div class="site-main-row">
        <label class="site-enabled-wrap" title="${escapeAttribute(t("enableTracking"))}">
          <input class="site-enabled checkbox-cell" type="checkbox" aria-label="Enable ${escapeAttribute(site.label)}" ${site.enabled ? "checked" : ""}>
        </label>
        <label class="site-label-field">
          <span>${escapeHtml(t("label"))}</span>
          <input class="site-label" type="text" value="${escapeAttribute(site.label)}" maxlength="60">
        </label>
        <label class="site-domain-field">
          <span>${escapeHtml(t("domain"))}</span>
          <input class="site-domain" type="text" value="${escapeAttribute(site.domain)}" spellcheck="false">
        </label>
        <label class="number-field">
          <span>${escapeHtml(t("focus"))}</span>
          <input class="site-limit" type="number" min="1" max="480" step="1" value="${site.limitMinutes}">
        </label>
        <label class="number-field">
          <span>${escapeHtml(t("break"))}</span>
          <input class="site-break" type="number" min="1" max="180" step="1" value="${site.breakMinutes}">
        </label>
        <button class="danger" type="button" data-remove-site="${escapeHtml(site.id)}">${escapeHtml(t("remove"))}</button>
      </div>
      <div class="site-meta-row">
        <label class="pause-mode-field">
          <span>${escapeHtml(t("pauseMode"))}</span>
          <select class="site-pause-mode">
            ${renderPauseModeOptions(site.pauseMode)}
          </select>
        </label>
        <div class="schedule-cell">
          <label class="schedule-toggle">
            <input class="site-schedule-enabled" type="checkbox" ${site.activeHours?.enabled ? "checked" : ""}>
            <span>${escapeHtml(t("workHours"))}</span>
          </label>
          <div class="time-pair">
            <input class="site-schedule-start" type="time" value="${escapeAttribute(site.activeHours?.start || "09:00")}">
            <input class="site-schedule-end" type="time" value="${escapeAttribute(site.activeHours?.end || "17:00")}">
          </div>
        </div>
        <div class="usage-cell">
          <div class="progress" aria-hidden="true">
          <span class="progress-fill" style="--progress: ${site.usagePercent}%"></span>
          <b class="progress-label">${formatClockDuration(site.usageMs)} / ${formatClockDuration(site.limitMs)}</b>
          </div>
        </div>
      </div>
    </article>
  `).join("");
}

function renderPauseModeOptions(selectedMode) {
  const modes = [
    ["timer", t("modeTimer")],
    ["short", t("modeShort")],
    ["long", t("modeLong")],
    ["tomorrow", t("modeTomorrow")]
  ];

  return modes.map(([value, label]) => (
    `<option value="${value}" ${selectedMode === value ? "selected" : ""}>${escapeHtml(label)}</option>`
  )).join("");
}

function renderHistory(history) {
  const visibleHistory = history.slice(0, 10);

  if (!visibleHistory.length) {
    historyList.innerHTML = `<div class="empty-state">${escapeHtml(t("noBreakActivity"))}</div>`;
    return;
  }

  historyList.innerHTML = visibleHistory.map((event) => `
    <div class="history-item">
      <span><strong>${escapeHtml(event.siteLabel || event.siteDomain || t("site"))}</strong> ${formatEventType(event.type)}</span>
      <time>${formatTime(event.happenedAt)}</time>
    </div>
  `).join("");
}

function readSettingsForm() {
  const siteRows = [...sitesList.querySelectorAll(".site-row")];

  return {
    enabled: enabledInput.checked,
    language: languageInput.value === "pt-BR" ? "pt-BR" : "en",
    theme: themeInput.value === "dark" ? "dark" : "light",
    warningEnabled: warningEnabledInput.checked,
    warningSeconds: Number(warningSecondsInput.value),
    defaultFocusLimitMinutes: Number(defaultFocusInput.value),
    defaultBreakMinutes: Number(defaultBreakInput.value),
    shortBreakMinutes: Number(shortBreakInput.value),
    longBreakMinutes: Number(longBreakInput.value),
    overlayTitle: overlayTitleInput.value,
    overlayMessage: overlayMessageInput.value,
    trackedSites: siteRows.map((row) => ({
      id: row.dataset.siteId,
      enabled: row.querySelector(".site-enabled").checked,
      label: row.querySelector(".site-label").value,
      domain: row.querySelector(".site-domain").value,
      limitMinutes: Number(row.querySelector(".site-limit").value),
      breakMinutes: Number(row.querySelector(".site-break").value),
      pauseMode: row.querySelector(".site-pause-mode").value,
      activeHours: {
        enabled: row.querySelector(".site-schedule-enabled").checked,
        start: row.querySelector(".site-schedule-start").value || "09:00",
        end: row.querySelector(".site-schedule-end").value || "17:00",
        days: [1, 2, 3, 4, 5]
      }
    }))
  };
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

function showStatus(message) {
  statusMessage.textContent = message;
  setTimeout(() => {
    if (statusMessage.textContent === message) {
      statusMessage.textContent = "";
    }
  }, 2600);
}

function applyI18n() {
  const language = getLanguage();
  document.documentElement.lang = language;
  document.documentElement.dataset.theme = getTheme();
  document.title = language === "pt-BR" ? "Opcoes do Focus Gatekeeper" : "Focus Gatekeeper Options";

  document.querySelectorAll("[data-i18n]").forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
}

function getLanguage() {
  return languageInput.value === "pt-BR" || dashboard?.settings?.language === "pt-BR" ? "pt-BR" : "en";
}

function getTheme() {
  return themeInput.value === "dark" || dashboard?.settings?.theme === "dark" ? "dark" : "light";
}

function t(key) {
  const language = getLanguage();
  return I18N[language][key] || I18N.en[key] || key;
}

function getLocalizedOverlayValue(value, key, language = getLanguage()) {
  const raw = String(value || "").trim();
  const knownDefaults = [
    ...Object.values(I18N).map((copy) => copy[key]),
    "Time for a break",
    "Hora de pausar",
    "Your focus limit is up. Take a short pause, breathe, and come back with a cleaner head.",
    "Seu limite de foco acabou. Faca uma pausa curta, respire e volte com a cabeca mais limpa.",
    "Seu limite de foco acabou. Faça uma pausa curta, respire e volte com a cabeça mais limpa."
  ];

  if (!raw || knownDefaults.includes(raw)) {
    return I18N[language][key];
  }

  return raw;
}

function formatDuration(ms) {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const totalMinutes = Math.floor(totalSeconds / 60);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const seconds = totalSeconds % 60;
  const minuteSuffix = getLanguage() === "pt-BR" ? "min" : "m";

  if (hours > 0) {
    return `${hours}h ${minutes}${minuteSuffix}`;
  }

  if (totalMinutes > 0) {
    return `${minutes}${minuteSuffix} ${seconds}s`;
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

function formatEventType(type) {
  if (type === "break_started") {
    return t("breakStarted");
  }

  if (type === "break_completed") {
    return t("breakCompleted");
  }

  return String(type || "updated").replaceAll("_", " ");
}

function formatTime(value) {
  const date = new Date(value || Date.now());
  return date.toLocaleString(getLanguage() === "pt-BR" ? "pt-BR" : undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  });
}

function formatDayLabel(dayKey) {
  const date = new Date(`${dayKey}T12:00:00`);
  return date.toLocaleDateString(getLanguage() === "pt-BR" ? "pt-BR" : undefined, {
    weekday: "short"
  }).replace(".", "");
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

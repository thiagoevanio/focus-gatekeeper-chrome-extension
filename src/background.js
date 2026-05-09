const SETTINGS_KEY = "fgk_settings";
const STATE_KEY = "fgk_state";
const SCHEMA_VERSION = 3;

const DEFAULT_SCHEDULE = {
  enabled: false,
  start: "09:00",
  end: "17:00",
  days: [1, 2, 3, 4, 5]
};

const DEFAULT_SETTINGS = {
  schemaVersion: SCHEMA_VERSION,
  enabled: true,
  language: "en",
  theme: "light",
  warningEnabled: true,
  warningSeconds: 60,
  defaultFocusLimitMinutes: 25,
  defaultBreakMinutes: 5,
  shortBreakMinutes: 5,
  longBreakMinutes: 15,
  overlayTitle: "Time to reset",
  overlayMessage: "Your focus limit is up. Take a short pause and come back with intention.",
  trackedSites: [
    createSite("youtube.com", "YouTube", 25, 5),
    createSite("reddit.com", "Reddit", 20, 5),
    createSite("x.com", "X / Twitter", 15, 5),
    createSite("twitter.com", "Twitter", 15, 5),
    createSite("instagram.com", "Instagram", 15, 5),
    createSite("tiktok.com", "TikTok", 15, 5),
    createSite("facebook.com", "Facebook", 20, 5),
    createSite("netflix.com", "Netflix", 30, 10)
  ]
};

const DEFAULT_STATE = {
  schemaVersion: SCHEMA_VERSION,
  dayKey: getDayKey(),
  siteUsage: {},
  breaks: {},
  history: [],
  stats: createEmptyStats()
};

chrome.runtime.onInstalled.addListener(async (details) => {
  await ensureDefaults();
  chrome.alarms.create("fgk_housekeeping", { periodInMinutes: 1 });

  if (details.reason === "install") {
    await chrome.tabs.create({ url: chrome.runtime.getURL("src/onboarding.html") });
  }
});

chrome.runtime.onStartup.addListener(async () => {
  await ensureDefaults();
  chrome.alarms.create("fgk_housekeeping", { periodInMinutes: 1 });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === "fgk_housekeeping") {
    void cleanState();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender)
    .then(sendResponse)
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error instanceof Error ? error.message : "Unknown extension error"
      });
    });

  return true;
});

async function handleMessage(message, sender) {
  switch (message?.type) {
    case "FGK_TICK":
      return handleTick(message, sender);
    case "FGK_STATUS":
      return getStatusForUrl(message.url);
    case "FGK_GET_DASHBOARD":
      return getDashboard();
    case "FGK_SAVE_SETTINGS":
      return saveSettings(message.settings);
    case "FGK_ADD_SITE":
      return addSite(message.site);
    case "FGK_UPDATE_SITE":
      return updateSite(message.siteId, message.patch);
    case "FGK_REMOVE_SITE":
      return removeSite(message.siteId);
    case "FGK_RESET_USAGE":
      return resetUsage();
    case "FGK_EXPORT_DATA":
      return exportData();
    case "FGK_IMPORT_DATA":
      return importData(message.payload);
    default:
      return { ok: false, error: "Unsupported message type" };
  }
}

async function handleTick(message, sender) {
  const settings = await getSettings();
  const status = await getStatusForUrl(message.url, settings);

  if (!settings.enabled || !status.matchedSite || status.trackingPaused) {
    return status;
  }

  const isFocused = await isSenderFocused(sender);
  if (!isFocused) {
    return status;
  }

  const now = Date.now();
  const state = normalizeStateDay(await getState(), now);
  const site = status.matchedSite;
  const activeBreak = getActiveBreak(state, site.id, now);

  if (activeBreak) {
    await setState(state);
    return buildBlockedStatus(settings, site, state, activeBreak);
  }

  const safeDeltaMs = clamp(Number(message.deltaMs) || 0, 0, 15000);
  const nextUsage = (state.siteUsage[site.id] || 0) + safeDeltaMs;
  const limitMs = getSiteLimitMs(site, settings);

  state.siteUsage[site.id] = nextUsage;
  addFocusStats(state, safeDeltaMs, now);

  if (nextUsage >= limitMs) {
    const breakSession = createBreakSession(site, settings, now);
    const breakMs = Math.max(0, breakSession.endsAt - breakSession.startedAt);

    state.breaks[site.id] = breakSession;
    state.siteUsage[site.id] = limitMs;
    addBreakStartedStats(state, breakMs, now);
    state.history = [
      buildHistoryEvent("break_started", site, now, {
        mode: breakSession.mode,
        limitMs,
        breakEndsAt: breakSession.endsAt,
        breakMs
      }),
      ...(state.history || [])
    ].slice(0, 120);

    await setState(state);
    return buildBlockedStatus(settings, site, state, breakSession);
  }

  await setState(state);
  return buildOpenStatus(settings, site, state);
}

async function getStatusForUrl(url, existingSettings) {
  const settings = existingSettings || await getSettings();
  const state = normalizeStateDay(await getState());
  const host = getHostname(url);
  const site = host ? getMatchingTrackedSite(host, settings.trackedSites) : null;
  const now = Date.now();

  if (!settings.enabled || !site) {
    await setState(state);
    return {
      ok: true,
      shouldBlock: false,
      matchedSite: null,
      trackingPaused: false,
      usageMs: 0,
      limitMs: settings.defaultFocusLimitMinutes * 60 * 1000,
      breakEndsAt: null,
      settings
    };
  }

  if (!isWithinActiveHours(site, now)) {
    await setState(state);
    return {
      ...buildOpenStatus(settings, site, state),
      trackingPaused: true,
      pausedReason: "outside_active_hours"
    };
  }

  const activeBreak = getActiveBreak(state, site.id, now);
  await setState(state);

  if (activeBreak) {
    return buildBlockedStatus(settings, site, state, activeBreak);
  }

  return buildOpenStatus(settings, site, state);
}

async function getDashboard() {
  const settings = await getSettings();
  const state = normalizeStateDay(await getState());
  await setState(state);

  return {
    ok: true,
    settings,
    state,
    siteSummaries: buildSiteSummaries(settings, state),
    statsSummary: buildStatsSummary(state),
    now: Date.now()
  };
}

async function saveSettings(nextSettings) {
  const current = await getSettings();
  const merged = normalizeSettings({
    ...current,
    ...nextSettings,
    trackedSites: nextSettings?.trackedSites || current.trackedSites
  });

  await chrome.storage.local.set({ [SETTINGS_KEY]: merged });
  return getDashboard();
}

async function addSite(siteInput) {
  const settings = await getSettings();
  const site = normalizeSite({
    domain: siteInput?.domain,
    label: siteInput?.label,
    limitMinutes: siteInput?.limitMinutes || settings.defaultFocusLimitMinutes,
    breakMinutes: siteInput?.breakMinutes || settings.defaultBreakMinutes,
    pauseMode: siteInput?.pauseMode || "timer",
    enabled: siteInput?.enabled !== false
  });

  if (!site.domain) {
    return { ok: false, error: "Add a valid domain." };
  }

  const exists = settings.trackedSites.some((existingSite) => existingSite.domain === site.domain);
  if (exists) {
    return { ok: false, error: "That site is already tracked." };
  }

  settings.trackedSites = [...settings.trackedSites, site];
  await chrome.storage.local.set({ [SETTINGS_KEY]: normalizeSettings(settings) });
  return getDashboard();
}

async function updateSite(siteId, patch) {
  const settings = await getSettings();
  let found = false;

  settings.trackedSites = settings.trackedSites.map((site) => {
    if (site.id !== siteId) {
      return site;
    }

    found = true;
    return normalizeSite({
      ...site,
      ...patch,
      id: site.id
    });
  });

  if (!found) {
    return { ok: false, error: "Tracked site not found." };
  }

  await chrome.storage.local.set({ [SETTINGS_KEY]: normalizeSettings(settings) });
  return getDashboard();
}

async function removeSite(siteId) {
  const settings = await getSettings();
  const state = await getState();

  settings.trackedSites = settings.trackedSites.filter((site) => site.id !== siteId);
  delete state.siteUsage[siteId];
  delete state.breaks[siteId];

  await chrome.storage.local.set({
    [SETTINGS_KEY]: normalizeSettings(settings),
    [STATE_KEY]: normalizeStateDay(state)
  });

  return getDashboard();
}

async function resetUsage() {
  await setState({
    ...DEFAULT_STATE,
    dayKey: getDayKey()
  });

  return getDashboard();
}

async function exportData() {
  return {
    ok: true,
    exportedAt: new Date().toISOString(),
    settings: await getSettings(),
    state: await getState()
  };
}

async function importData(payload) {
  const parsed = typeof payload === "string" ? JSON.parse(payload) : payload;
  const importedSettings = parsed?.settings ? normalizeSettings(parsed.settings) : normalizeSettings(parsed);
  const importedState = parsed?.state ? normalizeStateDay(parsed.state) : null;

  await chrome.storage.local.set({
    [SETTINGS_KEY]: importedSettings,
    ...(importedState ? { [STATE_KEY]: importedState } : {})
  });

  return getDashboard();
}

async function cleanState() {
  const state = normalizeStateDay(await getState());
  await setState(state);
}

async function ensureDefaults() {
  const existing = await chrome.storage.local.get([SETTINGS_KEY, STATE_KEY]);

  if (!existing[SETTINGS_KEY]) {
    await chrome.storage.local.set({ [SETTINGS_KEY]: DEFAULT_SETTINGS });
  } else {
    await chrome.storage.local.set({ [SETTINGS_KEY]: normalizeSettings(existing[SETTINGS_KEY]) });
  }

  if (!existing[STATE_KEY]) {
    await chrome.storage.local.set({ [STATE_KEY]: DEFAULT_STATE });
  } else {
    await chrome.storage.local.set({ [STATE_KEY]: normalizeStateDay(existing[STATE_KEY]) });
  }
}

async function getSettings() {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  return normalizeSettings(result[SETTINGS_KEY] || DEFAULT_SETTINGS);
}

async function getState() {
  const result = await chrome.storage.local.get(STATE_KEY);
  return normalizeStateDay(result[STATE_KEY] || DEFAULT_STATE);
}

async function setState(state) {
  await chrome.storage.local.set({ [STATE_KEY]: normalizeStateDay(state) });
}

async function isSenderFocused(sender) {
  if (!sender?.tab?.id || !sender.tab.active || typeof sender.tab.windowId !== "number") {
    return false;
  }

  try {
    const currentWindow = await chrome.windows.get(sender.tab.windowId);
    return Boolean(currentWindow.focused);
  } catch {
    return false;
  }
}

function normalizeSettings(settings) {
  const rawSites = Array.isArray(settings?.trackedSites)
    ? settings.trackedSites
    : typeof settings?.trackedSites === "string"
      ? settings.trackedSites.split(/\n|,/)
      : DEFAULT_SETTINGS.trackedSites;

  const migratedSites = rawSites.map((site) => {
    if (typeof site === "string") {
      return createSite(site, titleFromDomain(site), settings.focusLimitMinutes, settings.breakMinutes);
    }

    return normalizeSite(site);
  });

  const uniqueSites = [];
  const seenDomains = new Set();

  for (const site of migratedSites) {
    if (!site.domain || seenDomains.has(site.domain)) {
      continue;
    }

    uniqueSites.push(site);
    seenDomains.add(site.domain);
  }

  return {
    schemaVersion: SCHEMA_VERSION,
    enabled: settings?.enabled !== false,
    language: normalizeLanguage(settings?.language),
    theme: normalizeTheme(settings?.theme),
    warningEnabled: settings?.warningEnabled !== false,
    warningSeconds: clamp(Number(settings?.warningSeconds || DEFAULT_SETTINGS.warningSeconds), 10, 600),
    defaultFocusLimitMinutes: clamp(
      Number(settings?.defaultFocusLimitMinutes || settings?.focusLimitMinutes || DEFAULT_SETTINGS.defaultFocusLimitMinutes),
      1,
      480
    ),
    defaultBreakMinutes: clamp(
      Number(settings?.defaultBreakMinutes || settings?.breakMinutes || DEFAULT_SETTINGS.defaultBreakMinutes),
      1,
      180
    ),
    shortBreakMinutes: clamp(Number(settings?.shortBreakMinutes || DEFAULT_SETTINGS.shortBreakMinutes), 1, 180),
    longBreakMinutes: clamp(Number(settings?.longBreakMinutes || DEFAULT_SETTINGS.longBreakMinutes), 1, 480),
    overlayTitle: normalizeOverlayCopy(settings?.overlayTitle, DEFAULT_SETTINGS.overlayTitle).slice(0, 80),
    overlayMessage: normalizeOverlayCopy(settings?.overlayMessage, DEFAULT_SETTINGS.overlayMessage).slice(0, 220),
    trackedSites: uniqueSites.slice(0, 150)
  };
}

function normalizeSite(site) {
  const domain = normalizeSitePattern(site?.domain || site?.pattern || site?.host || site);
  const label = String(site?.label || titleFromDomain(domain)).slice(0, 60);

  return {
    id: String(site?.id || stableSiteId(domain)),
    domain,
    label,
    limitMinutes: clamp(Number(site?.limitMinutes || site?.focusLimitMinutes || DEFAULT_SETTINGS.defaultFocusLimitMinutes), 1, 480),
    breakMinutes: clamp(Number(site?.breakMinutes || DEFAULT_SETTINGS.defaultBreakMinutes), 1, 180),
    pauseMode: normalizePauseMode(site?.pauseMode),
    activeHours: normalizeSchedule(site?.activeHours || site?.schedule),
    enabled: site?.enabled !== false
  };
}

function normalizeSchedule(schedule) {
  const source = schedule || DEFAULT_SCHEDULE;
  const days = Array.isArray(source.days)
    ? source.days.map((day) => Number(day)).filter((day) => day >= 0 && day <= 6)
    : DEFAULT_SCHEDULE.days;

  return {
    enabled: Boolean(source.enabled),
    start: normalizeTimeString(source.start || DEFAULT_SCHEDULE.start),
    end: normalizeTimeString(source.end || DEFAULT_SCHEDULE.end),
    days: days.length ? [...new Set(days)] : DEFAULT_SCHEDULE.days
  };
}

function normalizeStateDay(state, now = Date.now()) {
  const dayKey = getDayKey(now);
  const normalized = {
    ...DEFAULT_STATE,
    ...state,
    schemaVersion: SCHEMA_VERSION,
    siteUsage: { ...(state?.siteUsage || {}) },
    breaks: { ...(state?.breaks || {}) },
    history: Array.isArray(state?.history) ? state.history.slice(0, 120) : [],
    stats: normalizeStats(state?.stats)
  };

  if (normalized.dayKey !== dayKey) {
    return {
      ...normalized,
      dayKey,
      siteUsage: {},
      breaks: {}
    };
  }

  for (const [siteId, session] of Object.entries(normalized.breaks)) {
    if (!session?.endsAt || session.endsAt <= now) {
      delete normalized.breaks[siteId];
      normalized.siteUsage[siteId] = 0;
      addBreakCompletedStats(normalized, now);
      normalized.history = [
        {
          type: "break_completed",
          siteId,
          siteDomain: session?.siteDomain || "",
          siteLabel: session?.siteLabel || "",
          mode: session?.mode || "timer",
          happenedAt: now
        },
        ...normalized.history
      ].slice(0, 120);
    }
  }

  return normalized;
}

function normalizeStats(stats) {
  const normalized = {
    ...createEmptyStats(),
    ...(stats || {}),
    daily: { ...(stats?.daily || {}) }
  };

  normalized.totalFocusMs = Math.max(0, Number(normalized.totalFocusMs || 0));
  normalized.totalBreakMs = Math.max(0, Number(normalized.totalBreakMs || 0));
  normalized.breaksStarted = Math.max(0, Number(normalized.breaksStarted || 0));
  normalized.breaksCompleted = Math.max(0, Number(normalized.breaksCompleted || 0));

  for (const [dayKey, entry] of Object.entries(normalized.daily)) {
    normalized.daily[dayKey] = {
      focusMs: Math.max(0, Number(entry?.focusMs || 0)),
      breakMs: Math.max(0, Number(entry?.breakMs || 0)),
      breaksStarted: Math.max(0, Number(entry?.breaksStarted || 0)),
      breaksCompleted: Math.max(0, Number(entry?.breaksCompleted || 0))
    };
  }

  return normalized;
}

function getActiveBreak(state, siteId, now = Date.now()) {
  const activeBreak = state.breaks?.[siteId];

  if (!activeBreak) {
    return null;
  }

  if (activeBreak.endsAt <= now) {
    delete state.breaks[siteId];
    state.siteUsage[siteId] = 0;
    addBreakCompletedStats(state, now);
    state.history = [
      {
        type: "break_completed",
        siteId,
        siteDomain: activeBreak.siteDomain || "",
        siteLabel: activeBreak.siteLabel || "",
        mode: activeBreak.mode || "timer",
        happenedAt: now
      },
      ...(state.history || [])
    ].slice(0, 120);
    return null;
  }

  return activeBreak;
}

function buildOpenStatus(settings, site, state) {
  const usageMs = state.siteUsage[site.id] || 0;
  const limitMs = getSiteLimitMs(site, settings);

  return {
    ok: true,
    shouldBlock: false,
    matchedSite: site,
    trackingPaused: false,
    usageMs,
    limitMs,
    remainingMs: Math.max(0, limitMs - usageMs),
    breakEndsAt: null,
    settings
  };
}

function buildBlockedStatus(settings, site, state, breakSession) {
  const limitMs = getSiteLimitMs(site, settings);

  return {
    ok: true,
    shouldBlock: true,
    matchedSite: site,
    trackingPaused: false,
    usageMs: state.siteUsage[site.id] || limitMs,
    limitMs,
    remainingMs: 0,
    breakEndsAt: breakSession.endsAt,
    breakStartedAt: breakSession.startedAt,
    breakMode: breakSession.mode,
    settings
  };
}

function buildSiteSummaries(settings, state) {
  const now = Date.now();

  return settings.trackedSites.map((site) => {
    const usageMs = state.siteUsage[site.id] || 0;
    const limitMs = getSiteLimitMs(site, settings);
    const activeBreak = getActiveBreak(state, site.id, now);

    return {
      ...site,
      usageMs,
      limitMs,
      remainingMs: Math.max(0, limitMs - usageMs),
      usagePercent: limitMs > 0 ? Math.min(100, Math.round((usageMs / limitMs) * 100)) : 0,
      breakEndsAt: activeBreak?.endsAt || null,
      breakMode: activeBreak?.mode || site.pauseMode,
      scheduleActive: isWithinActiveHours(site, now)
    };
  });
}

function buildStatsSummary(state, now = Date.now()) {
  const stats = normalizeStats(state.stats);
  const dayKeys = getRecentDayKeys(7, now);
  const week = dayKeys.reduce((sum, dayKey) => {
    const entry = stats.daily[dayKey] || {};
    return {
      focusMs: sum.focusMs + Number(entry.focusMs || 0),
      breakMs: sum.breakMs + Number(entry.breakMs || 0),
      breaksStarted: sum.breaksStarted + Number(entry.breaksStarted || 0)
    };
  }, { focusMs: 0, breakMs: 0, breaksStarted: 0 });
  const today = stats.daily[getDayKey(now)] || {};

  return {
    todayFocusMs: Number(today.focusMs || 0),
    todaySavedMs: Number(today.breakMs || 0),
    weekFocusMs: week.focusMs,
    weekSavedMs: week.breakMs,
    weekBreaksStarted: week.breaksStarted,
    totalFocusMs: stats.totalFocusMs,
    totalSavedMs: stats.totalBreakMs,
    breaksStarted: stats.breaksStarted,
    breaksCompleted: stats.breaksCompleted,
    dailySeries: dayKeys.map((dayKey) => ({
      dayKey,
      focusMs: Number(stats.daily[dayKey]?.focusMs || 0),
      savedMs: Number(stats.daily[dayKey]?.breakMs || 0),
      breaksStarted: Number(stats.daily[dayKey]?.breaksStarted || 0)
    }))
  };
}

function buildHistoryEvent(type, site, now, extra = {}) {
  return {
    type,
    siteId: site.id,
    siteDomain: site.domain,
    siteLabel: site.label,
    happenedAt: now,
    ...extra
  };
}

function createBreakSession(site, settings, now) {
  const mode = normalizePauseMode(site.pauseMode);
  const endsAt = mode === "tomorrow"
    ? getNextLocalDayStart(now)
    : now + getBreakDurationMs(site, settings, mode);

  return {
    siteId: site.id,
    siteDomain: site.domain,
    siteLabel: site.label,
    mode,
    startedAt: now,
    endsAt
  };
}

function getBreakDurationMs(site, settings, mode) {
  if (mode === "short") {
    return minutesToMs(settings.shortBreakMinutes);
  }

  if (mode === "long") {
    return minutesToMs(settings.longBreakMinutes);
  }

  return getSiteBreakMs(site, settings);
}

function addFocusStats(state, focusMs, now) {
  const stats = state.stats || createEmptyStats();
  const daily = getDailyStats(stats, getDayKey(now));

  stats.totalFocusMs += focusMs;
  daily.focusMs += focusMs;
  state.stats = stats;
}

function addBreakStartedStats(state, breakMs, now) {
  const stats = state.stats || createEmptyStats();
  const daily = getDailyStats(stats, getDayKey(now));

  stats.totalBreakMs += breakMs;
  stats.breaksStarted += 1;
  daily.breakMs += breakMs;
  daily.breaksStarted += 1;
  state.stats = stats;
}

function addBreakCompletedStats(state, now) {
  const stats = state.stats || createEmptyStats();
  const daily = getDailyStats(stats, getDayKey(now));

  stats.breaksCompleted += 1;
  daily.breaksCompleted += 1;
  state.stats = stats;
}

function getDailyStats(stats, dayKey) {
  if (!stats.daily[dayKey]) {
    stats.daily[dayKey] = {
      focusMs: 0,
      breakMs: 0,
      breaksStarted: 0,
      breaksCompleted: 0
    };
  }

  return stats.daily[dayKey];
}

function createEmptyStats() {
  return {
    totalFocusMs: 0,
    totalBreakMs: 0,
    breaksStarted: 0,
    breaksCompleted: 0,
    daily: {}
  };
}

function createSite(domain, label, limitMinutes, breakMinutes, extra = {}) {
  const normalizedDomain = normalizeSitePattern(domain);

  return normalizeSite({
    id: stableSiteId(normalizedDomain),
    domain: normalizedDomain,
    label: label || titleFromDomain(normalizedDomain),
    limitMinutes: clamp(Number(limitMinutes || 25), 1, 480),
    breakMinutes: clamp(Number(breakMinutes || 5), 1, 180),
    pauseMode: extra.pauseMode || "timer",
    activeHours: extra.activeHours || DEFAULT_SCHEDULE,
    enabled: true
  });
}

function getMatchingTrackedSite(hostname, trackedSites) {
  const host = normalizeSitePattern(hostname);
  const sites = (trackedSites || []).filter((site) => site.enabled !== false);

  return sites.find((site) => host === site.domain || host.endsWith(`.${site.domain}`)) || null;
}

function isWithinActiveHours(site, now = Date.now()) {
  const schedule = normalizeSchedule(site.activeHours);

  if (!schedule.enabled) {
    return true;
  }

  const date = new Date(now);
  const day = date.getDay();

  if (!schedule.days.includes(day)) {
    return false;
  }

  const currentMinutes = date.getHours() * 60 + date.getMinutes();
  const startMinutes = parseTimeToMinutes(schedule.start);
  const endMinutes = parseTimeToMinutes(schedule.end);

  if (startMinutes <= endMinutes) {
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  }

  return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
}

function normalizeSitePattern(value) {
  const trimmed = String(value || "").trim().toLowerCase();

  if (!trimmed) {
    return "";
  }

  try {
    const url = trimmed.includes("://") ? new URL(trimmed) : new URL(`https://${trimmed}`);
    return url.hostname.replace(/^\*\./, "").replace(/^www\./, "");
  } catch {
    return trimmed
      .replace(/^\*\./, "")
      .replace(/^https?:\/\//, "")
      .replace(/^www\./, "")
      .split("/")[0]
      .trim();
  }
}

function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "";
  }
}

function titleFromDomain(domain) {
  const root = String(domain || "Site").split(".")[0] || "Site";
  return root
    .split(/[-_]/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function stableSiteId(domain) {
  const normalized = normalizeSitePattern(domain);
  let hash = 0;

  for (let index = 0; index < normalized.length; index += 1) {
    hash = ((hash << 5) - hash) + normalized.charCodeAt(index);
    hash |= 0;
  }

  return `site_${Math.abs(hash)}`;
}

function getSiteLimitMs(site, settings) {
  return minutesToMs(site.limitMinutes || settings.defaultFocusLimitMinutes);
}

function getSiteBreakMs(site, settings) {
  return minutesToMs(site.breakMinutes || settings.defaultBreakMinutes);
}

function getDayKey(now = Date.now()) {
  const date = new Date(now);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getRecentDayKeys(count, now = Date.now()) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now);
    date.setDate(date.getDate() - (count - index - 1));
    return getDayKey(date.getTime());
  });
}

function getNextLocalDayStart(now = Date.now()) {
  const date = new Date(now);
  date.setDate(date.getDate() + 1);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

function minutesToMs(minutes) {
  return Number(minutes || 0) * 60 * 1000;
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function normalizeLanguage(language) {
  return language === "pt-BR" ? "pt-BR" : "en";
}

function normalizeTheme(theme) {
  return theme === "dark" ? "dark" : "light";
}

function normalizeOverlayCopy(value, fallback) {
  const raw = String(value || "").trim();
  const legacyDefaults = [
    "Time for a break",
    "Hora de pausar",
    "Your focus limit is up. Take a short pause, breathe, and come back with a cleaner head.",
    "Seu limite de foco acabou. Faça uma pausa curta, respire e volte com a cabeça mais limpa.",
    "Seu limite de foco acabou. Faca uma pausa curta, respire e volte com a cabeca mais limpa."
  ];

  if (!raw || legacyDefaults.includes(raw)) {
    return fallback;
  }

  return raw;
}

function normalizePauseMode(mode) {
  return ["timer", "short", "long", "tomorrow"].includes(mode) ? mode : "timer";
}

function normalizeTimeString(value) {
  const match = String(value || "").match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return "09:00";
  }

  const hours = clamp(Number(match[1]), 0, 23);
  const minutes = clamp(Number(match[2]), 0, 59);
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function parseTimeToMinutes(value) {
  const [hours, minutes] = normalizeTimeString(value).split(":").map(Number);
  return hours * 60 + minutes;
}

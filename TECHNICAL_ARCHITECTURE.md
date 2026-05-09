# Technical Architecture

## Overview

Focus Gatekeeper is a Chrome Manifest V3 extension with a local-first architecture. It has no backend, no analytics, and no third-party dependencies.

## Runtime Pieces

- `background.js`: service worker and source of truth for settings, state, stats, break sessions, import/export, and daily cleanup.
- `content.js`: sends active visible-page usage ticks and renders/removes the blocking overlay.
- `popup.js`: compact dashboard and current-site shortcut.
- `options.js`: full settings, site management, stats, history, import/export, and language selection.
- `onboarding.js`: first-run setup entrypoint.

## Tracking Logic

The content script sends a usage tick every second while the page is visible. The background service worker only counts time when Chrome reports that the sender tab is active and its window is focused.

This prevents background tabs and unfocused browser windows from inflating usage.

## Site Rules

Each tracked site has:

- `domain`
- `label`
- `limitMinutes`
- `breakMinutes`
- `pauseMode`
- `activeHours`
- `enabled`

Domain matching supports exact domains and subdomains.

## Pause Modes

- `timer`: use the site's own break timer.
- `short`: use the global short-break preset.
- `long`: use the global long-break preset.
- `tomorrow`: block until the next local day starts.

## Stats

The extension stores local stats for:

- total focus time
- total break/saved time
- today's focus time
- weekly focus time
- break count
- daily series for the last seven days

## Warning And Theme

Before a blocking session starts, the content script can render a small non-interactive warning when the remaining time is below the configured warning threshold. Theme selection is stored in settings and applied to the popup, options page, warning toast, and pause overlay.

## Storage

The extension uses `chrome.storage.local`:

- `fgk_settings`: settings and tracked sites
- `fgk_state`: usage, active breaks, history, and stats

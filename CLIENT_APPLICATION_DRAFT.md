# Client Application Draft

Hi,

I can build the Chrome productivity extension you described as a clean Manifest V3 project. I have already prepared a working local-first prototype for this exact workflow: it tracks active time on user-defined distracting sites and displays a full-screen animated pause overlay when the limit is reached.

The architecture uses a Manifest V3 background service worker to manage active-tab time tracking, site rules, pause sessions, daily cleanup, local stats, and settings. A content script runs on web pages, sends visible active-time ticks, and renders the full-page overlay when the background worker returns a blocked state.

The MVP scope I would deliver includes:

- Chrome Manifest V3 implementation
- Active-tab and focused-window tracking
- User-configurable distracting sites
- Per-site focus limits and break timers
- Pause modes: short break, long break, site timer, and block until tomorrow
- Optional work-hours schedule
- Pre-block warning before the blocking state starts
- Compact animated blocking overlay
- Light and dark theme support
- Popup dashboard
- Options page with stats, history, import/export, and bilingual UI
- Local-only storage with no analytics or remote backend
- QA across tab switching, refreshes, active break states, and permission behavior

For a production release, I would polish Chrome Web Store assets, privacy policy, permission justification, screenshots, and final packaging.

Estimated timeline for a polished MVP: 8 to 10 weeks, including development, QA, UX polish, packaging, and Chrome Web Store submission support.

Best regards.

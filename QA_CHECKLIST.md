# QA Checklist

## Installation

- Load unpacked extension in Chrome.
- Confirm onboarding page opens on first install.
- Confirm popup opens without console errors.
- Confirm options page opens without console errors.

## Language

- Switch language between English and Portuguese (Brazil).
- Confirm popup, options, and overlay text follow the selected language.

## Theme

- Switch between light and dark theme.
- Confirm popup, options, warning, and overlay follow the selected theme.

## Tracking

- Add a normal domain such as `example.com`.
- Confirm subdomains match the parent domain.
- Confirm inactive tabs do not count time.
- Confirm active but unfocused Chrome windows do not count time.
- Confirm disabled sites do not count time.
- Confirm work-hours schedule pauses tracking outside the configured time.

## Pause Modes

- Test site timer mode.
- Test short break mode.
- Test long break mode.
- Test block until tomorrow mode.

## Overlay

- Set a site to a 1-minute limit and 1-minute break.
- Confirm the pre-block warning appears before the overlay.
- Confirm overlay appears after the limit.
- Confirm the overlay card is compact and centered on desktop.
- Confirm countdown updates every second.
- Confirm page stays blocked while countdown is active.
- Confirm overlay disappears after the break expires.
- Confirm usage resets after break completion.

## Stats

- Confirm today's focus time increases.
- Confirm weekly focus time increases.
- Confirm total saved time increases when breaks start.
- Confirm recent activity logs break start/completion.

## Settings

- Edit site label, domain, focus limit, break timer, pause mode, and schedule.
- Disable and re-enable a site.
- Remove a site.
- Reset usage.
- Export settings.
- Import exported settings.

## Store Readiness

- Verify icons render at 16, 32, 48, and 128px.
- Replace generated preview screenshots with real Chrome screenshots before publishing.
- Review permission justification.
- Review privacy policy.

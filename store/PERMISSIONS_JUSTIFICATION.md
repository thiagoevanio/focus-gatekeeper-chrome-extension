# Permissions Justification

## `storage`

Used to save user settings, tracked domains, usage totals, pause sessions, and language preference locally in Chrome.

## `tabs`

Used to determine which tab is currently active and whether the active tab belongs to a normal web page that can be tracked.

## `alarms`

Used for periodic housekeeping, including cleaning expired pause sessions and daily state maintenance.

## `<all_urls>` host permission

Required because users can choose any website as a distracting site. The content script must run on web pages so it can request tracking status and render the blocking overlay when the user-defined limit is reached.

Focus Gatekeeper does not transmit visited URLs to any server.

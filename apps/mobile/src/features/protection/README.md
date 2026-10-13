# Protection

Protection UI displays native health state for website protection, visual protection, app controls, social controls, and anti-bypass friction.

Do not claim absolute uninstall blocking.

## Timed Uninstall Protection

The Uninstall Protection card is the second Settings section, immediately after account information (or the signed-out account-connect card), with a compact “Choose a timed lock” subtitle.

Settings → Uninstall Protection opens a centered popup with 1, 7, 14, 30, and 90-day commitments, independently of Burst. Review and consent appear within the same popup, without a separate “How protection works” panel. Close or Android Back dismisses the popup without changing the lock; Back during review returns to duration selection. Explicitly agree and grant Android Device Administrator access to start a lock. Connected accessibility with consent is also required; no Burst apps or Burst duration need to be configured.

The encrypted native configuration persists the deadline across process restarts and reboots. While active, the app cannot cancel, shorten, replace, or reset the commitment, or withdraw accessibility consent. The popup displays remaining time and expiry; missing permissions produce a degraded status, and restoring them preserves the original deadline. Permission setup returns to the Settings popup.

Administrator release waits for both the independent timer and any protected Burst session to expire. Android alarms, boot recovery, and foreground reconciliation handle cleanup. Android may delay inexact alarms; foreground reconciliation also releases expired protection.

This is uninstall friction, not an absolute Android uninstall ban. Administrator removal, safe mode, and system resets can bypass protection. Timers use elapsed time within a boot and the persisted wall-clock deadline after reboot; changing the system clock across reboots can affect expiry.


# ADR-0009 — The device flow owns the screen

- **Status:** Accepted
- **Date:** 2026-09-09 → 2026-09-14

## Context

The OAuth 2 Device Authorization Grant (RFC 8628) exists for devices with no keyboard: a console,
a TV, a set-top box. The device polls a token endpoint while the user approves the request on a
second device, which means the game has to show a short code and a QR code, and then wait.

The question was who renders that UI.

The tracker first drew a fallback popup, dismissible by the user (`3511451`, `7ac3957`,
2026-09-09). Two days later that became "block the game UI until connected" (`d1bbb80`,
2026-09-14), which is a different decision.

## Decision

The tracker draws its own full-screen blocking overlay and owns the entire flow. It:

- installs listeners on `pointerdown`, `mousedown`, `touchstart`, `click`, `keydown`, `keyup` and
  `keypress`, and locks scrolling, so no input reaches the game behind it,
- is dismissed **programmatically**, only once a token has arrived — including on failure, where
  the message stays up so the player can read it (`ae35b59` closed the manual dismissal path),
- exposes **no callback** for a host game to render anything.

A legacy `onDeviceAuthorizationInfo` callback is still accepted and ignored with a warning, so a
game that shipped one against an earlier build degrades rather than breaking.

The screen is localized to English, Spanish and French, added in `15ab27d` (2026-09-14), with the
language resolved from `oauth2.language`, a `?lang=` parameter, the stored choice, or the browser
language.

## Consequences

**Positive**

- A game cannot get the flow wrong. Polling interval, expiry, error states and the retry budget all
  live in one place.
- A player cannot interact with a half-authenticated game and generate statements against an actor
  that is about to change.
- No host callback means no API surface to keep stable.

**Negative**

- **The tracker is no longer purely a data layer.** While `login()` is pending it manipulates the
  DOM and installs listeners on `document`. A game with its own modal system has two, and has to
  handle that — including the case where the game's UI assumes it is the only thing on screen.
- **The overlay is not themable.** A game whose art direction is strong enough to want its own
  sign-in screen cannot have one through this path.
- **The languages are fixed at three.** They are bundled as JSON (`src/Auth/locales/*.json`),
  which is also why Node cannot import `src/` directly and the tests run against `dist/`.

## Evidence

- `0799428` — 2026-09-09, the device flow
- `3511451`, `7ac3957` — 2026-09-09, the fallback popup and the QR code
- `d1bbb80` — 2026-09-14, blocking the game UI; the popup became an overlay with global listeners
- `ae35b59` — the popup became dismissible only programmatically
- `15ab27d` — 2026-09-14, the three languages

## Related

- [Authentication](../authentication.md)
- [ADR-0001](0001-trackers-are-composed-over-one-asset.md) — the layering this reaches around
- [ADR-0010](0010-the-bundle-is-committed.md) — why the tests import the bundle at all
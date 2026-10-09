# Authentication

Four flows, and what one of them changes about the page.

## The four flows

`JSTracker.login()` picks the asset that matches `trackerSettings.oauth_type`:

| `oauth_type` | What it does | Where the settings live |
| --- | --- | --- |
| `OAuth0` (default) | Uses a token you already have | `tracker.trackerSettings.auth_token` |
| `OAuth1` | Posts a username and password | `tracker.oauth1` |
| `OAuth2` | Fetches a token from an endpoint | `tracker.oauth2` |

Skipping `login()` entirely is valid and gives an anonymous actor named by `actor_name`.

## OAuth 2 grants

Three are supported, selected by `tracker.oauth2.grant_type`:

| Grant | For |
| --- | --- |
| `password` | A game holding the player's password. Only appropriate where the game is the identity provider. |
| `refresh_token` | Renewing an access token that has expired |
| `urn:ietf:params:oauth:grant-type:device_code` | A device with no keyboard — a console, a TV |

`OAuth2Protocol` rejects anything else with a message naming the three it supports, rather than
failing later at the token endpoint.

## The username comes from the token, not from you

`xAPITrackerAssetOAuth2.getUsername()` decodes the access token as a JWT and reads
`preferred_username` out of it, falling back to `trackerSettings.actor_name`.

That is why a game that authenticates with OAuth 2 and never sets `actor_name` still records a
real player: the identity provider is the authority on who the player is, and the tracker defers to
it. The decoding is not verified — the token is read, not checked — which is correct here, because
the tracker received it over TLS from the token endpoint it just called and never trusts it for
anything but a name.

## The device flow owns the screen

The device flow is the one that is not a thin wrapper. It shows a QR code and a short code for the
player to enter on a second device, and while it waits it draws a full-screen blocking overlay
over the game: it swallows pointer, mouse, touch, click and keyboard events, and locks scrolling.

**Your game must not render a sign-in screen for this flow.** There is no callback to do it in.
The overlay is dismissed programmatically once a token has arrived — including on failure, where
the message stays up so the player sees what went wrong.

The screen speaks English, Spanish and French. The language is chosen by `tracker.oauth2.language`,
a `?lang=` parameter, the stored choice, or the browser language, in that order.

This is the one place the tracker manipulates the page. See
[ADR-0009](decisions/0009-the-device-flow-owns-the-screen.md) for why, and what it costs a game
that already has a modal system.

## See also

- [Tutorial 3](../tutorials/03-reading-data-back.md) — the flows as code
- [How to configure from a URL](../how-to/configure-from-url.md) — the `sso_*` parameters
- [API reference](../reference/authentication.md)
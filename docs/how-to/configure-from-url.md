# How to configure from a URL

A **recipe for one task**: configuring a build you do not control, by reading the settings out of
the page's query string instead of out of the source.

## The switch

```js
tracker.trackerSettings.generateSettingsFromURLParams = true;
```

`start()` then reads `window.location.search` and overwrites whatever you set in code. Call it
before `start()`, and expect the URL to win.

## The parameters

| Parameter | Setting it changes |
| --- | --- |
| `result_uri` | `batch_endpoint` |
| `backup_uri` | `backup_endpoint` |
| `backup_type` | `backup_type` |
| `platform` | `platform` |
| `actor_user` | `actor_name` |
| `actor_homepage` | `actor_homepage` |
| `debug` | `debug`, when it is the string `true` |
| `batch_length` | `batch_length`, parsed as an integer |
| `batch_timeout` | `batch_timeout`, parsed as a duration string such as `30sec` |
| `max_retry_delay` | `max_retry_delay`, parsed as a duration string |

Duration strings are the same format the settings use by default (`30sec`, `2min`), which the
[`ms`](https://www.npmjs.com/package/ms) package parses.

## Authentication

Exactly one of three, and which one is present decides `oauth_type`:

| Present in the URL | `oauth_type` | Also set |
| --- | --- | --- |
| `auth_token` | `OAuth0` | `tracker.trackerSettings.auth_token` |
| `username` and `password` | `OAuth1` | `tracker.oauth1.username`, `tracker.oauth1.password` |
| `sso_token_endpoint` | `OAuth2` | the `sso_*` block below |

The OAuth 2 parameters:

| Parameter | Meaning |
| --- | --- |
| `sso_token_endpoint` | Where the token is requested. Its presence selects OAuth 2. |
| `sso_client_id` | Client id |
| `sso_grant_type` | `password`, `refresh_token`, or the device code grant |
| `sso_scope` | Requested scope |
| `sso_username`, `sso_password` | For the password grant |
| `sso_login_hint` | Which account the provider offers first |
| `sso_device_authorization_endpoint` | For the device code grant |
| `sso_poll_interval`, `sso_max_poll_attempts` | Device flow polling, as integers |
| `sso_language` | Language of the device sign-in screen |

## A worked example

```
https://game.example/level1?result_uri=https://lrs.example/xapi&actor_user=player7&platform=https://game.example
```

```js
const tracker = new SeriousGameTracker();
tracker.trackerSettings.generateSettingsFromURLParams = true;

await tracker.login();
tracker.start();
```

sends to `https://lrs.example/xapi`, as `player7`, with `https://game.example` as the platform.

## Caveats

**This is a query string, so it is not secret.** `auth_token`, `sso_password` and `username` /
`password` all arrive in the URL, where they land in browser history, in `Referer` headers, and in
any analytics on the page. For anything beyond a development or single-tenant deployment, have a
backend exchange a short-lived code for the token instead.

**`debug` only accepts the exact string `true`.** Anything else leaves it off, which is the safe
default.

## See also

- [How to control volume](control-volume.md) — the batching parameters this can set
- [Tracker settings reference](../reference/trackers.md#trackersettings)
- [ADR-0002](../explanation/decisions/0002-generated-xapi-ids.md) — why the ids are generated
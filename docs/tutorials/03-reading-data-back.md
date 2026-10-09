# Tutorial 3: reading data back

A tracker writes statements; `LRSTracker` reads them. This tutorial covers getting a token first,
then the read side, and the one thing it enables that writing does not: taking a statement an LRS
returned, changing it, and sending it back.

It continues from [tutorial 1](01-first-statements.md), where the tracker was configured with an
anonymous actor. Reading needs a real token, so that is where we start.

## Authenticating

### OAuth 2, password grant

```js
tracker.trackerSettings.oauth_type = 'OAuth2';
tracker.oauth2.token_endpoint = 'https://auth.example/token';
tracker.oauth2.client_id = 'my-client';
tracker.oauth2.grant_type = 'password';
tracker.oauth2.username = 'player@example.com';
tracker.oauth2.password = 'secret';

await tracker.login();
tracker.start();
```

`login()` is async, so await it before `start()`.

### OAuth 2, device code

For a game running on a TV or a console with no keyboard, the device flow shows a QR code and a
short code for the player to enter on another device:

```js
tracker.trackerSettings.oauth_type = 'OAuth2';
tracker.oauth2.token_endpoint = 'https://auth.example/token';
tracker.oauth2.client_id = 'my-client';
tracker.oauth2.grant_type = 'urn:ietf:params:oauth:grant-type:device_code';
tracker.oauth2.device_authorization_endpoint = 'https://auth.example/device';

await tracker.login();
tracker.start();
```

The tracker draws its own blocking sign-in screen over your game and takes it down once the token
arrives. Your game must not render one itself. The screen speaks English, Spanish, and French;
choose with `tracker.oauth2.language`, a `?lang=` parameter, or the selector the player uses.

### OAuth 1

```js
tracker.trackerSettings.oauth_type = 'OAuth1';
tracker.oauth1.username = 'username';
tracker.oauth1.password = 'password';

await tracker.login();
tracker.start();
```

### OAuth 0

The default. Pass a token you already have, or skip `login()` entirely for an anonymous actor:

```js
tracker.trackerSettings.auth_token = 'a-token';
await tracker.login();
```
## Reading statements back

`LRSTracker` reads what is already in the LRS:

```js
import { LRSTracker } from 'js-tracker';

const lrs = new LRSTracker();
// ... same settings ...
await lrs.login();
lrs.start();

const statement = await lrs.getStatementById('18c01bd5-a384-42ad-a96a-9572d4674b87');
const results = await lrs.getStatementByQuery({ verb: { id: 'https://w3id.org/xapi/seriousgames/verbs/accessed' } });
```

`LRSTracker.trace(...)` gives you an `LRSStatementBuilder`, which adds the parts only an LRS
statement carries:

```js
await lrs.trace('http://adlnet.gov/expapi/verbs/completed', 'activity', 'a-1')
	.withId('18c01bd5-a384-42ad-a96a-9572d4674b87')
	.withActorMbox('mailto:player@example.com')
	.withAuthorityAccount('lrs', 'https://lrs.example')
	.withStored(new Date())
	.send();
```

You can also take a statement the LRS returned, change it, and send it back:

```js
const fixed = lrs.fromXAPI(statement).withScore({ raw: 4 });
await fixed.send();
```

## Where to go next

- [How to instrument a real mechanic](../how-to/instrument-common-mechanics.md) — the judgement calls
  behind picking a game object.
- [API reference](../reference/index.md) — every query method `LRSTracker` exposes.
- [ADR-0007](../explanation/decisions/0009-the-device-flow-owns-the-screen.md) — why the tracker
  draws its own sign-in screen.

Every snippet here was run against the built bundle.

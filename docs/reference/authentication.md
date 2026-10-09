# Authentication

Reference for the authentication layers. `XasuJS.login()` picks the asset that matches `trackerSettings.oauth_type`, and the asset asks its protocol object for a token. The protocol classes are documented here for the cases where a game needs to reason about the token itself.
Extends `xAPITrackerAsset`.

## `xAPITrackerAssetOAuth1`

A specialized tracker asset that implements OAuth1 authentication.
Extends the base xAPITrackerAsset with basic authentication capabilities.

### `new Class(...)`

Creates an instance of xAPITrackerAssetOAuth1.

### `async refreshAuth()`

Refreshes the authentication token.
Delegates to the parent class implementation.

**Returns** `Promise<void>` — A promise that resolves when the refresh is complete

### `logout()`

Logs out the current session.
Delegates to the parent class implementation.

### `oauth1Settings`

Type: `Object`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `username` | `string` | `""` | — |
| `password` | `string` | `""` | — |

Extends `xAPITrackerAsset`.

## `xAPITrackerAssetOAuth2`

A specialized tracker asset that implements OAuth2 authentication.
Extends the base xAPITrackerAsset with OAuth2 capabilities.

### `oauth2`

Instance of OAuth2Protocol handling authentication

### `onAuthorizationInfoUpdate`

Callback for token updates

### `oauth2Settings`

Type: `Object`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `token_endpoint` | `string` | `"https://.../token"` | — |
| `grant_type` | `string` | `"password"` | — |
| `client_id` | `string` | `"my_client_id"` | — |
| `client_secret` | `string` | `""` | — |
| `scope` | `string` | `"openid profile"` | — |
| `state` | `string` | `""` | — |
| `code_challenge_method` | `string` | `""` | — |
| `username` | `string` | `"alice@example.com"` | — |
| `password` | `string` | `"supersecret"` | — |
| `login_hint` | `string` | `"alice@example.com"` | — |
| `device_authorization_endpoint` | `string` | `""` | — |
| `poll_interval` | `number` | `null` | — |
| `max_poll_attempts` | `number` | `null` | — |
| `language` | `string` | `""` | UI language for the device sign-in screen (en, es, fr). Falls back to ?lang URL parameter, stored choice, browser language, English. |

Extends `Error`.

## `OAuth2AuthorizationError`

OAuth 2.0 Authorization Error
Matches XASU OAuth2AuthorizationError

Extends `Error`.

## `OAuth2DeviceAuthorizationError`

OAuth 2.0 Device Authorization Error
Matches XASU OAuth2DeviceAuthorizationError

## `OAuth2DeviceAuthorization`

OAuth 2.0 Device Authorization Response
Matches XASU OAuth2DeviceAuthorization

## `OAuth2Token`

OAuth 2.0 Token
Matches XASU OAuth2Token with normalized fields

## `OAuth2Protocol`

A class that implements OAuth 2.0 protocol for authentication and token management.
Supports various grant types including password, refresh_token, and device_code flows.
closely modeled after XASU OAuth2DeviceProtocol (C#)

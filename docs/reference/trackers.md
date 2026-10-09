# Tracker classes

Reference for the four tracker classes. They are documented in the order a game uses them: create one, log in, start it, send statements, flush, stop. Every statement method returns a builder, which is documented in [Statement builders](statement-builders.md).
## `XasuJS`

Main JavaScript Tracker class for xAPI tracking functionality

### `tracker`

The underlying tracker instance

### `Started`

Indicates if the tracker has been started

### `new Class(...)`

Creates a new XasuJS instance

### `async login()`

**Returns** `Promise<void>`

### `async flush(withBackup = false)`

Flushes the statement queue

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `opts` | `Object` | Flush options |
| `opts.withBackup` | `boolean` | Whether to also send to backup endpoint Default: `false`. |

**Returns** `Promise<void>` — Promise that resolves when flushing is complete

### `generateXAPITrackerFromURLParams()`

Generates an xAPI tracker instance from URL parameters

### `trace(verbId, objectType, objectId)`

Creates a new statement builder

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `verbId` | `string` | The verb ID for the statement |
| `objectType` | `string` | The type of the object |
| `objectId` | `string` | The ID of the object |

**Returns** `StatementBuilder` — A new StatementBuilder instance

### `fromXAPI(statement)`

Creates a new statement builder from an xAPI statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `statement` | `Object` | The xAPI statement to create the builder from |

**Returns** `StatementBuilder` — A new StatementBuilder instance

Extends `XasuJS`.

## `XasuScormTracker`

SCORM-specific tracker extending XasuJS

### `scormInstances`

list of scorm instances

### `new Class(...)`

Creates a new XasuScormTracker instance

### `scorm(id, type = SCORMPROFILE.ACTIVITYTYPES.LESSON)`

Creates a new SCORM tracker instance

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | Activity ID |
| `type` | `string` | SCORM type Default: `SCORMPROFILE.ACTIVITYTYPES.LESSON`. |

**Returns** `ScormTracker` — New SCORM tracker instance

### `trace(verbId, objectType, objectId)`

Creates a new statement builder

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `verbId` | `string` | The verb ID for the statement |
| `objectType` | `string` | The type of the object |
| `objectId` | `string` | The ID of the object |

**Returns** `StatementBuilder` — A new StatementBuilder instance

### `fromXAPI(statement)`

Creates a new statement builder from an xAPI statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `statement` | `Object` | The xAPI statement to create the builder from |

**Returns** `StatementBuilder` — A new StatementBuilder instance

Extends `XasuJS`.

## `LRSTracker`

SCORM-specific tracker extending XasuJS

### `new Class(...)`

Creates a new MyTracker instance

### `trace(verbId, objectType, objectId)`

Creates a new statement builder

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `verbId` | `string` | The verb ID for the statement |
| `objectType` | `string` | The type of the object |
| `objectId` | `string` | The ID of the object |

**Returns** `StatementBuilder` — A new StatementBuilder instance

### `fromXAPI(statement)`

Creates a new statement builder from an xAPI statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `statement` | `Object` | The xAPI statement to create the builder from |

**Returns** `LRSStatementBuilder` — A new StatementBuilder instance

### `async getStatementById(statementId)`

Gets a statement by its ID

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `statementId` | `string` | The ID of the statement to fetch |

**Returns** `Promise` — A promise that resolves with the fetched statement

### `async getStatementByQuery(query)`

Gets statements based on a query

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `query` | `Object` | The query to filter statements |

**Returns** `Promise` — A promise that resolves with the fetched statements

### `async getMoreStatements(moreUrl)`

Gets more statements using a "more" URL from a previous query result

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `moreUrl` | `string` | The URL to fetch more statements |

**Returns** `Promise` — A promise that resolves with the fetched statements

Extends `XasuJS`.

## `SeriousGameTracker`

Serious Game Tracker extending XasuJS with game-specific functionality

### `SERIOUSGAMEPROFILE`

Accessible type constants

### `scormTracker`

SCORM tracker instance

### `instances`

list of instances

### `new Class(...)`

Creates a new SeriousGameTracker instance

### `initialized()`

Marks the game as started

**Returns** `StatementBuilder` — Promise that resolves when the start is recorded

### `pause()`

Marks the game as paused

**Returns** `StatementBuilder` — Promise that resolves when the pause is recorded

### `resumed()`

Marks the game as resumed

**Returns** `StatementBuilder` — Promise that resolves when the resume is recorded

### `terminated()`

Marks the game as finished

**Returns** `StatementBuilder` — Promise that resolves when the finish is recorded

### `trace(verbId, objectType, objectId)`

Creates a new statement builder

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `verbId` | `string` | The verb ID for the statement |
| `objectType` | `string` | The type of the object |
| `objectId` | `string` | The ID of the object |

**Returns** `StatementBuilder` — A new StatementBuilder instance

### `fromXAPI(statement)`

Creates a new statement builder from an xAPI statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `statement` | `Object` | The xAPI statement to create the builder from |

**Returns** `StatementBuilder` — A new StatementBuilder instance

### `gameObject(id, type = SERIOUSGAMESPROFILE.ACTIVITYTYPES.ITEM)`

Creates a game object tracker instance

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | Game object ID |
| `type` | `string` | Game object type Default: `SERIOUSGAMESPROFILE.ACTIVITYTYPES.ITEM`. |

**Returns** `GameObjectTracker` — New GameObjectTracker instance

### `completable(id, type = SERIOUSGAMESPROFILE.ACTIVITYTYPES.SERIOUS_GAME)`

Creates a completable tracker instance

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | Activity ID |
| `type` | `string` | Completable type Default: `SERIOUSGAMESPROFILE.ACTIVITYTYPES.SERIOUS_GAME`. |

**Returns** `CompletableTracker` — New CompletableTracker instance

### `alternative(id, type = ALL.ACTIVITYTYPES.ASSESSMENT)`

Creates an alternative tracker instance

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | Activity ID |
| `type` | `string` | Alternative type Default: `ALL.ACTIVITYTYPES.ASSESSMENT`. |

**Returns** `AlternativeTracker` — New AlternativeTracker instance

### `accessible(id, type = SERIOUSGAMESPROFILE.ACTIVITYTYPES.AREA)`

Creates an accessible tracker instance

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | Activity ID |
| `type` | `string` | Accessible type Default: `SERIOUSGAMESPROFILE.ACTIVITYTYPES.AREA`. |

**Returns** `AccessibleTracker` — New AccessibleTracker instance

### `trackerSettings`

The settings of a tracker, read before `start()`.

Type: `Object`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `generateSettingsFromURLParams` | `boolean` | `false` | Read the settings from the query parameters of the page |
| `oauth_type` | `string` | `"OAuth0"` | Which authentication to use: `OAuth0`, `OAuth1`, or `OAuth2` |
| `batch_mode` | `boolean` | `true` | Accepted for compatibility, the tracker always batches and has no other mode |
| `batch_endpoint` | `string` | `"http://myurl.com/endpoint"` | The LRS statements are sent to |
| `batch_length` | `number` | `100` | How many statements fill a batch, which is also the latency of sending one |
| `batch_timeout` | `number` | `msFn("30sec")` | How long a partial batch waits before it is sent, in milliseconds |
| `platform` | `string` | `"http://myhomepage.com"` | Homepage of the game, recorded in the context of every statement |
| `actor_name` | `string` | `"my_default_actor"` | Name of the account of the actor |
| `actor_homepage` | `string` | `''` | Homepage of the account service of the actor, when it is not the platform |
| `backup_mode` | `boolean` | `false` | Accepted for compatibility, a backup is sent whenever flush is called with it |
| `backup_endpoint` | `string` | `"http://myurl.com/backup-endpoint"` | Where a copy of the statements is sent |
| `backup_type` | `string` | `"XAPI"` | The form of that copy: `XAPI` or `CSV` |
| `default_uri` | `string` | `"mydefaulturi"` | Base for every id that is not already an absolute IRI |
| `max_retry_delay` | `number` | `msFn("2min")` | Ceiling of the retry backoff, in milliseconds |
| `debug` | `boolean` | `false` | Log every batch, and turn the warnings into thrown errors |
| `parent_activity_id` | `string` | `''` | Activity this content belongs to, added as the parent of every statement |
| `registration_id` | `string` | `''` | Registration that ties these statements to one attempt at some material |
| `parent_activity_type` | `string` | `ALL.ACTIVITYTYPES.LESSON` | Type of the parent activity |
| `category` | `string` | `''` | Category added to the context of every statement; a serious game defaults to the serious games category |
| `auth_token` | `string` | `''` | Token used when `oauth_type` is `OAuth0` |

### `oauth1`

The credentials used when `oauth_type` is `OAuth1`.

Type: `Object`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `username` | `string` | `"superusername"` | — |
| `password` | `string` | `"supersecret"` | — |

### `oauth2`

The settings used when `oauth_type` is `OAuth2`. The grant type is `password`, `refresh_token`, or `urn:ietf:params:oauth:grant-type:device_code`.

Type: `Object`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `token_endpoint` | `string` | `"https://.../token"` | Where the access token is requested |
| `grant_type` | `string` | `"password"` | `password`, `refresh_token`, or `urn:ietf:params:oauth:grant-type:device_code` |
| `client_id` | `string` | `"my_client_id"` | — |
| `client_secret` | `string` | `""` | Only for a confidential client |
| `scope` | `string` | `"openid profile"` | — |
| `state` | `string` | `""` | Only for the authorization code flow |
| `code_challenge_method` | `string` | `""` | Only `S256` is supported |
| `username` | `string` | `"alice@example.com"` | For the password grant |
| `password` | `string` | `"supersecret"` | For the password grant |
| `login_hint` | `string` | `"alice@example.com"` | Which account the provider should offer first |
| `device_authorization_endpoint` | `string` | `""` | Where the device code is requested, for the device_code grant |
| `poll_interval` | `number` | `null` | Seconds between polls of the token endpoint, for the device_code grant |
| `max_poll_attempts` | `number` | `null` | How many times to poll before giving up, for the device_code grant |
| `language` | `string` | `""` | Language of the device sign-in screen: `en`, `es`, or `fr` |

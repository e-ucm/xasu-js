# LRS statement builder

Reference for the builder `LRSTracker.trace()` returns. It extends the statement builder with the fields an LRS statement adds, such as the actor, the authority, and the stored timestamp, and with the setters of the envelope itself.
### `new Class(...)`

Constructor of LRSStatementBuilder

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiClient` | `xAPITrackerAsset` | the Tracker |
| `initial` | `object` | the initial statement |

### `statement`

Statement

### `withContextActivity(type, id, activityType)`

Adds a context activity to the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `type` | `STATEMENT.CONTEXT.ACTIVITIES` | The context activity type from STATEMENT_BUILDER_IDS.CONTEXT.ACTIVITIES |
| `id` | `string` | The IRI identifier of the context activity |
| `activityType` | `ALL.ACTIVITYTYPES\|string` | The activity type IRI |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withPlatform(platform)`

Add or set a platform to statement context

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `platform` | `string` | platform to set |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withActorAccount(accountName, accountHomePage)`

Sets the actor using an account identifier

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `accountName` | `string` | The account name |
| `accountHomePage` | `string` | The home page IRI of the account service provider |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withActorMbox(mbox)`

Sets the actor using an mbox (mailto URI)

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `mbox` | `string` | The mailto URI of the actor (e.g. 'mailto:user@example.com') |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withActorMboxSha1(mboxSha1)`

Sets the actor using an mbox SHA1 hash

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `mboxSha1` | `string` | The SHA1 hash of the actor's mbox URI |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withActorOpenID(openid)`

Sets the actor using an OpenID URI

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `openid` | `string` | The OpenID URI of the actor |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withAutorityAccount(accountName, accountHomePage)`

Sets the authority using an account identifier

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `accountName` | `string` | The account name |
| `accountHomePage` | `string` | The home page IRI of the account service provider |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withAutorityMbox(mbox)`

Sets the authority using an mbox (mailto URI)

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `mbox` | `string` | The mailto URI of the authority (e.g. 'mailto:lrs@example.com') |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withAutorityMboxSha1(mboxSha1)`

Sets the authority using an mbox SHA1 hash

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `mboxSha1` | `string` | The SHA1 hash of the authority's mbox URI |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withAutorityOpenID(openid)`

Sets the authority using an OpenID URI

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `openid` | `string` | The OpenID URI of the authority |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withStored(stored = new Date())`

Add or set the stored timestamp of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `stored` | `Date\|null` | The stored timestamp to set as an Date object or null (set to now) Default: `new Date()`. |

**Returns** `LRSStatementBuilder` — This builder instance for chaining

### `withActor(type, actor)`

Add or set an actor to the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `type` | `string` | The type of the actor |
| `actor` | `object` | The actor object |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withId(id)`

Sets the ID of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | The UUID to set as the statement ID |

**Returns** `StatementBuilder` — This builder instance for chaining

### `withVersion(version)`

Sets the version of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `version` | `string` | The version to set |

**Returns** `StatementBuilder` — This builder instance for chaining

### `withTimestamp(timestamp = new Date())`

Sets the timestamp of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `timestamp` | `Date\|null` | The timestamp to set as an Date object or null (set to now) Default: `new Date()`. |

**Returns** `StatementBuilder` — This builder instance for chaining

### `async send()`

Sends the built statement to the LRS

**Returns** `Promise<void>` — Promise that resolves when the statement has been sent

# Tracker asset

Reference for the asset underneath the tracker classes, which owns the queue, the retry logic, and the connection to the LRS. You rarely touch it directly: `tracker.tracker` holds it, and the tests use it to observe what would be sent.
## `xAPITrackerAsset`

XAPI Tracker Asset Class
Handles xAPI tracking with batch processing, retry logic, and backup capabilities

### `xapi`

XAPI Tracker instance

### `auth_token`

Authentication token for xAPI requests

### `online`

Current online status

### `connected`

Current connected status

### `started`

Current started status

### `statementsToSend`

Queue of statements to be sent

### `sendingInProgress`

Flag indicating if sending is currently in progress

### `offset`

Current offset in the statements queue

### `backupRequestParameters`

Additional parameters for backup requests

### `actor`

Actor statement object

### `context`

Context statement object

### `context_without_parent`

Context statement without parent object

### `retryDelay`

Current retry delay in milliseconds

### `timer`

Timer reference for batch processing

### `new Class(...)`

Creates an instance of xAPITrackerAsset

### `logout()`

Logs out the current session by clearing the authentication token

### `async login()`

Updates the authentication configuration

### `async refreshAuth()`

Refreshes the authentication token

**Returns** `Promise<void>`

### `trace(verbId, objectType, objectId, context = this.context, lrs = false)`

Creates a new statement builder

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `verbId` | `string` | The verb ID for the statement |
| `objectType` | `string` | The type of the object |
| `objectId` | `string` | The ID of the object |

**Returns** `StatementBuilder` — A new StatementBuilder instance

### `fromXAPI(statement, lrs = false)`

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `statement` | `Object` | — |
| `lrs` | `boolean` | — Default: `false`. |

**Returns** `StatementBuilder\|LRSStatementBuilder`

### `async enqueue(statement)`

Adds a statement to the queue and starts processing if needed

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `statement` | `Statement` | The statement to enqueue |

**Returns** `Promise<void>`

### `async flush(withBackup = false)`

Flushes the statement queue

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `opts` | `Object` | Options object |
| `opts.withBackup` | `boolean` | Whether to also send to backup endpoint Default: `false`. |

**Returns** `Promise<void>` — Promise that resolves when flushing is complete

### `getXAPIClient()`

Gets the XAPI client

**Returns** `XAPI` — The XAPI client

### `settings`

The settings of the asset. They are not read from here: a tracker assigns its own `trackerSettings` to this field when it starts, so the list is the same as [`trackerSettings`](trackers.md#trackersettings).

Type: `Object`

| Name | Type | Default | Description |
| --- | --- | --- | --- |
| `batch_mode` | `boolean` | `true` | — |
| `batch_endpoint` | `string` | `"http://myurl.com/endpoint"` | — |
| `batch_length` | `number` | `100` | — |
| `batch_timeout` | `number` | `msFn("30sec")` | — |
| `platform` | `string` | `"http://myhomepage.com"` | — |
| `actor_name` | `string` | `"my_default_actor"` | — |
| `actor_homepage` | `string` | `""` | — |
| `backup_mode` | `boolean` | `false` | — |
| `backup_endpoint` | `string` | `"http://myurl.com/backup-endpoint"` | — |
| `backup_type` | `string` | `"XAPI"` | — |
| `default_uri` | `string` | `"mydefaulturi"` | — |
| `max_retry_delay` | `number` | `msFn("2min")` | — |
| `debug` | `boolean` | `false` | — |
| `parent_activity_id` | `string` | `''` | — |
| `registration_id` | `string` | `''` | — |
| `parent_activity_type` | `string` | `ALL.ACTIVITYTYPES.LESSON` | — |

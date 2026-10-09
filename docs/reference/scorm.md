# SCORM

Reference for the SCORM tracker. `XasuScormTracker` wraps the base tracker with a factory that holds one instance per SCORM activity, and the statements of those instances carry the parent activity of the content they came from.
## `ScormTracker`

Scorm Tracker

### `new Class(...)`

Constructor of Scorm Tracker

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `tracker` | `xAPITrackerAsset` | the Tracker |
| `id` | `string` | the id of the Scorm object |
| `type` | `string` | the type of the Scorm object Default: `SCORMPROFILE.ACTIVITYTYPES.LESSON`. |
| `context` | `ContextStatement` | the context statement of the Scorm object Default: `tracker.context`. |

### `ScormId`

the id of the Scorm object

### `Type`

the type of the Scorm object

### `Tracker`

the Tracker of the Scorm object

### `IsInitialized`

is initialized

### `InitializedTime`

Initialized Time

### `initialized()`

Send Initialized statement

**Returns** `StatementBuilder`

### `suspended()`

Send Suspended statement

**Returns** `StatementBuilder`

### `resumed()`

Send Resumed statement

**Returns** `StatementBuilder`

### `terminated()`

Send Terminated statement

**Returns** `StatementBuilder`

### `passed()`

Send Passed statement

**Returns** `StatementBuilder`

### `failed()`

Send Failed statement

**Returns** `StatementBuilder`

### `scored(score)`

Send Scored statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `score` | `number` | the score of the Scorm object |

**Returns** `StatementBuilder`

### `completed(success, completion, score)`

Send Completed statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `success` | `boolean` | the success status of the Scorm object |
| `completion` | `boolean` | the completion status of the Scorm object |
| `score` | `number` | the score of the Scorm object |

**Returns** `StatementBuilder`

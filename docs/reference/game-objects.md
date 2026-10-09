# Game objects

Reference for the four kinds of game object a serious game is built from, and for the type constants each kind accepts. Each class holds one instance per id and type, which is what lets a completable remember whether it was initialized.
## `CompletableTracker`

Completable Tracker

### `new Class(...)`

Constructor of completable Tracker

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `tracker` | `xAPITrackerAsset` | the Tracker |
| `id` | `string` | the id of the completable object |
| `type` | `string` | the Type of the completable object |

### `CompletableId`

the id of the completable object

### `Type`

the Type of the completable object

### `Tracker`

the Tracker of the completable object

### `IsInitialized`

is initialized

### `InitializedTime`

Initialized Time

### `initialized()`

Send Initialized statement

**Returns** `StatementBuilder`

### `progressed(progress)`

Send Progressed statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `progress` | `number` | the progress of the completable object |

**Returns** `StatementBuilder`

### `completed(success, completion, score)`

Send Completed statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `success` | `boolean` | the success status of the completable object |
| `completion` | `boolean` | the completion status of the completable object |
| `score` | `number` | the score of the completable object |

**Returns** `StatementBuilder`

### `COMPLETABLETYPE`

The activity types a completable accepts, passed as the second argument of `completable()`.

| Key | IRI |
| --- | --- |
| `GAME` | `https://w3id.org/xapi/seriousgames/activity-types/serious-game` |
| `LEVEL` | `https://w3id.org/xapi/seriousgames/activity-types/level` |
| `QUEST` | `https://w3id.org/xapi/seriousgames/activity-types/quest` |
| `SESSION` | `https://w3id.org/xapi/seriousgames/activity-types/session` |
| `STAGE` | `https://w3id.org/xapi/seriousgames/activity-types/stage` — not in the profile server |
| `COMBAT` | `https://w3id.org/xapi/seriousgames/activity-types/combat` — not in the profile server |
| `STORYNODE` | `https://w3id.org/xapi/seriousgames/activity-types/story-node` — not in the profile server |
| `RACE` | `https://w3id.org/xapi/seriousgames/activity-types/race` — not in the profile server |
| `COMPLETABLE` | `https://w3id.org/xapi/seriousgames/activity-types/completable` — not in the profile server |
| `DIALOGNODE` | `https://w3id.org/xapi/seriousgames/activity-types/dialog-node` — not in the profile server |
| `DIALOGFRAGMENT` | `https://w3id.org/xapi/seriousgames/activity-types/dialog-fragment` — not in the profile server |

## `AccessibleTracker`

Accessible Tracker

### `new Class(...)`

Constructor of accessible tracker

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `tracker` | `xAPITrackerAsset` | the tracker |
| `id` | `string` | the id of the accessible object |
| `type` | `string` | the type of the accessible object Default: `ALL.ACTIVITYTYPES.AREA`. |

### `AccessibleId`

the id of the accessible object

### `Type`

the type of the accessible object

### `Tracker`

the tracker of the accessible object

### `accessed()`

Send Accessed statement

**Returns** `StatementBuilder`

### `skipped()`

Send Skipped statement

**Returns** `StatementBuilder`

### `ACCESSIBLETYPE`

The activity types an accessible accepts, passed as the second argument of `accessible()`.

| Key | IRI |
| --- | --- |
| `SCREEN` | `https://w3id.org/xapi/seriousgames/activity-types/screen` |
| `AREA` | `https://w3id.org/xapi/seriousgames/activity-types/area` |
| `ZONE` | `https://w3id.org/xapi/seriousgames/activity-types/zone` |
| `CUTSCENE` | `https://w3id.org/xapi/seriousgames/activity-types/cutscene` |
| `INVENTORY` | `https://w3id.org/xapi/seriousgames/custom-types/inventory` |
| `ACCESSIBLE` | `https://w3id.org/xapi/seriousgames/activity-types/accessible` — not in the profile server |

## `AlternativeTracker`

Accessible Tracker

### `new Class(...)`

Constructor of accessible tracker

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `tracker` | `xAPITrackerAsset` | the tracker |
| `id` | `string` | the id of the accessible object |
| `type` | `string` | the type of the accessible object Default: `SERIOUSGAMEPROFILE.ACTIVITYTYPES.ALTERNATIVE`. |

### `AlternativeId`

the id of the alternative object

### `Type`

the type of the alternative object

### `Tracker`

the tracker of the alternative object

### `selected(optionId)`

Send selected statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `optionId` | `string` | the optionId of the selected statement |

**Returns** `StatementBuilder`

### `unlocked(optionId)`

Send unlocked statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `optionId` | `string` | the optionId of the Unlocked statement |

**Returns** `StatementBuilder`

### `ALTERNATIVETYPE`

The activity types an alternative accepts, passed as the second argument of `alternative()`.

| Key | IRI |
| --- | --- |
| `QUESTION` | `http://adlnet.gov/expapi/activities/question` |
| `MENU` | `https://w3id.org/xapi/seriousgames/activity-types/menu` |
| `DIALOG` | `https://w3id.org/xapi/seriousgames/activity-types/dialog-tree` |
| `PATH` | `https://w3id.org/xapi/seriousgames/activity-types/path` |
| `ARENA` | `https://w3id.org/xapi/seriousgames/activity-types/arena` — not in the profile server |
| `ALTERNATIVE` | `https://w3id.org/xapi/seriousgames/activity-types/alternative` — not in the profile server |

## `GameObjectTracker`

Game Object Tracker

### `new Class(...)`

Constructor of Game Object tracker

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `tracker` | `xAPITrackerAsset` | the tracker |
| `id` | `string` | the id of the Game Object object |
| `type` | `string` | the Type of the Game Object object Default: `SERIOUSGAMEPROFILE.ACTIVITYTYPES.GAMEOBJECT`. |

### `GameobjectId`

the id of the Game Object object

### `Type`

the Type of the Game Object object

### `tracker`

the Trackerof the Game Object object

### `interacted()`

Send Interacted statement

**Returns** `StatementBuilder`

### `used()`

Send Used statement

**Returns** `StatementBuilder`

### `GAMEOBJECTTYPE`

The activity types a game object accepts, passed as the second argument of `gameObject()`.

| Key | IRI |
| --- | --- |
| `ENEMY` | `https://w3id.org/xapi/seriousgames/activity-types/enemy` |
| `NPC` | `https://w3id.org/xapi/seriousgames/activity-types/non-player-character` |
| `ITEM` | `https://w3id.org/xapi/seriousgames/activity-types/item` |
| `GAMEOBJECT` | `https://w3id.org/xapi/seriousgames/activity-types/game-object` |

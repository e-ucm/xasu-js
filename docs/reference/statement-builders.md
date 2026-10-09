# Statement builders

Reference for the builders that every tracking method returns. A builder describes a statement: nothing reaches the tracker until you call `send()`. Each setter returns the builder, so they chain. `toXAPI()` returns the statement as it would be sent, without queueing it, which is the safest way to inspect one.
## `StatementBuilder`

Statement Builder Class

### `client`

XAPI Client

### `statement`

Statement

### `_sendPromise`

Promise of Statement sent

### `new Class(...)`

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiClient` | `xAPITrackerAsset` | any client that has a `.sendStatement(statement)` → Promise |
| `initial` | `Statement` | a partial Statement (actor, verb, object…) |

### `withSuccess(success)`

Set success to statemement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `success` | `boolean` | — |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withScore(score)`

Sets score-related properties to statemement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `score` | `Partial<{raw: number; min: number; max: number; scaled: number}>` | Score configuration |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withScoreRaw(raw)`

Set raw score to statemement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `raw` | `number` | the raw score value |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withScoreMin(min)`

Set min score to statemement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `min` | `number` | the min score value |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withScoreMax(max)`

Set max score to statemement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `max` | `number` | the max score value |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withScoreScaled(scaled)`

Set scaled score to statemement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `scaled` | `number` | the scaled score value |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withCompletion(value)`

Set completion status to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `value` | `boolean` | completion status of statement |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withDuration(init, end)`

Set duration to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `init` | `Date` | init date of statement |
| `end` | `Date` | end date of statement |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withResponse(value)`

Set response to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `value` | `string` | response of statement |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withProgress(value)`

Set progress to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `value` | `number` | progress of statement |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withResultExtension(key, value)`

Add result extension to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `key` | `ALL.RESULTEXTENSION\|string` | key of the result extension |
| `value` | `*` | value of the result extension |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withResultExtensions(extensions = {})`

Add result extensions as Object key/values list of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `extensions` | `Object` | extensions list Default: `{}`. |

### `withContextLanguage(language)`

Set context language to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `language` | `string` | language of statement |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withContextPlatform(platform)`

Set context platform to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `platform` | `string` | platform of statement |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withContextExtension(key, value)`

Add context extension to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `key` | `ALL.CONTEXTEXTENSION\|string` | key of the context extension |
| `value` | `*` | value of the context extension |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withContextActivity(type, activityId, activityType)`

Add context activity to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `type` | `STATEMENT.CONTEXT.ACTIVITIES` | — |
| `activityId` | `string` | — |
| `activityType` | `ALL.ACTIVITYTYPES\|string` | — |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withContextCategory(categoryId)`

Add context category to statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `categoryId` | `ALL.CATEGORYID` | — |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withVerbDisplay(lang, display)`

Add or set a verb display

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `lang` | `string` | — |
| `display` | `string` | — |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withObjectDefinitionsName(lang, list)`

Add or set a name of the Object definition

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `lang` | `string` | — |
| `list` | `Set<string>` | list of the Object definition names |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withObjectDefinitionsDescription(lang, list)`

Add or set a description of the Object definition

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `lang` | `string` | — |
| `list` | `Set<string>` | list of the Object definition descriptions |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withObjectDefinitionName(lang, name)`

Add or set a name of the Object definition

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `lang` | `string` | — |
| `name` | `string` | name of the Object definition |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withObjectDefinitionDescription(lang, description)`

Add or set a description of the Object definition

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `lang` | `string` | — |
| `description` | `string` | description of the Object definition |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withObjectExtension(key, value)`

Add object/activity extension to statement object definition

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `key` | `ALL.ACTIVITYEXTENSION\|string` | key of the object extension |
| `value` | `*` | value of the object extension |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withObjectExtensions(extensions = {})`

Add object/activity extensions as Object key/values list

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `extensions` | `Object` | extensions list Default: `{}`. |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withInteractionWithLang(type, id, lang, description)`

Add or set an interaction component with language support (for interaction activities)

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `type` | `string` | One of 'choices', 'scale', 'source', 'target', 'steps' |
| `id` | `string` | The identifier for the component |
| `lang` | `string` | The language code (e.g., 'en') |
| `description` | `string` | The description in the given language |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withInteractionType(type)`

Add or set an interaction type for interaction activities

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `type` | `string` | interaction type to set |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withCorrectResponsesPattern(pattern)`

Add or set a correct responses pattern for interaction activities

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `pattern` | `string\|string[]` | correct responses pattern(s) to add |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withAttachment(attachment)`

Add one xAPI attachment to the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `attachment` | `AttachmentStatement\|Object` | Attachment instance or plain attachment object |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `withAttachments(attachments = [])`

Add multiple xAPI attachments to the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `attachments` | `Array<AttachmentStatement\|Object>` | List of attachments Default: `[]`. |

**Returns** `StatementBuilder` — Returns the current instance for chaining

### `toXAPI()`

Convert the built statement to xAPI format

**Returns** `Object` — The xAPI statement object

### `async send()`

Sends a statement to the queue and returns a promise that resolves when the statement is processed.

**Returns** `Promise` — The promise sent

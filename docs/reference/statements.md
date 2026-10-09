# Statements

Reference for the statement classes. A statement is the object that becomes an xAPI payload: `toXAPI()` renders it, `toCSV()` renders the compact form used by the CSV backup, and `fromXAPI` reads one back. These classes are what the builders drive, and they are the layer to look at if a statement is missing a part you set.
## `Statement`

Statement class

### `new Class(...)`

Constructor of the Statement class

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `actor` | `ActorStatement` | actor of the statement |
| `verbId` | `ALL.VERBS\|string` | verb id of the statement |
| `objectId` | `string` | object id of the statement |
| `objectType` | `ALL.ACTIVITYTYPES\|string` | object Type of the statement |
| `context` | `ContextStatement` | context of the statement |
| `defaultURI` | `string` | default URI for the statement construction |

### `static fromObject(statementObj)`

Create a Statement from a plain object (copy-constructor)

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `statementObj` | `Object` | — |

**Returns** `Statement`

### `id`

Id of the statement

### `version`

Version of the statement

### `defaultURI`

default URI of the statement

### `actor`

Actor of the statement

### `verb`

Verb of the statement

### `object`

Object of the statement

### `timestamp`

Timestamp of the statement

### `context`

Context of the statement

### `result`

Result of the statement

### `attachments`

Attachments associated with the statement

### `toXAPI()`

Convert to xAPI format

**Returns** `Object`

### `static fromXAPI(xapiObj, baseURI, platform = null)`

Create a Statement from an xAPI object

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiObj` | `Object` | — |
| `baseURI` | `string` | default URI for the statement construction (optional) |

**Returns** `Statement`

### `toCSV()`

Convert to CSV format

**Returns** `String`

Extends `Statement`.

## `LRSStatement`

Statement class

### `new Class(...)`

Constructor of the Statement class

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `actor` | `ActorStatement` | actor of the statement |
| `verbId` | `ALL.VERBS\|string` | verb id of the statement |
| `objectId` | `string` | object id of the statement |
| `objectType` | `ALL.ACTIVITYTYPES\|string` | object Type of the statement |
| `context` | `ContextStatement` | context of the statement |
| `defaultURI` | `string` | default URI for the statement construction |

### `stored`

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `stored` | `string` | — |

### `authority`

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `authority` | `ActorStatement` | — |

### `toXAPI()`

Convert to xAPI format

**Returns** `Object` — xAPI statement object

### `static fromXAPI(xapiObj, baseURI, platform = null)`

Create a Statement from an xAPI object

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiObj` | `Object` | — |
| `baseURI` | `string` | default URI for the statement construction (optional) |
| `platform` | `string` | platform for the statement construction (optional) Default: `null`. |

**Returns** `LRSStatement` — A new LRSStatement instance created from the xAPI object

### `toCSV()`

Convert to CSV format

**Returns** `String`

## `ActorStatement`

Actor Class of a Statement (xAPI Agent or Group)

### `new Class(...)`

Create an Agent or Group
- objectType: "Agent" | "Group" (default: "Agent")
- name: string (optional)
- mbox: string (optional, mailto:...)
- mbox_sha1sum: string (optional)
- openid: string (optional)
- account: { homePage: string, name: string } (optional)
- member: ActorStatement[] (for Group)

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `options` | `Object` | — Default: `{}`. |

### `setActor(type, actorData)`

Set actor properties with validation

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `type` | `STATEMENT.ACTOR.AGENTTYPE\|STATEMENT.ACTOR.GROUPTYPE` | one of name, mbox, mbox_sha1sum, openid, account, member |
| `actorData` | `Object\|Array\|String` | data for the specified type |

### `isEmpty()`

Check if the ActorStatement is empty (no identifying properties)

**Returns** `boolean`

### `static fromXAPI(xapiObj)`

Create an ActorStatement from xAPI Agent or Group object

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiObj` | `Object` | — |

**Returns** `ActorStatement`

### `toXAPI()`

Convert to xAPI Agent or Group object

**Returns** `Object`

### `toCSV()`

Convert to CSV (uses name or account name)

**Returns** `String`

## `VerbStatement`

The Verb Class  of a Statement

### `new Class(...)`

Constructor of VerbStatement class

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `ALL.VERBS\|string` | The verb id of the statement |
| `baseURI` | `string` | The base URI for the statement |

### `id`

The Verb Id

### `display`

The Verb display

### `addDisplay(lang, display)`

Add or set a verb display

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `lang` | `string` | — |
| `display` | `string` | — |

### `toXAPI()`

convert to XAPI

**Returns** `Object`

### `toCSV()`

convert to CSV

**Returns** `String`

### `static fromXAPI(xapiObj, baseURI)`

Create a VerbStatement from xAPI verb object

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiObj` | `Object` | — |
| `baseURI` | `string` | Optional base URI to resolve relative IDs |

**Returns** `VerbStatement`

## `ObjectStatement`

The Object Class of a Statement

### `new Class(...)`

The constructor of the ObjectStatement class

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | the id of the object |
| `type` | `ALL.ACTIVITYTYPES\|string` | the type of the object |
| `baseURI` | `string` | the base URI for the object construction |
| `language` | `string` | the language for the name and description (default: "en") Default: `"en"`. |
| `name` | `string` | the name of the object Default: `null`. |
| `description` | `string` | the description of the object Default: `null`. |

### `id`

The ID of the Object

### `definitionType`

The type of the Object

### `definitionName`

The name of the Object

### `definitionDescription`

The description of the Object

### `definitionExtensions`

The extensions of the Object definition

### `defaultURI`

default URI for the object construction

### `setObjectDefinitionName(lang, name)`

Set the name of the Object definition

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `lang` | `string` | The language code |
| `name` | `string` | The name of the Object definition |

### `setObjectDefinitionDescription(lang, description)`

Set the description of the Object definition

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `lang` | `string` | The language code |
| `description` | `string` | The description of the Object definition |

### `setExtensions(ext)`

Set the extensions of the Object definition

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `ext` | `Object` | extensions object |

### `setExtension(key, value)`

Add or set a single extension key-value pair in the Object definition

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `key` | `ALL.ACTIVITYEXTENSION\|string` | extension key |
| `value` | `any` | extension value |

### `toXAPI()`

Convert to xAPI object, including interaction activities if set

**Returns** `Object`

### `toCSV()`

convert to CSV

**Returns** `String`

### `static fromXAPI(xapiObj, baseURI)`

Create an ObjectStatement from xAPI object

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiObj` | `Object` | — |
| `baseURI` | `string` | Optional base URI to resolve relative IDs |

**Returns** `ObjectStatement`

Extends `ObjectStatement`.

## `InteractionObjectStatement`

The Object Class of a Statement

### `correctResponsesPattern`

The correctResponsesPattern property for interaction activities.
Internally it is always handled as an array of strings.

### `interactionType`

The interactionType property for interaction activities (e.g., 'choice', 'fill-in', 'long-fill-in', 'matching', 'performance', 'sequencing', 'likert', 'numeric', 'other')

### `choices`

The choices, scale, source, target, and steps properties for interaction activities, which are arrays of objects with id and description
Each item in choices/scale should be an object with an 'id' and a 'description' that can be a string or an object with language keys

### `scale`

The scale property for interaction activities, which is an array of objects with id and description

### `source`

The source property for interaction activities, which is an array of objects with id and description

### `target`

The target property for interaction activities, which is an array of objects with id and description

### `steps`

The steps property for interaction activities, which is an array of objects with id and description

### `new Class(...)`

Constructor for InteractionObjectStatement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `objectId` | `string` | The identifier of the object (IRI or UUID) |
| `objectType` | `string` | The type of the object (IRI) |
| `defaultURI` | `string` | The default base URI to resolve relative IDs |

### `setInteractionType(interactionType, debug = false)`

Set the interactionType for interaction activities

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `interactionType` | `STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES` | — |

### `addCorrectResponsesPattern(pattern)`

Set the correctResponsesPattern array

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `pattern` | `string\|string[]` | — |

### `addInteractionWithLang(componentType, id, lang, description)`

Add a single choice with language support (for interaction activities)

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `componentType` | `STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES` | One of 'choices', 'scale', 'source', 'target', 'steps' |
| `id` | `string` | The identifier for the choice |
| `lang` | `string` | The language code (e.g., 'en') |
| `description` | `string` | The description in the given language |

### `static fromXAPI(xapiObj, baseURI)`

Create an InteractionObjectStatement from xAPI object

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiObj` | `Object` | — |
| `baseURI` | `string` | Optional base URI to resolve relative IDs |

**Returns** `InteractionObjectStatement`

## `ResultStatement`

The Result Class of a Statement

### `new Class(...)`

Constructor of the ResultStatement class

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `defaultURI` | `string` | The default URI for the extensions |

### `defaultURI`

The ID of the Result

### `Score`

The Score of the Result

### `Success`

The success status of the Result

### `Completion`

The Completion status of the Result

### `Response`

The response of the Result

### `Duration`

The duration of the Result

### `Extensions`

The Extensions of the Result

### `isEmpty()`

Check if the result is empty or not

**Returns** `boolean`

### `setExtensions(extensions)`

Set extensions from list

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `extensions` | `Object` | extension list |

### `setExtension(key, value)`

Set result extension for key value

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `key` | `ALL.RESULTEXTENSION\|string` | the key of the extension |
| `value` | `*` | the value of the extension |

### `setScoreValue(key, value)`

Set the score of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `key` | `string` | the key for the score |
| `value` | `number\|string` | the score, a numeric string is accepted |

### `setScore(raw, min, max, scaled)`

Set the score of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `raw` | `number` | the raw score |
| `min` | `number` | the min score |
| `max` | `number` | the max score |
| `scaled` | `number` | the scaled score |

### `setScoreRaw(raw)`

Set the raw score of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `raw` | `number` | the raw score |

### `setScoreMin(min)`

Set the min score of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `min` | `number` | the min score |

### `setScoreMax(max)`

Set the max score of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `max` | `number` | the max score |

### `setScoreScaled(scaled)`

Set the scaled score of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `scaled` | `number` | the scaled score |

### `setCompletion(value)`

Set completion status of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `value` | `boolean` | the completion status |

### `setSuccess(value)`

Set success status of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `value` | `boolean` | the success status |

### `setDuration(init, end)`

Set duration of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `init` | `Date` | init date of statement |
| `end` | `Date` | end date of statement |

### `setResponse(value)`

Set response of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `value` | `string` | the response |

### `setProgress(value)`

Set progress status of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `value` | `number` | the progress status |

### `setVar(key, value)`

Set result extension for key of the statement

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `key` | `ALL.RESULTEXTENSION\|string` | the key of the extension |
| `value` | `string` | the value of the extension |

### `toXAPI()`

convert to XAPI

**Returns** `Object`

### `static fromXAPI(xapiObj, baseURI)`

Create a ResultStatement from xAPI result object

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiObj` | `Object` | — |
| `baseURI` | `string` | — |

**Returns** `ResultStatement`

### `toCSV()`

convert to CSV

**Returns** `String`

## `ContextStatement`

The Context Class of a Statement

### `new Class(...)`

Constructor of the ContextStatement class

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `base` | `string` | default URI for the context construction |
| `platform` | `string` | platform of context |
| `registrationId` | `string` | registration id of context Default: `null`. |

### `addCategory(categoryId)`

Add a category to the context

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `categoryId` | `ALL.CATEGORYID` | — |

### `defaultURI`

default URI for the context construction

### `registration`

Registration Id of the Context

### `platform`

Platform of the Context

### `language`

Language of the Context

### `extensions`

Extensions of the Context

### `contextActivities`

Context Activities (parent, grouping, category, other)

### `addContextActivity(type, activity, activityType)`

Add or set a context activity

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `type` | `STATEMENT.CONTEXT.ACTIVITIES` | — |
| `activity` | `ObjectStatement\|ObjectStatement[]\|string` | activity object(s) or activity id |
| `activityType` | `string` | — |

### `static normalizeContextActivities(input)`

Normalize the context activities of a statement.
The xAPI specification defines contextActivities as an object whose keys are the relations
(parent, grouping, category, other) and whose values are arrays of activities. An array is
therefore malformed: adding a relation to it attaches a string key to the array, which every
serialization drops, so the activities silently disappear. A single object is accepted by
xAPI 2.0 where 1.0.3 requires an array, so it is wrapped instead of rejected.
A relation may hold Activity Objects or, for grouping, category and other, plain IRIs, so
IRIs are kept for those relations while parent, which only accepts Activity Objects, and any
value that cannot be an activity are discarded.

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `input` | `Object` | the context activities to normalize |

**Returns** `Object` — an object whose keys are relations and whose values are arrays of activities

### `toXAPI()`

convert to XAPI

**Returns** `Object`

### `setExtensions(ext)`

Set the extensions of the Context

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `ext` | `Object` | extensions object |

### `setPlatform(platform)`

Set the platform of the Context

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `platform` | `string` | platform string |

### `setExtension(key, value)`

Add or set a single extension key-value pair

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `key` | `ALL.CONTEXTEXTENSION\|string` | extension key |
| `value` | `any` | extension value |

### `clone()`

Clone the ContextStatement instance

**Returns** `ContextStatement` — shallow copy of the ContextStatement instance

### `toCSV()`

convert to CSV

**Returns** `String`

### `static fromXAPI(xapiObj, baseURI, platform = null, language = null)`

Create a ContextStatement from xAPI context object

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiObj` | `Object` | — |
| `baseURI` | `string` | Optional base URI to resolve relative IDs |

**Returns** `ContextStatement`

## `AttachmentStatement`

xAPI Attachment object (5.2.2.6)

### `new Class(...)`

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `usageType` | `string` | IRI that identifies attachment usage |
| `display` | `Object<string,string>` | Language map title |
| `contentType` | `string` | Internet media type |
| `length` | `number` | Content length in octets |
| `sha2` | `string` | SHA-2 hash of content |
| `defaultURI` | `string` | Base URI used if usageType is not absolute Default: `""`. |

### `display`

usageType;

### `contentType`

description;

### `sha2`

length;

### `defaultURI`

fileUrl;

### `setDescription(description)`

Sets the attachment description language map

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `description` | `Object<string,string>` | — |

**Returns** `AttachmentStatement`

### `setFileUrl(fileUrl)`

Sets file URL where the attachment can be fetched

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `fileUrl` | `string` | IRL/URL of the attachment |

**Returns** `AttachmentStatement`

### `isValid()`

Validate required xAPI attachment fields

**Returns** `boolean`

### `toXAPI()`

Serialize attachment to xAPI object

**Returns** `Object`

### `static fromXAPI(xapiObj, baseURI = "")`

Creates an AttachmentStatement from xAPI object

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `xapiObj` | `Object` | — |
| `baseURI` | `string` | — Default: `""`. |

**Returns** `AttachmentStatement`

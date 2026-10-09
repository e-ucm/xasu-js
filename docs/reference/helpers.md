# Helpers

Reference for the small utilities the statements are built on. They are exported, and are worth knowing about if you build your own statement types.
### `setAsUri(id, base)`

Set as URI if it is not an URI already

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | the id of the part of the statement |
| `base` | `string` | the base URI to use if id is not an URI |

**Returns** `String`

### `isUri(id)`

Check if the string is an URI

**Parameters**

| Name | Type | Description |
| --- | --- | --- |
| `id` | `string` | — |

**Returns** `boolean`

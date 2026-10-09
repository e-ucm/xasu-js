import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const OUT_DIR = path.join(ROOT, "docs", "reference");

/**
 * Reads a source file
 * @param {string} relativePath the path of the file, relative to the project root
 * @returns {string} the contents of the file
 */
function read(relativePath) {
	return fs.readFileSync(path.join(ROOT, relativePath), "utf8");
}

/**
 * Splits the parameters of a signature, ignoring the commas nested in brackets, braces and
 * parentheses, since a parameter default may hold any of them
 * @param {string} text the parameter list of a signature, without its parentheses
 * @returns {string[]} the individual parameters
 */
function splitParams(text) {
	const params = [];
	let depth = 0;
	let current = "";
	for (const char of text) {
		if (char === "(" || char === "{" || char === "[" || char === "<") depth++;
		if (char === ")" || char === "}" || char === "]" || char === ">") depth--;
		if (char === "," && depth === 0) {
			params.push(current.trim());
			current = "";
		} else {
			current += char;
		}
	}
	if (current.trim()) params.push(current.trim());
	return params;
}

/**
 * Reads the parameter list that follows the opening parenthesis of a declaration
 * @param {string} line the line of the declaration
 * @returns {Object} the parameter names and their default expressions
 */
function readSignature(line) {
	const open = line.indexOf("(");
	if (open === -1) return { params: [], close: -1 };

	let depth = 0;
	for (let i = open; i < line.length; i++) {
		const char = line[i];
		if (char === "(") depth++;
		if (char === ")") {
			depth--;
			if (depth === 0) {
				const params = splitParams(line.slice(open + 1, i)).map(readParam);
				return { params, close: i };
			}
		}
	}
	return { params: [], close: -1 };
}

/**
 * Turns the JSDoc of a member into the parts the reference needs
 * @param {string[]} block the lines of the JSDoc block, without its delimiters
 * @returns {Object} the parsed JSDoc
 */
function parseJsdoc(block) {
	const doc = {
		description: [],
		params: [],
		returns: [],
		throws: [],
		properties: [],
		typedefName: null,
		isOverload: false
	};
	let current = null;

	for (const rawLine of block) {
		const line = rawLine.replace(/^\s*\*ial?\s?/, "").replace(/^\s*\*ial?\s?/, "").replace(/^\s*\*\s?/, "").trimEnd();
		if (line.trim() === "") {
			if (current) {
				doc[current.kind].push({ ...current, description: current.description.join(" ").trim() });
				current = null;
			}
			continue;
		}

		const tag = /^@(\w+)\s*([\s\S]*)$/.exec(line.trim());
		if (!tag) {
			if (!current) {
				doc.description.push(line.trim());
			} else {
				current.description.push(line.trim());
			}
			continue;
		}

		if (current) {
			doc[current.kind].push({ ...current, description: current.description.join(" ").trim() });
			current = null;
		}

		const [, name, rest] = tag;
		const { type, remainder } = splitType(rest);

		switch (name) {
			case "param": {
				const parsed = splitName(rest, remainder);
				doc.params.push({
					type,
					name: parsed.name,
					description: parsed.description,
					optional: parsed.optional
				});
				break;
			}
			case "property": {
				const parsed = splitName(rest, remainder);
				doc.properties.push({
					type,
					name: parsed.name,
					description: parsed.description,
					optional: parsed.optional
				});
				break;
			}
			case "returns":
			case "return": {
				current = { kind: "returns", type, description: [remainder] };
				break;
			}
			case "throws": {
				current = { kind: "throws", type, description: [remainder] };
				break;
			}
			case "typedef": {
				const match = /^\{[\s\S]*\}\s*(\S+)/.exec(rest);
				doc.typedefName = match ? match[1] : null;
				break;
			}
			case "overload":
				doc.isOverload = true;
				break;
			case "default": {
				const match = /^\{[\s\S]*\}\s*([\s\S]*)$/.exec(rest);
				doc.defaultValue = match ? match[1].trim() : rest.trim();
				break;
			}
			default:
				break;
		}
	}

	if (current) {
		doc[current.kind].push({ ...current, description: current.description.join(" ").trim() });
	}

	return doc;
}

/**
 * Splits a `{type}` out of a tag body, allowing the type to hold nested braces
 * @param {string} text the body of the tag
 * @returns {Object} the type and whatever followed it
 */
function splitType(text) {
	if (!text.startsWith("{")) return { type: "", remainder: text.trim() };
	let depth = 0;
	for (let i = 0; i < text.length; i++) {
		if (text[i] === "{") depth++;
		if (text[i] === "}") {
			depth--;
			if (depth === 0) return { type: text.slice(1, i), remainder: text.slice(i + 1).trim() };
		}
	}
	return { type: text.slice(1), remainder: "" };
}

/**
 * Splits `name - description` out of the body of a `@param` or `@property`
 * @param {string} rest the type that was already read out of the tag, or the whole body
 * @param {string} remainder whatever followed the type
 * @returns {Object} the name, the type and the description
 */
function splitName(rest, remainder) {
	let body = (remainder || rest).trim();

	// the description follows a dash, which may sit inside the brackets of an optional parameter
	let description = "";
	const dash = body.indexOf(" - ");
	if (dash !== -1) {
		description = body.slice(dash + 3).trim();
		body = body.slice(0, dash).trim();
	}

	let optional = false;
	if (body.startsWith("[")) {
		optional = true;
		const close = body.indexOf("]");
		if (close !== -1) body = body.slice(1, close);
	}

	const eq = body.indexOf("=");
	if (eq !== -1) body = body.slice(0, eq).trim();

	// the name is followed either by a dash or by the description straight away
	const name = /^[\w$.]+/.exec(body.trim());
	if (name) {
		body = body.trim();
		if (!description && body.length > name[0].length) {
			description = body.slice(name[0].length).trim().replace(/^-\s*/, "");
		}
		body = name[0];
	}

	return { type: "", name: body, description, optional };
}

/**
 * Finds every JSDoc block and the member it documents
 * @param {string} source the contents of a source file
 * @returns {Object[]} the documented members
 */
function parseMembers(source) {
	const lines = source.split("\n");
	const members = [];
	let currentClass = null;
	let i = 0;

	while (i < lines.length) {
		const line = lines[i];
		if (!/^\s*\/\*\*/.test(line)) {
			const classMatch = /^\s*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(\w+)/.exec(line);
			if (classMatch) currentClass = classMatch[1];
			i++;
			continue;
		}

		const block = [];
		let j = i + 1;
		while (j < lines.length && !/\*\//.test(lines[j])) {
			block.push(lines[j]);
			j++;
		}
		const doc = parseJsdoc(block);

		// the declaration is the next line that is not empty
		let k = j + 1;
		while (k < lines.length && lines[k].trim() === "") k++;
		const declaration = (lines[k] || "").trim();

		if (!doc.isOverload && declaration && !declaration.startsWith("*") && !declaration.startsWith("/*")) {
			members.push({ className: currentClass, declaration, doc });
		}
		i = j + 1;
	}

	return members;
}

/**
 * Works out what kind of member a declaration is
 * @param {string} declaration the line of the declaration
 * @returns {Object} the kind and the details of the member
 */
function classify(declaration) {
	const classMatch = /^(?:export\s+)?(?:default\s+)?class\s+(\w+)(?:\s+extends\s+(\w+))?/.exec(declaration);
	if (classMatch) return { kind: "class", name: classMatch[1], extends: classMatch[2] || null };

	if (/^constructor\s*\(/.test(declaration)) {
		return { kind: "constructor", ...readSignature(declaration) };
	}

	const methodMatch = /^(?:(static)\s+)?(?:(async)\s+)?(?:(get|set)\s+)?(\w+)\s*\(/.exec(declaration);
	if (methodMatch) {
		const [, isStatic, isAsync, accessor, name] = methodMatch;
		if (name !== "if" && name !== "for" && name !== "while" && name !== "switch" && name !== "catch") {
			return {
				kind: accessor ? "accessor" : "method",
				name,
				isStatic: Boolean(isStatic),
				isAsync: Boolean(isAsync),
				accessor,
				...readSignature(declaration)
			};
		}
	}

	if (/^(?:export\s+)?function\s+(\w+)/.test(declaration)) {
		const [, name] = /^(?:export\s+)?function\s+(\w+)/.exec(declaration);
		return { kind: "function", name, ...readSignature(declaration) };
	}

	const fieldMatch = /^(?:static\s+)?(?:readonly\s+)?(\w+)\s*=\s*([\s\S]*?);?\s*$/.exec(declaration);
	if (fieldMatch) return { kind: "field", name: fieldMatch[1] };

	const bareField = /^(?:static\s+)?(\w+)\s*;\s*$/.exec(declaration);
	if (bareField) return { kind: "field", name: bareField[1] };

	return { kind: "unknown" };
}

/**
 * Reads one parameter of a signature: its name, and whether it has a default
 * @param {string} param the parameter as it was written
 * @returns {Object} the name and the default of the parameter
 */
function readParam(param) {
	const text = param.trim();

	// a destructured parameter, such as { withBackup = false } = {}, is named after the keys it
	// destructures, since that is how the JSDoc documents it
	if (text.startsWith("{")) {
		let depth = 0;
		let close = -1;
		for (let i = 0; i < text.length; i++) {
			if (text[i] === "{") depth++;
			if (text[i] === "}") {
				depth--;
				if (depth === 0) {
					close = i;
					break;
				}
			}
		}
		if (close !== -1) {
			const inner = text.slice(1, close);
			const outer = text.slice(close + 1).replace(/^=\s*/, "").trim();
			const names = inner
				.split(",")
				.map((entry) => entry.split("=")[0].trim())
				.filter(Boolean);
			const ownDefault = inner.includes("=") ? inner.split("=").slice(1).join("=").trim() : null;
			return { name: names.length === 1 ? names[0] : names.join(", "), hasDefault: Boolean(outer || ownDefault), default: ownDefault || outer, destructured: names };
		}
	}

	const eq = text.indexOf("=");
	return eq === -1
		? { name: text, hasDefault: false }
		: { name: text.slice(0, eq).trim(), hasDefault: true, default: text.slice(eq + 1).trim() };
}

/**
 * Finds the default value of every key of an object literal that a class holds as a field
 * @param {string} source the contents of a source file
 * @param {string} fieldName the name of the field
 * @returns {Object} the default of each key, keyed by key name
 */
function readObjectDefaults(source, fieldName) {
	const match = new RegExp(`(?:^|\\n)\\s*(?:static\\s+)?${fieldName}\\s*=\\s*\\{`).exec(source);
	if (!match) return {};

	const start = source.indexOf("{", match.index);
	let depth = 0;
	let end = -1;
	for (let i = start; i < source.length; i++) {
		if (source[i] === "{") depth++;
		if (source[i] === "}") {
			depth--;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	if (end === -1) return {};

	const defaults = {};
	for (const entry of splitParams(source.slice(start + 1, end))) {
		const colon = entry.indexOf(":");
		if (colon === -1) continue;
		const key = entry.slice(0, colon).trim().replace(/^["']|["']$/g, "");
		defaults[key] = entry.slice(colon + 1).trim().replace(/,$/, "");
	}
	return defaults;
}

/**
 * Renders a JavaScript type so it reads well inside a markdown table
 * @param {string} type the type as it was written in the JSDoc
 * @returns {string} the type in markdown
 */
function renderType(type) {
	if (!type) return "";
	const simplified = type
		.replace(/typeof\s+([\w.]+)\[keyof\s+typeof\s+[\w.]+\]/g, "`$1`")
		.replace(/typeof\s+([\w.]+)/g, "`$1`")
		.replace(/import\("[^"]+"\)\./g, "")
		.replace(/\|/g, "\\|");
	return "`" + simplified.replace(/`/g, "") + "`";
}

/**
 * Renders a default expression, simplifying the ones that are calls on the profile maps
 * @param {string} value the default expression
 * @returns {string} the default in markdown
 */
function renderDefault(value) {
	if (!value) return "";
	return "`" + value.replace(/`/g, "").replace(/\|/g, "\\|") + "`";
}

/**
 * Renders a member as a markdown section
 * @param {Object} member the member to render
 * @param {string[]} notes the consistency problems found in the member
 * @returns {string} the markdown of the member
 */
function renderMember(member, notes) {
	const info = classify(member.declaration);
	const doc = member.doc;
	const out = [];
	if (!info.params) info.params = [];

	const signature = (name) => {
		const params = info.params
			.map((param) => (param.hasDefault ? `${param.name} = ${param.default}` : param.name))
			.join(", ");
		const prefix = [info.isStatic ? "static" : null, info.isAsync ? "async" : null].filter(Boolean).join(" ");
		return `${prefix ? prefix + " " : ""}${name}(${params})`;
	};

	const headings = [];
	if (info.kind === "class") {
		headings.push({ depth: 2, text: `\`${info.name}\`` });
		if (info.extends) {
			out.push(`Extends \`${info.extends}\`.`);
			out.push("");
		}
	} else if (info.kind === "constructor") {
		headings.push({ depth: 3, text: `\`new ${info.name || "Class"}(...)\`` });
	} else if (info.kind === "function") {
		headings.push({ depth: 3, text: `\`${signature(info.name)}\`` });
	} else if (info.kind === "accessor") {
		headings.push({ depth: 3, text: `\`${info.accessor} ${info.name}\`` });
	} else if (info.kind === "method") {
		headings.push({ depth: 3, text: `\`${signature(info.name)}\`` });
	} else {
		headings.push({ depth: 3, text: `\`${info.name || member.declaration}\`` });
	}

	for (const heading of headings) {
		out.push(`${"#".repeat(heading.depth)} ${heading.text}`);
		out.push("");
	}

	if (doc.description.length) {
		out.push(doc.description.join("\n"));
		out.push("");
	}

	if (doc.params.length) {
		out.push("**Parameters**");
		out.push("");
		out.push("| Name | Type | Description |");
		out.push("| --- | --- | --- |");
		for (const param of doc.params) {
			// a nested parameter is described on the parent, so it has no signature of its own
			const bare = param.name.replace(/^\[|\]$/g, "");
			const leaf = bare.split(".").pop();
			const signatureParam = info.params.find(
				(candidate) => candidate.name === bare || candidate.name === leaf ||
					(candidate.destructured || []).includes(leaf)
			);
			const defaultColumn = signatureParam && signatureParam.hasDefault
				? ` Default: ${renderDefault(signatureParam.default)}.`
				: "";
			out.push(
				`| \`${param.name}\` | ${renderType(param.type)} | ${param.description || "—"}${defaultColumn} |`
			);
		}
		out.push("");
	}

	for (const entry of doc.returns) {
		out.push(`**Returns** ${renderType(entry.type)}${entry.description ? ` — ${entry.description}` : ""}`);
		out.push("");
	}

	for (const entry of doc.throws) {
		out.push(`**Throws** ${renderType(entry.type)}${entry.description ? ` — ${entry.description}` : ""}`);
		out.push("");
	}

	if (doc.defaultValue) {
		out.push(`**Default** ${renderDefault(doc.defaultValue)}`);
		out.push("");
	}

	for (const note of notes) {
		out.push(`> **Note** ${note}`);
		out.push("");
	}

	return out.join("\n");
}

/**
 * Compares the parameters of the signature with the ones the JSDoc documents
 * @param {Object} member the member to check
 * @returns {string[]} the problems found
 */
function checkParams(member) {
	const info = classify(member.declaration);
	if (!["method", "constructor", "function", "accessor"].includes(info.kind)) return [];

	const notes = [];

	// a nested parameter, documented as parent.child, describes one key of a destructured
	// parent, so it matches on its own name rather than on the parent
	const documented = member.doc.params.map((param) => param.name);
	const actual = info.params.map((param) => param.name);

	const matches = (documentedName) => {
		const bare = documentedName.replace(/^\[|\]$/g, "");
		const leaf = bare.split(".").pop();
		return info.params.some(
			(candidate) => candidate.name === bare || candidate.name === leaf ||
				(candidate.destructured || []).includes(leaf)
		);
	};

	// a documented parameter that other parameters hang off, such as opts in opts.withBackup,
	// names the destructured object rather than one of its keys, so it is not compared
	const parents = new Set(
		documented.filter((name) => documented.some((other) => other.startsWith(`${name}.`)))
	);

	for (const name of actual) {
		if (!documented.some(matches)) {
			notes.push(`\`${name}\` is a parameter but the JSDoc does not document it.`);
		}
	}
	for (const name of documented) {
		if (parents.has(name)) continue;
		if (!matches(name)) notes.push(`\`${name}\` is documented but is not a parameter.`);
	}

	return notes;
}

/**
 * Renders a table of the settings a class holds, taking the defaults out of the code
 * @param {Object} typedef the typedef that declares the settings
 * @param {Object} defaults the default of each key, as read from the object literal
 * @returns {string} the markdown of the table
 */
function renderSettingsTable(settings, typedef, defaults) {
	const out = [];
	out.push(`### \`${settings.field}\``);
	out.push("");
	out.push(settings.description);
	out.push("");
	out.push(`Type: \`${settings.type || "Object"}\``);
	out.push("");
	out.push("| Name | Type | Default | Description |");
	out.push("| --- | --- | --- | --- |");

	// a name the typedef lists twice, as some of them do, is only one setting
	const seen = new Set();
	for (const property of typedef.properties) {
		if (seen.has(property.name)) continue;
		seen.add(property.name);
		out.push(
			`| \`${property.name}\` | ${renderType(property.type)} | ` +
			`${renderDefault(defaults[property.name]) || "—"} | ${property.description || "—"} |`
		);
	}

	// a default the code sets but the typedef never mentions would otherwise be lost
	for (const [name, value] of Object.entries(defaults)) {
		if (seen.has(name)) continue;
		out.push(`| \`${name}\` | — | ${renderDefault(value)} | — |`);
	}

	out.push("");
	return out.join("\n");
}

/**
 * Builds the reference page of one group of sources
 * @param {Object} page the description of the page
 * @returns {string} the markdown of the page
 */
const PROBLEMS = [];

/**
 * Records that the JSDoc and the signature of a member disagree
 * @param {string} member the name of the member
 * @param {string} file the file the member is in
 * @param {string[]} notes the problems found
 */
function recordProblems(member, file, notes) {
	for (const note of notes) {
		PROBLEMS.push(`${path.relative(ROOT, path.join(ROOT, file))}: ${member} — ${note}`);
	}
}

async function buildPage(page) {
	const body = [];

	for (const file of page.files) {
		const source = read(file);
		const members = parseMembers(source);

		for (const member of members) {
			const info = classify(member.declaration);
			if (info.kind === "unknown") continue;

			if (member.doc.typedefName && page.settings) {
				continue;
			}

			if (info.kind === "field" && page.skipFields) continue;

			const notes = checkParams(member);
			if (notes.length && info.name) recordProblems(info.name, file, notes);
			body.push(renderMember(member, notes));
		}

		if (page.settings) {
			for (const settings of page.settings) {
				const typedef = members.find(
					(member) => member.doc.typedefName === settings.typedef
				);
				if (!typedef) continue;
				const defaults = readObjectDefaults(source, settings.field);
				body.push(renderSettingsTable(settings, typedef.doc, defaults));
			}
		}

		for (const constant of page.constants || []) {
			const entries = await readConstantMap(source, constant.name);
			if (entries.length) body.push(renderConstant(constant.name, constant.description, entries));
		}
	}

	const front = [
		`# ${page.title}`,
		"",
		page.intro,
		""
	];

	return front.join("\n") + body.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd() + "\n";
}

/**
 * Reads an exported frozen map of IRIs, such as the type constants of a game object
 * @param {string} source the contents of a source file
 * @param {string} name the name of the constant
 * @returns {Object[]} the key and value of each entry
 */
async function readConstantMap(source, name) {
	const match = new RegExp(`export const ${name} = Object\\.freeze\\(\\{`).exec(source);
	if (!match) return [];

	const start = source.indexOf("{", match.index);
	let depth = 0;
	let end = -1;
	for (let i = start; i < source.length; i++) {
		if (source[i] === "{") depth++;
		if (source[i] === "}") {
			depth--;
			if (depth === 0) {
				end = i;
				break;
			}
		}
	}
	if (end === -1) return [];

	// The entries are split on the commas at the top level, which cuts the entry that follows a
	// trailing comment in two: the comment lands at the head of the next piece. Such a piece is
	// put back onto the entry it comments, and the comment is only stripped once it is there,
	// since a bare // would cut an IRI in half.
	const entries = [];
	const queue = splitParams(source.slice(start + 1, end));

	for (let index = 0; index < queue.length; index++) {
		let piece = queue[index];
		if (piece.trim() === "") continue;

		// a trailing comment was cut into the head of the next piece, so the comment is taken off
		// the front and the rest of the piece is read back as an entry of its own
		let comment = null;
		if (piece.trim().startsWith("//")) {
			const newline = piece.indexOf("\n");
			comment = piece.slice(0, newline === -1 ? undefined : newline).trim();
			piece = newline === -1 ? "" : piece.slice(newline + 1);
			if (piece.trim() === "") continue;
		}

		// a comment left inside the piece belongs to this entry; it has to follow whitespace or a
		// comma, otherwise the // of an IRI such as https:// would be read as the start of one
		const inline = piece.match(/(?:^|[\s,{])(\/\/[^\n]*)$/);
		if (inline) {
			comment = comment || inline[1].trim();
			piece = piece.slice(0, inline.index).trim();
		}

		const colon = piece.indexOf(":");
		if (colon === -1) continue;
		const key = piece.slice(0, colon).trim().replace(/^["']|["']$/g, "");
		const value = piece
			.slice(colon + 1)
			.replace(/,$/, "")
			.trim()
			.replace(/^["']|["']$/g, "");
		// the ids the profile server does not list are flagged with a WARN comment in the source
		entries.push({ key, value, commented: /\/\/\s*WARN/.test(comment || "") });
	}

	// the constants reference the ids of the generated profiles by name, so they are resolved
	// here rather than printed as the reference the source happens to use
	const resolved = await import(
		path.join(ROOT, "src/HighLevel/Statement/Ids/Profiles/Generated/All.js")
	);
	const { ALL } = resolved;

	return entries.map((entry) => {
		const chain = /^(?:ALL\.)?([A-Z_]+)\.([A-Z0-9_]+)$/.exec(entry.value);
		if (chain) {
			const [, map, key] = chain;
			if (ALL[map] && ALL[map][key]) return { ...entry, value: ALL[map][key] };
		}
		return entry;
	});
}

/**
 * Renders an exported frozen map as a markdown table
 * @param {string} name the name of the constant
 * @param {string} description what the constant holds
 * @param {Object[]} entries the entries of the map
 * @returns {string} the markdown of the constant
 */
function renderConstant(name, description, entries) {
	const out = [`### \`${name}\``, "", description, "", "| Key | IRI |", "| --- | --- |"];
	for (const entry of entries) {
		// the source flags the ids that the profile server does not list
		const warning = entry.commented ? " — not in the profile server" : "";
		out.push(`| \`${entry.key}\` | ${renderDefault(entry.value)}${warning} |`);
	}
	out.push("");
	return out.join("\n");
}

const PAGES = [
	{
		file: "trackers.md",
		title: "Tracker classes",
		intro:
			"Reference for the four tracker classes. They are documented in the order a game uses them: " +
			"create one, log in, start it, send statements, flush, stop. Every statement method returns " +
			"a builder, which is documented in [Statement builders](statement-builders.md).",
		files: ["src/js-tracker.js"],
		settings: [
			{
				typedef: "trackerSettings",
				field: "trackerSettings",
				description: "The settings of a tracker, read before `start()`."
			},
			{
				typedef: "oauth1",
				field: "oauth1",
				description: "The credentials used when `oauth_type` is `OAuth1`."
			},
			{
				typedef: "oauth2",
				field: "oauth2",
				description: "The settings used when `oauth_type` is `OAuth2`. The grant type is `password`, `refresh_token`, or `urn:ietf:params:oauth:grant-type:device_code`."
			}
		]
	},
	{
		file: "statement-builders.md",
		title: "Statement builders",
		intro:
			"Reference for the builders that every tracking method returns. A builder describes a " +
			"statement: nothing reaches the tracker until you call `send()`. Each setter returns the " +
			"builder, so they chain. `toXAPI()` returns the statement as it would be sent, without " +
			"queueing it, which is the safest way to inspect one.",
		files: ["src/HighLevel/StatementBuilder/StatementBuilder.js"]
	},
	{
		file: "lrs-statement-builder.md",
		title: "LRS statement builder",
		intro:
			"Reference for the builder `LRSTracker.trace()` returns. It extends the statement builder " +
			"with the fields an LRS statement adds, such as the actor, the authority, and the stored " +
			"timestamp, and with the setters of the envelope itself.",
		files: ["src/HighLevel/StatementBuilder/LRSStatementBuilder.js"]
	},
	{
		file: "tracker-asset.md",
		title: "Tracker asset",
		intro:
			"Reference for the asset underneath the tracker classes, which owns the queue, the retry " +
			"logic, and the connection to the LRS. You rarely touch it directly: `tracker.tracker` " +
			"holds it, and the tests use it to observe what would be sent.",
		files: ["src/xAPITrackerAsset.js"],
		settings: [
			{
				typedef: "settings",
				field: "settings",
				type: "Object",
				description:
					"The settings of the asset. They are not read from here: a tracker assigns its own " +
					"`trackerSettings` to this field when it starts, so the list is the same as " +
					"[`trackerSettings`](trackers.md#trackersettings)."
			}
		]
	},
	{
		file: "statements.md",
		title: "Statements",
		intro:
			"Reference for the statement classes. A statement is the object that becomes an xAPI " +
			"payload: `toXAPI()` renders it, `toCSV()` renders the compact form used by the CSV backup, " +
			"and `fromXAPI` reads one back. These classes are what the builders drive, and they are " +
			"the layer to look at if a statement is missing a part you set.",
		files: [
			"src/HighLevel/Statement/Statement.js",
			"src/HighLevel/Statement/LRSStatement.js",
			"src/HighLevel/Statement/ActorStatement.js",
			"src/HighLevel/Statement/VerbStatement.js",
			"src/HighLevel/Statement/ObjectStatement.js",
			"src/HighLevel/Statement/InteractionObjectStatement.js",
			"src/HighLevel/Statement/ResultStatement.js",
			"src/HighLevel/Statement/ContextStatement.js",
			"src/HighLevel/Statement/AttachementStatement.js"
		]
	},
	{
		file: "authentication.md",
		title: "Authentication",
		intro:
			"Reference for the authentication layers. `JSTracker.login()` picks the asset that matches " +
			"`trackerSettings.oauth_type`, and the asset asks its protocol object for a token. The " +
			"protocol classes are documented here for the cases where a game needs to reason about the " +
			"token itself.",
		files: [
			"src/Auth/OAuth1.js",
			"src/Auth/OAuth2.js",
			"src/Auth/OAuth2Protocol.js"
		],
		settings: [
			{ typedef: "oauth1Settings", field: "oauth1Settings" },
			{ typedef: "OAuth2Settings", field: "oauth2Settings" }
		]
	},
	{
		file: "game-objects.md",
		title: "Game objects",
		intro:
			"Reference for the four kinds of game object a serious game is built from, and for the " +
			"type constants each kind accepts. Each class holds one instance per id and type, which " +
			"is what lets a completable remember whether it was initialized.",
		files: [
			"src/HighLevel/SeriousGames/Completable.js",
			"src/HighLevel/SeriousGames/Accessible.js",
			"src/HighLevel/SeriousGames/Alternative.js",
			"src/HighLevel/SeriousGames/GameObject.js"
		],
		constants: [
			{ name: "COMPLETABLETYPE", description: "The activity types a completable accepts, passed as the second argument of `completable()`." },
			{ name: "ACCESSIBLETYPE", description: "The activity types an accessible accepts, passed as the second argument of `accessible()`." },
			{ name: "ALTERNATIVETYPE", description: "The activity types an alternative accepts, passed as the second argument of `alternative()`." },
			{ name: "GAMEOBJECTTYPE", description: "The activity types a game object accepts, passed as the second argument of `gameObject()`." }
		]
	},
	{
		file: "scorm.md",
		title: "SCORM",
		intro:
			"Reference for the SCORM tracker. `JSScormTracker` wraps the base tracker with a factory " +
			"that holds one instance per SCORM activity, and the statements of those instances carry " +
			"the parent activity of the content they came from.",
		files: ["src/HighLevel/Scorm/SCORM.js"]
	},
	{
		file: "helpers.md",
		title: "Helpers",
		intro:
			"Reference for the small utilities the statements are built on. They are exported, and are " +
			"worth knowing about if you build your own statement types.",
		files: ["src/HighLevel/Statement/helper.js"]
	}
];

fs.mkdirSync(OUT_DIR, { recursive: true });

for (const page of PAGES) {
	fs.writeFileSync(path.join(OUT_DIR, page.file), await buildPage(page));
}

const index = [
	"# API reference",
	"",
	"Reference for the tracker, its builders, and the classes underneath them. Each page lists the " +
	"members of one group, with their parameters, defaults, and what they return.",
	"",
	"This index lists the pages. Start at [the reference README](./README.md) for what each page covers.\n\n" +
	"This section describes what the code *is*. For how to use it, see the [tutorials](../tutorials/README.md) " +
	"and the [how-to guides](../how-to/README.md); for why the code works this way, see the " +
	"[explanation](../explanation/README.md).",
	"",
	"## Trackers",
	"",
	"- [Tracker classes](trackers.md) — `JSTracker`, `SeriousGameTracker`, `JSScormTracker`, " +
	"`LRSTracker`, and every setting they take",
	"",
	"## Statements",
	"",
	"- [Statement builders](statement-builders.md) — the builder every tracking method returns",
	"- [LRS statement builder](lrs-statement-builder.md) — the builder an LRS tracker returns",
	"- [Game objects](game-objects.md) — the four kinds of game object and their type constants",
	"- [Statements](statements.md) — the statement classes the builders drive",
	"",
	"## Underneath",
	"",
	"- [Tracker asset](tracker-asset.md) — the queue, the retries, and the connection to the LRS",
	"- [Authentication](authentication.md) — the OAuth layers",
	"- [SCORM](scorm.md) — the SCORM tracker",
	"- [Helpers](helpers.md) — the utilities the statements are built on",
	"",
	"## Profiles",
	"",
	"The ids of around 50 xAPI profiles ship with the tracker and are read at runtime rather than " +
	"listed here. They are on every tracker as `tracker.ALL`, in `VERBS`, `ACTIVITYTYPES`, " +
	"`ACTIVITYEXTENSION`, `CONTEXTEXTENSION`, `RESULTEXTENSION`, and `CATEGORYID`; on a serious game " +
	"the serious games ids are also on `tracker.SERIOUSGAMEPROFILE`, and on a SCORM tracker the SCORM " +
	"ids are on `tracker.SCORMPROFILE`.",
	"",
	"One thing to know about them: an unqualified name resolves to whichever profile was merged " +
	"first, so `ALL.RESULTEXTENSION.PROGRESS` is the video extension rather than the serious games " +
	"one. Use the qualified name, such as `ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS`, when " +
	"you mean a specific profile.",
	""
].join("\n");

fs.writeFileSync(path.join(OUT_DIR, "index.md"), index);

process.stdout.write(`wrote ${PAGES.length + 1} pages to docs/reference\n`);

if (PROBLEMS.length) {
	process.stdout.write(`\n${PROBLEMS.length} signatures disagree with their JSDoc:\n`);
	for (const problem of PROBLEMS) process.stdout.write(`  ${problem}\n`);
	process.exitCode = 1;
}
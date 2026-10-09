# ADR-0011 — The tracker is named xasu-js, and the old class names still resolve

- **Status:** Accepted, 2026-10-09
- **Date:** 2026-10-09

## Context

The repository was `js-tracker` and the base class was `JSTracker`. Neither matched what the
library is: it is the JavaScript implementation of Xasu (xAPI Analytics Supplier), which has
counterparts in Unity and elsewhere under the same name. A game importing from `js-tracker` was
importing a generic-sounding name for a product with an identity.

Renaming is cheap in the repository and expensive outside it. The tracker is not published to a
registry — games install it straight from GitHub, by tag, by commit, or by copying the UMD bundle
into their build. A game that pinned `github:e-ucm/js-tracker#v2.2.1-beta` has that repository
referenced by name in its own `package.json`, and a game that loaded the bundle has the filename in
its HTML and its build script. Neither can be updated by a commit here.

## Decision

**The package is `xasu-js`.** `package.json` (`name`, `main`, `module`, `types`, `exports`,
`repository`), the source entry point (`src/xasu-js.js`), every build output, and every mention in
the documentation move to that name.

**The exported class names follow the package:** `JSTracker` became `XasuJS`, and `JSScormTracker`
became `XasuScormTracker`. `SeriousGameTracker` and `LRSTracker` were already name-neutral and did
not change.

**Both pre-rename names keep resolving, marked deprecated.** `src/xasu-js.js` exports
`JSScormTracker` and `JSTracker` as `const` bindings on the same class objects as
`XasuScormTracker` and `XasuJS`. Not subclasses: `new JSScormTracker()` is the same constructor as
`new XasuScormTracker()`, so `instanceof` holds whichever name a game imported. Each alias carries an `@deprecated` tag naming its replacement and the version that deprecated it,
so an editor strikes the old name through and shows the message. Each also has a paired
`@typedef` of the same name, so the alias is usable in a **type** position as well as a value one:
`let t: JSScormTracker` typechecks, which a bare `const` binding would not. The typedef is JSDoc
rather than an `interface`, because `src/` is JavaScript and webpack cannot parse TypeScript syntax.

One limitation is accepted rather than worked around: `tsc` copies the body of a `@typedef` into
the emitted `.d.ts` but drops its tags, so the deprecation is visible on the value and not on the
type. Since both carry the same name, the strikethrough an editor shows on the import covers both
positions anyway.

Tests pin the identity of each pair.

The alias is a `const` rather than a subclass precisely so that it costs nothing to keep: no second
class in the bundle, no divergence as the classes change.

`dist/` is rebuilt from a clean directory before every build. The rename otherwise leaves the old
`js-tracker.bundle.*` files and `js-tracker.d.ts` sitting in `dist/`, and `files: ["dist"]` in
`package.json` wins over `.gitignore`, so `npm pack` ships them in the tarball. A `clean` step
removes the class of problem rather than the instance.

## Consequences

**Positive**

- The package name, the class names, the bundle filenames and the repository agree.
- The rename is **not a breaking change at the module level**: a game importing `JSTracker` or
  `JSScormTracker` keeps working, so nothing has to be rebuilt in lockstep with the rename. Only the
  repository URL moves, and that is out of our hands.
- `npm pack` no longer carries a second copy of the type declarations under the old name, which was
  200 kB of declarations for a class that no longer exists.

**Negative**

- **The repository rename is not ours to make.** The GitHub repository has to be renamed to
  `e-ucm/xasu-js` for `npm install github:e-ucm/xasu-js#<ref>` to resolve. Until it is, the
  `repository` field and the documented install commands point at a name that does not answer.
- **A game pinned to `github:e-ucm/js-tracker` breaks.** The old name stops resolving once the
  repository is renamed, and there is nothing a commit here can do about it. This is the one
  remaining breaking edge; the class aliases cannot cover it, because the failure is in the
  install spec rather than in an import.
- **Four names for two classes is permanent surface area.** `JSTracker` and `JSScormTracker` cannot
  be dropped in a future major without deciding who still imports them, and until then every
  `Object.keys()` on the module, and every autocomplete list, shows both. The aliases are documented
  in the reference as deprecated rather than hidden, so a consumer can see which one to move to.
- **`dist/` has to be cleaned before a build.** A build that only overwrites its outputs cannot
  remove a file whose name no longer appears in the config, which is exactly what a rename
  produces.

## Evidence

- `1012f69` — 2026-10-09, the rename: package, entry point, build outputs, docs
- `e0ae17d` — the CommonJS root `index.js` that survived from before the ESM move and broke on the
  rename path it pointed at; removed, since `main`/`exports` already route consumers to `dist/`
- `test/profiles.js` — pins `JSTracker === XasuJS` and `JSScormTracker === XasuScormTracker`, and
  that `instanceof` holds across both names

## Related

- [ADR-0010](0010-dist-is-built-not-committed.md) — why `dist/` is built rather than committed, and
  why `files` in `package.json` overrides `.gitignore`
- [How to install from GitHub](../../how-to/install-from-github.md) — the install forms the rename
  has to keep answering for

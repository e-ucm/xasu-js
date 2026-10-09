# How to install from GitHub

**A recipe for one task**: installing the tracker from the repository rather than from a registry,
pinned to a tag or a commit.

The tracker is not published to npm. It is consumed straight from the repository:

```bash
npm install github:e-ucm/xasu-js#v2.2.1-beta
```

## Picking what you get

The part after `#` decides which version is installed:

| Form | Resolves to | Use it when |
| --- | --- | --- |
| `#v2.2.1-beta` | the tag exactly | you want one known release |
| `#a2e28ea` | the commit exactly | you want one known build, or a tag does not exist |
| `#fix-xasu-js` | the branch tip | you are tracking work in progress |
| `#semver:^2.2.0-beta` | the highest tag matching the range | you want the newest release in a series |
| `#main` | the default branch | you are living dangerously |

The equivalent long form, which some tooling prefers, is:

```bash
npm install "git+https://github.com/e-ucm/xasu-js.git#v2.2.1-beta"
```

**Pin a tag or a commit, not a branch.** A branch moves; a tag does not. A `package-lock.json`
records the resolved commit, so a lockfile committed alongside your game is what actually makes
an install reproducible — the spec alone is a request, not a guarantee.

## Why this works at all

`dist/` is **not committed**. The repository holds source, and `package.json` has a `prepare`
script:

```json
"scripts": { "prepare": "npm run build" }
```

When npm installs a git dependency whose `package.json` has a `prepare` script, it clones the
repository into a temporary directory, installs that clone's `dependencies` *and* `devDependencies`,
runs `prepare`, and only then packs and installs the result. The build runs at install time, from
source, on your machine.

This works because everything the build needs is in `devDependencies` — webpack, rollup,
TypeScript and their plugins — and because the generated xAPI profiles are committed, so the
submodule is not required to build.

The `files` allowlist keeps the packed tarball to the built artifacts, `README.md` and `LICENSE`:
85 files, about 3 MB unpacked. `src/` is not shipped.

## What it costs you

npm clones, installs 21 build dependencies (about 124 MB), builds, and throws the clone away.
Measured on a warm cache, an install from a fresh commit takes around 30 seconds the first time
and near-instantly afterwards, because npm caches the packed result per commit. It happens once
per commit, not once per build of your game.

What this does **not** break, checked against npm 10 rather than assumed:

- `NODE_ENV=production` and `npm install --omit=dev` both still work. npm installs the git
  dependency's devDependencies regardless of what the outer install omits, because it needs them
  to run `prepare`.
- `npm ci --ignore-scripts` also still builds. npm treats a git dependency's `prepare` as required
  to pack it correctly.
- A build that fails fails the **install loudly**, rather than shipping an empty `dist/`.

The one case to watch is a **lockfile-driven install with a script-policy filter**: some npm 11
configurations let you skip lifecycle scripts for dependencies. If `prepare` is skipped, the install
still succeeds and `dist/` is absent, and you find out later as a module-not-found in the browser.
If your team filters dependency scripts, install the release tarball below instead.

## What you get

The package name is `xasu-js`, and the ESM and CommonJS entry points both resolve:

```js
import { SeriousGameTracker } from 'xasu-js';        // ESM
const { SeriousGameTracker } = require('xasu-js');   // CommonJS
```

TypeScript declarations ship too, so `trackerSettings` is typed without a `@types/` package.

## For a game with no build step

Two assets are attached to every GitHub Release, because the repository no longer contains a
prebuilt bundle:

**The tarball**, if you want to install something without letting npm build it:

```bash
npm install https://github.com/e-ucm/xasu-js/releases/download/v2.2.1-beta/xasu-js-2.2.1-beta.tgz
```

**The UMD bundle**, if your page loads the tracker with a `<script>` tag and has no build step of
its own. Download it and drop it next to your page:

```html
<script src="xasu-js-webpack.bundle.js"></script>
```

```bash
curl -LO https://github.com/e-ucm/xasu-js/releases/download/v2.2.1-beta/xasu-js-webpack.bundle.js
```

## Tagging a release

Cutting a tag builds the release, builds the artifacts, and attaches them to a GitHub Release:

```bash
npm version 2.2.1-beta --no-git-tag-version   # updates package.json and package-lock.json
npm run verify                                 # what CI runs
git commit -am "release 2.2.1-beta"
git push origin HEAD
git tag -a v2.2.1-beta -m "2.2.1-beta"
git push origin v2.2.1-beta                   # triggers .github/workflows/release.yml
```

The tag must name the version in `package.json`. The release workflow fails if it does not, because
the tag history contains one mismatch (`v2.1.2-beta` sits on a commit whose `package.json` says
`2.1.0-beta`) and a release asset whose name disagrees with its contents is worse than no asset.

You do not run `npm run build` before tagging. `dist/` is gitignored, so it is not part of the
commit, and CI builds it from a clean checkout. Building locally is still worth it if you want the
artifacts to look right before you push the tag.

## Choosing a version to install

- **Production.** Take a tag. If one looks wrong, take the commit hash instead — both work.
- **Trying a change.** Take a branch, and remember that its tip moves.
- **Reproducing a bug report.** Take the commit hash from the report, not a tag: it is the only
  ref that cannot have moved.

## See also

- [How to run it locally](run-it-locally.md)
- [API reference](../reference/index.md)
- [ADR-0010](../explanation/decisions/0010-dist-is-built-not-committed.md) — why `dist/` is built at
  install time rather than committed, and what that trades away
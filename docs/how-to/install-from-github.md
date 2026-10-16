# How to install from GitHub

**A recipe for one task**: installing the tracker from GitHub rather than from the public npm
registry, either straight from the repository (pinned to a tag or a commit) or from the GitHub Packages registry.

The tracker is not published to the public npm registry. It is consumed straight from the repository:

```bash
npm install github:e-ucm/xasu-js#v2.3.0-beta
```

Each tag is also published, prebuilt, to the GitHub Packages registry. GitHub Packages asks for a
token even for a public package, so authenticate before installing:

```bash
export GITHUB_TOKEN=<a personal access token with the read:packages scope>
npm config set @e-ucm:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken "$GITHUB_TOKEN"
npm install @e-ucm/xasu-js
```

## Picking what you get

The part after `#` decides which version is installed:

| Form | Resolves to | Use it when |
| --- | --- | --- |
| `#v2.3.0-beta` | the tag exactly | you want one known release |
| `#a2e28ea` | the commit exactly | you want one known build, or a tag does not exist |
| `#fix-js-tracker` | the branch tip | you are tracking work in progress |
| `#semver:^2.3.0-beta` | the highest tag matching the range | you want the newest release in a series |
| `#master` | the default branch | you are living dangerously |

The equivalent long form, which some tooling prefers, is:

```bash
npm install "git+https://github.com/e-ucm/xasu-js.git#v2.3.0-beta"
```

**Pin a tag or a commit, not a branch.** A branch moves; a tag does not. A `package-lock.json`
records the resolved commit, so a lockfile committed alongside your game is what actually makes
an install reproducible — the spec alone is a request, not a guarantee.

## Installing from GitHub Packages
Every tag publishes the built package to the GitHub Packages npm registry as `@e-ucm/xasu-js`.
Unlike the git install, that tarball already contains `dist/`, so npm builds nothing on your
machine.

GitHub Packages asks for a token even for a public package, so `npm install` on its own fails
with `E401 Unauthorized`. Authenticate first:

1. Create a personal access token. A **classic** token needs the `read:packages` scope; a
   **fine-grained** token needs "Packages" read access. If `e-ucm/xasu-js` is private, a classic
   token also needs the `repo` scope.
2. Point the scope at the registry and register the token.
3. Install.

```bash
export GITHUB_TOKEN=<your personal access token>
npm config set @e-ucm:registry https://npm.pkg.github.com
npm config set //npm.pkg.github.com/:_authToken "$GITHUB_TOKEN"
npm install @e-ucm/xasu-js
```

The commands are separate because the package is scoped: `@e-ucm` has to be pointed at the
registry before npm will look there for it. Add `--location=project` to either `npm config` call to
write the setting into a `.npmrc` in your project rather than into your user config — do **not**
commit a `.npmrc` that contains the token.

npm also reads the token from the `NODE_AUTH_TOKEN` environment variable, which is what CI uses.
In a GitHub Actions workflow that is `secrets.GITHUB_TOKEN`, together with `packages: read` in the
job's `permissions`:

```yaml
permissions:
  contents: read
  packages: read
```

Because the registry name is scoped, the import is scoped here too:

```js
import { SeriousGameTracker } from '@e-ucm/xasu-js';
```

Pin a published version the usual way — `npm install @e-ucm/xasu-js@2.3.0-beta` — and the git
forms above still work unchanged.
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
npm install https://github.com/e-ucm/xasu-js/releases/download/v2.3.0-beta/xasu-js-2.3.0-beta.tgz
```

**The UMD bundle**, if your page loads the tracker with a `<script>` tag and has no build step of
its own. Download it and drop it next to your page:

```html
<script src="xasu-js-webpack.bundle.js"></script>
```

```bash
curl -LO https://github.com/e-ucm/xasu-js/releases/download/v2.3.0-beta/xasu-js-webpack.bundle.js
```

## Tagging a release

Cutting a tag builds the release, builds the artifacts, and attaches them to a GitHub Release:

```bash
npm version 2.3.0-beta --no-git-tag-version   # updates package.json and package-lock.json
npm run verify                                 # what CI runs
git commit -am "release 2.3.0-beta"
git push origin HEAD
git tag -a v2.3.0-beta -m "2.3.0-beta"
git push origin v2.3.0-beta                   # triggers .github/workflows/release.yml
```

The tag must name the version in `package.json`. The release workflow fails if it does not, because
the tag history contains one mismatch (`v2.1.2-beta` sits on a commit whose `package.json` says
`2.1.0-beta`) and a release asset whose name disagrees with its contents is worse than no asset.

You do not run `npm run build` before tagging. `dist/` is gitignored, so it is not part of the
commit, and CI builds it from a clean checkout. Building locally is still worth it if you want the
artifacts to look right before you push the tag.

The same tag also publishes the built package to the GitHub Packages registry as `@e-ucm/xasu-js`,
in a `publish-github` job that runs after the release. It leaves the repository's `package.json`
name untouched — GitHub Packages asks for an owner-scoped name, so the job scopes it only for the
publish. A tag whose version already exists there is skipped rather than failing.

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
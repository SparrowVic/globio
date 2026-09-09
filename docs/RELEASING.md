# Releasing GlobioJS packages

GlobioJS publishes five public npm packages from one fixed Changesets version
group:

- `globiojs` — a functional alias of `@globiojs/core`
- `@globiojs/core`
- `@globiojs/react`
- `@globiojs/vue`
- `@globiojs/angular`

Feature merges never publish packages. A push to `main` may update the Version
Packages pull request, while npm publication is a separate manual workflow
protected by the `npm-production` GitHub environment.

## One-time npm and GitHub setup

1. Rename or transfer the source repository to `SparrowVic/globiojs`. Package
   repository metadata and npm provenance are validated against that location.
2. Create the `globiojs` npm organization and choose its public-packages plan.
   The organization owns the `@globiojs` scope. The unscoped `globiojs` package
   is a separate registry name and its first publication is performed by an npm
   user account.
3. Require two-factor authentication for maintainers and keep at least two npm
   organization owners after a second trusted maintainer is available.
4. In GitHub Actions settings, allow GitHub Actions to create pull requests so
   `version-packages.yml` can maintain the Version Packages PR.
5. Create a GitHub environment named `npm-production`. Add required reviewers
   and restrict deployment branches to `main`.

The library workflows install only the root and `packages/*` workspaces. They do
not install the separately deployed website and do not need Font Awesome or any
website secret.

## First publication bootstrap

npm trusted-publisher settings are configured on an existing package. Therefore
an npm owner performs the first release locally with an authenticated npm CLI.
Before continuing, confirm that all five names are still available and that the
logged-in user can publish inside `@globiojs`:

```sh
npm login
npm whoami
pnpm install --frozen-lockfile
pnpm docs:check
node --test scripts/docs-extract.test.mjs
pnpm typecheck
pnpm test
pnpm build
node scripts/package-smoke.mjs
```

Inspect the tarballs and their manifest report with:

```sh
node scripts/package-smoke.mjs --artifacts-only --output /tmp/globiojs-packages
```

The bootstrap command has two deliberate safeguards: `--bootstrap` and an exact
confirmation environment variable. It publishes core first, followed by the
alias and framework packages. It skips a package version already present in npm,
so the same command can finish a partially completed first release.

```sh
GLOBIOJS_BOOTSTRAP_CONFIRM=PUBLISH_FIRST_RELEASE \
  node scripts/publish-packages.mjs --publish --bootstrap --tag latest
```

Local bootstrap uses the logged-in npm owner and does not claim CI provenance.
Do not place an npm token in the repository, shell history, `.npmrc` committed to
Git, or GitHub Actions.

## Configure npm trusted publishing

After the first release, open Trusted Publisher settings for every package and
configure the same GitHub Actions identity:

| Setting | Value |
| --- | --- |
| GitHub owner | `SparrowVic` |
| Repository | `globiojs` |
| Workflow filename | `publish.yml` |
| Environment | `npm-production` |
| Allowed operation | direct publish |

This must be repeated for all five packages, including the unscoped `globiojs`
alias. The publishing job grants `id-token: write` and `contents: read`, uses a
GitHub-hosted runner, Node 24, and npm 11.16.0. It intentionally has no
`NPM_TOKEN` or `NODE_AUTH_TOKEN`. The GitHub release job runs separately with
`contents: write` and has no OIDC permission.

Trusted publishing requires npm 11.5.1 or newer and Node 22.14.0 or newer. The
workflow checks both versions before publishing and builds without a dependency
cache. See the npm documentation for [trusted publishers][trusted-publishers]
and [provenance][provenance].

## Normal release flow

1. Add a changeset to every pull request that changes public behavior:

   ```sh
   pnpm changeset
   ```

2. Merge the feature pull request after Library CI succeeds. CI checks generated
   docs, types, unit tests, builds, package contents, ESM and CommonJS imports,
   TypeScript consumption, and an Angular production AOT build using the packed
   Angular Package Format artifact.
3. Review and merge the `chore: version packages` pull request created by
   Changesets. This updates versions and changelogs but does not publish. GitHub
   deliberately does not start new workflows for a pull request created with
   its own `GITHUB_TOKEN`, so `version-packages.yml` runs the full library and
   packed-consumer verification after applying the version changes and before it
   writes Wiktor's release commit. For an additional visible PR check, run
   **Library CI** manually and select the Version Packages branch.
4. Open **Actions → Publish packages → Run workflow** on `main`. Select `verify`
   first. This performs the complete release check without npm write access.
5. Run it again with `publish` and choose `latest`. Approval of the
   `npm-production` environment is the final authorization.
6. Confirm all five npm versions, provenance statements, and the `vX.Y.Z` GitHub
   release.

The `next` tag is an explicit preview channel and may be selected for either a
prerelease or a stable version when that is intentional. The publish script
rejects prerelease versions under `latest`.

## Failure and recovery

npm versions are immutable. Never change build output while retrying the same
version. If publication stops after only some packages reach npm, rerun the same
workflow from the same `main` commit; already published versions are skipped and
the remaining packages continue in dependency order.

The workflow refuses to publish from another branch or while unconsumed
changeset files remain. If a bad version is published, deprecate it and release a
new patch; do not try to overwrite it.

The Angular package is built with `ng-packagr` and packed from
`packages/angular/dist`, not from its source package directory. The smoke test
also checks partial-Ivy declarations and performs a consumer AOT build. This
matches the [Angular Package Format][angular-package-format].

[trusted-publishers]: https://docs.npmjs.com/trusted-publishers/
[provenance]: https://docs.npmjs.com/generating-provenance-statements/
[angular-package-format]: https://angular.dev/tools/libraries/angular-package-format
[changesets]: https://github.com/changesets/action

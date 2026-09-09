# Contributing to GlobioJS

## Branches and commits

Start from `main` and name each working branch `<prefix>/<short-kebab-case>`:

| Prefix | Purpose |
| --- | --- |
| `feat` | New behavior or API |
| `fix` | Bug fixes |
| `chore` | Repository maintenance |
| `docs` | Documentation |
| `refactor` | Internal restructuring without behavior changes |
| `test` | Test coverage and test tooling |
| `ci` | Build, validation and release workflows |
| `perf` | Performance improvements |

Examples: `fix/country-focus` and `docs/react-quickstart`. Choose the prefix by the kind of change and keep the description short and specific.

Commits must identify their human author. Maintainer commits use Wiktor Wróbel's configured Git identity. Keep commits focused on the change, without tool credits or generated co-author trailers.

## Local development

Use Node 24 and pnpm 8.15.0:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm build
pnpm dev
```

Before opening a PR, run the checks relevant to your change:

```sh
pnpm docs:check
pnpm typecheck
pnpm test
pnpm build
pnpm test:packages
```

Run `pnpm docs:extract` when changing the public API, and include the updated manifest. Add a changeset with `pnpm changeset` for changes to published behavior; see [Releasing](docs/RELEASING.md).

This repository requires no Font Awesome credentials. Never commit a Font Awesome token or add one to GitHub Actions. The separate website uses Free icons for local development and public CI.

## Pull requests and ownership

Open a PR into `main` and describe the resulting behavior and validation. [SparrowVic](https://github.com/SparrowVic) is the sole CODEOWNER and approves and merges changes after required CI succeeds for the current revision. Reviews from other contributors are welcome, but do not replace CODEOWNER approval.

GitHub does not allow authors to approve their own PRs. For SparrowVic's own PRs, the owner reviews the changes and uses the owner-only bypass of the PR approval requirement. Required CI remains mandatory and must not be bypassed.

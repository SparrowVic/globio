# Changesets

Every user-visible package change should include a changeset:

```sh
pnpm changeset
```

Select the affected package and describe the result for library users. GlobioJS
packages are a fixed group, so Changesets keeps all five package versions equal.
Documentation, test-only, CI and internal refactors do not need a changeset.

Merging a feature pull request never publishes to npm. The version workflow
opens or updates a separate Version Packages pull request. Publishing remains a
manual, protected workflow described in `docs/RELEASING.md`.

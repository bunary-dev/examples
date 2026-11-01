# bunary-examples — agent instructions

Three independent example projects (`basic-api`, `basic-orm`, `nested-routes`), each with its own
`package.json`, lockfile and `tests/`. There is no CI: bunker's verify runs every example's own
tests locally, and the maintainer merges PRs by hand.

## Definition of done

- **Each example keeps its own passing tests.** A change to an example adds or updates tests in
  that example's `tests/`, and `bun test` passes in every example (verify runs all three).
- **Docs:** a change to an example updates that example's `README.md`; anything that changes what
  the examples are or how to run them also updates the root `README.md`.
- **Version:** any change to an example's code bumps the root `package.json` `version` by semver
  (patch for fixes, minor for new examples or features). The tag-release workflow tags each merge,
  and it fails on a duplicate tag if the version is not bumped. Docs-only changes do not bump.
- Examples stay `"private": true`; never published.

## Out of scope

No npm publishing and no CI/CD or release workflows: publishing for all `@bunary/*` packages is on
hold until the maintainer says otherwise, and this repo deliberately has no CI.

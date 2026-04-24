---
task_slug: release-confidence-cleanup
branch: chore/release-confidence-cleanup
base_commit: ab01fde9a72e4f6b3b5f2877dee3504bb603f953
source_artifact_type: pasted handoff brief
source_artifact_snapshot: clean up release-confidence issues on main after ab01fde
stage: spec
---

# Release Confidence Cleanup

## Goal

Clean up remaining release-confidence issues on `main` after `ab01fde`.

## Scope

- Fix `data-handler-ts` lint so `cd data-handler-ts && bun run lint` exits 0.
- Add meaningful tests for high-risk backend authorization, permission, company
  access, and event dispatch failure paths.
- Document production CDK diff as an external release gate because production
  role assumption is unavailable locally and production is out of bounds for
  this workflow.
- Keep release verification source clean by working from an isolated worktree
  based on `main`.

## Non-Goals

- No production deploys or production role assumption from this workflow.
- No API contract changes unless the spec is updated first.
- No DynamoDB schema or repository contract changes unless needed for tests.
- No frontend changes.
- No broad coverage chasing or snapshot-only tests.

## Acceptance Criteria

- `cd data-handler-ts && bun run lint` exits 0.
- Targeted tests exercise auth failures, permission boundaries, company
  membership or device access, and event dispatch error paths.
- Root verification remains green for affected tests and relevant lint/build
  checks.
- `git status --short` is clean before any local release command.
- Production CDK diff is left as a reviewed-by-human gate or CI gate with the
  expected limitation documented.

## Adversarial Interview

- API contract drift: tests must not encode or introduce response shape changes
  unless current behavior is wrong and explicitly updated here.
- Auth / tenant boundaries: new tests should prove denial paths as well as
  allowed paths, especially missing JWT claims and company membership checks.
- Device / event side effects: event dispatch tests must mock handlers and avoid
  real IoT Wireless or Lambda side effects.
- DynamoDB impact: company/device access tests should use existing repository
  mocks or route-level fakes rather than adding schema assumptions.
- CDK / deploy blast radius: production diff cannot be produced by this agent;
  this remains a release gate outside local implementation.
- Rollback path: lint config and tests are isolated changes and can be reverted
  without data migration.
- Failure modes: ESLint 9 flat config must not accidentally lint generated
  `dist`, `node_modules`, or test files ignored by the package policy.
- Testability: each high-risk path should be asserted by behavior, status code,
  or returned dispatch response instead of coverage-only imports.

## Test Plan

- Run `cd data-handler-ts && bun run lint`.
- Run targeted Jest files added or updated for auth, permissions, companies,
  and event dispatch.
- Run `bun run build` and relevant root lint/test commands if touched files
  affect shared TypeScript or root test configuration.
- Mark production CDK diff as blocked locally unless valid production AWS role
  credentials are available outside this workflow.

## Verification Matrix

- unit tests: run targeted auth/permission/company/event-dispatch tests.
- integration tests: not applicable unless route tests require Hono app wiring.
- build / lint / type checks: run data-handler lint and relevant root checks.
- API verification via `curl`: not applicable for local unit-only coverage.
- browser verification via Playwright: not applicable; no frontend UI changes.
- manual verification: production CDK diff review is external/blocked locally.

---
task_slug: release-confidence-cleanup
branch: chore/release-confidence-cleanup
base_commit: ab01fde9a72e4f6b3b5f2877dee3504bb603f953
stage: qa
---

# QA Report

## Verification Matrix

- unit: run
- integration: not applicable
- build/lint/type: run
- curl/api: not applicable
- playwright: not applicable
- manual: blocked for production CDK diff

## Evidence

- `cd data-handler-ts && bun run lint`: pass with existing `no-console`
  warnings only.
- `cd data-handler-ts && bun run build`: pass.
- `cd data-handler-ts && bun run test`: pass, 1 suite / 1 test.
- `bun run build`: pass.
- `bun run lint`: pass.
- `bunx jest test/auth-middleware-failures.test.ts test/permissions-boundaries.test.ts test/event-dispatcher-branches.test.ts test/companies-current-user.test.ts --runInBand`:
  pass, 4 suites / 15 tests.
- `bun run test -- --runInBand`: pass, 19 suites / 95 tests.
- `bun run test:coverage -- --runInBand`: pass, 19 suites / 95 tests.

## Coverage Snapshot

- All `lambda/**/*.ts`: 56.9% statements, 35.44% branches.
- `lambda/utils/auth.ts`: 65.97% statements, 55.26% branches.
- `lambda/utils/permissions.ts`: 56.35% statements, 43.47% branches.
- `lambda/events/eventDispatcher.ts`: 53.84% statements, 13.33% branches.
- `lambda/companies/companies.ts`: 20.46% statements, 13.55% branches.

## Residual Risks

- Production CDK diff was not run. Production access is out of bounds for this
  workflow and must be reviewed by an authorized human or CI gate.
- `companies.ts` remains broad and low-coverage overall. This branch adds
  unauthenticated and tenant-membership denial coverage, but does not attempt a
  full company route coverage project.

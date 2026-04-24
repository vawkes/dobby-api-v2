---
task_slug: lint-config
branch: chore/lint-config
base_commit: ee60b474c4ef9ba792f4c1a9d1efbe8372b54284
source_artifact_type: plain feature brief
source_artifact_snapshot: "Another developer noted that the linting configuration in this repo needs work."
stage: spec
---

# Lint Config Spec

## Scope

Fix the root lint configuration so `bun run lint` runs against the intended
root TypeScript project and does not parse nested independent projects against
the root `tsconfig.json`.

## Current Evidence

Baseline `bun run lint` fails with 96 parsing errors. The failures are for
`frontend-react/**` and `data-handler-ts/**` files being parsed with
`parserOptions.project: ./tsconfig.json`, even though those files are excluded
from the root TypeScript project.

Baseline `bun run build` also fails in `lambda/app.ts`. That is an existing
type-check issue and is out of scope for this lint configuration chore.

## Non-Goals

- Do not change API route behavior.
- Do not change auth, tenant boundaries, permissions, device commands, or event
  handlers.
- Do not change DynamoDB schemas, repositories, or queries.
- Do not change CDK resources or deployment configuration.
- Do not lint or refactor `frontend-react/` or `data-handler-ts/` from the root
  command.
- Do not update package dependencies or the lockfile.

## Acceptance Criteria

- `bun run lint` no longer reports parser errors for `frontend-react/**` or
  `data-handler-ts/**`.
- Root lint still covers root TypeScript sources included by the root
  `tsconfig.json`.
- Generated JavaScript/declaration artifacts remain ignored by root lint.
- No application TypeScript source behavior changes are required.

## Adversarial Review

- API contract drift: none expected because only lint configuration should
  change.
- Auth / tenant boundaries: none expected; no auth code changes.
- Device / event side effects: none expected; no event handler or IoT command
  changes.
- DynamoDB schema / query impact: none expected; no data layer changes.
- CDK / deploy blast radius: none expected; lint-only local tooling change.
- Rollback path: revert the lint config commit.
- Failure modes: overly broad ignores could hide root code; overly broad lint
  targets could reintroduce nested-project parser errors.
- Testability: verify with `bun run lint`; run `bun run build` and report
  existing baseline type failures separately.

## Test Plan

- Run `bun run lint`.
- Run `bun run build` for type-check evidence; record any pre-existing failures
  that remain outside this chore.

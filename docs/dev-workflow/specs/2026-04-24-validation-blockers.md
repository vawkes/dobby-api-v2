---
task_slug: validation-blockers
branch: bugfix/validation-blockers
base_commit: ee60b474c4ef9ba792f4c1a9d1efbe8372b54284
source_artifact_type: pasted developer validation report
source_artifact_snapshot: backend build/OpenAPI test fail in lambda/app.ts; frontend build/test fail; data-handler build/test gaps; deploy workflow calls missing script; checkout ambiguity from dirty feature branch
stage: spec
---

# Validation Blockers

## Scope

Resolve current local validation blockers that prevent this checkout from being
considered shippable:

- Make root TypeScript build pass.
- Make full root Jest pass, including OpenAPI spec coverage.
- Make frontend production build pass.
- Make frontend tests pass or intentionally remove invalid empty tests.
- Correct the GitHub deploy workflow so it calls scripts that exist.
- Make `data-handler-ts` buildable without TypeScript rootDir import errors.
- Isolate the work on a clean branch from `main` so shipped content is clear.

## Non-Goals

- No production deploy.
- No production CDK deploy.
- No API contract expansion beyond preserving/fixing generated OpenAPI docs.
- No device command behavior changes.
- No DynamoDB schema changes unless required to compile existing code.
- No broad frontend redesign.

## Adversarial Review

- API contract drift: OpenAPI handler fixes must preserve documented public
  routes and examples. Any route shape change requires a spec update.
- Auth / tenant boundaries: Do not change auth middleware, route protection, or
  company/device access semantics while fixing compile errors.
- Device / event side effects: Do not alter event dispatch or IoT send behavior.
- DynamoDB impact: Data-handler fixes should use existing shared code safely or
  relocate type/build boundaries without changing persisted item shapes.
- CDK / deploy blast radius: Workflow changes must only map requested
  environment inputs to existing deploy/diff commands. Production remains manual
  and out of scope locally.
- Rollback path: Revert this branch or individual commits; no external state is
  mutated by the planned local verification.
- Failure modes: If validation remains red, report exact commands and blockers.
- Testability: Prefer existing build and test commands over manual inspection.

## Acceptance Criteria

- `bun run build` passes at repo root.
- `bun run test -- --runInBand` passes at repo root or remaining failures are
  documented as unrelated environmental blockers with evidence.
- `bun run build` passes in `frontend-react/`.
- Frontend tests run successfully in CI mode.
- `bun run build` passes in `data-handler-ts/`, or data-handler build scope is
  deliberately corrected and documented.
- `.github/workflows/deploy.yml` no longer references a missing `deploy` script.
- Work is committed on `bugfix/validation-blockers` with a draft PR opened.

## Test Plan

- Root: `bun install` if needed, `bun run build`, `bun run test -- --runInBand`.
- Frontend: `bun install` if needed, `CI=true bun run test -- --watchAll=false`,
  `bun run build`.
- Data handler: install/build from `data-handler-ts/`.
- Workflow: inspect `.github/workflows/deploy.yml` against root `package.json`.
- Optional: `bun run cdk synth --all --context environment=production` for local
  synthesis evidence only, not deploy.

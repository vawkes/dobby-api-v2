---
task_slug: frontend-deploy-safety
branch: bugfix/frontend-deploy-safety
base_commit: 1fc16215f2e0aa9bac6beb4010f4801942a8d092
source_artifact_type: pasted deployment findings
source_artifact_snapshot: "Develop deploy initially served S3 AccessDenied because frontend-react/build lacked index.html and bundles; manual frontend-react bun run build:develop plus redeploy fixed it. Additional blockers: Node 18 CDK warning, production console debug/token previews, and API self-test mislabeled develop builds as PROD API because CRA NODE_ENV=production."
stage: spec
---

# Frontend Deploy Safety

## Scope

- Make root `deploy:develop` and `deploy:production` build the matching React frontend before CDK deploy uploads `frontend-react/build`.
- Add a pre-deploy guard so CDK fails before upload if the frontend build artifact is missing or incomplete.
- Enforce Node 20+ for deploy entrypoints so CDK does not run under Node 18.
- Remove or gate production browser console debug output, especially token previews and noisy API diagnostics.
- Fix the frontend API self-test label so develop builds do not report "PROD API" solely because CRA sets `NODE_ENV=production` during optimized builds.

## Non-Goals

- No production deployment.
- No backend API contract changes.
- No auth, tenant boundary, device command, event handler, DynamoDB schema, or repository behavior changes.
- No redesign of frontend routing, login, or device workflows.

## Acceptance Criteria

- `bun run deploy:develop` invokes `frontend-react` develop build before `cdk deploy`.
- `bun run deploy:production` invokes `frontend-react` production build before `cdk deploy`.
- Deploy scripts fail early on Node versions below 20.
- CDK synthesis/deploy fails with an actionable error when `frontend-react/build/index.html` or static bundles are absent.
- Production-optimized frontend builds do not print token previews or broad debug diagnostics.
- API self-test classifies environment from `REACT_APP_ENVIRONMENT` and configured API URL, not from CRA `NODE_ENV` alone.
- Local verification includes unit baseline, TypeScript build or CDK synth, frontend build, and targeted checks for deploy artifact validation.

## Adversarial Review

- API contract drift: not applicable; no API routes or OpenAPI surface should change.
- Auth / tenant boundaries: token handling changes are logging-only; auth request headers must remain unchanged.
- Device / event side effects: not applicable; no event handlers or device actions should change.
- DynamoDB schema / query impact: not applicable.
- CDK / deploy blast radius: frontend stack validation must be read-only and fail before asset upload. Deploy commands still target existing stacks and profiles.
- Rollback path: revert package scripts, CDK artifact validation, and frontend logging changes; redeploy previous main if needed.
- Failure modes: missing frontend dependencies, failed React build, invalid Node version, empty build directory, missing static bundles.
- Testability: validate scripts through `bun run build`, frontend `bun run build:develop`, and a simulated missing/empty build check through CDK synth or direct helper tests.

## Test Plan

- `bun run test:unit`
- `bun run build`
- `cd frontend-react && bun install && bun run build:develop`
- CDK synth or targeted validation with complete and incomplete frontend build directories.
- Optional: `bun run deploy:develop` only after explicit develop preflight, not required for local completion.

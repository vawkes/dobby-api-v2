---
task_slug: frontend-deploy-safety
branch: bugfix/frontend-deploy-safety
base_commit: 1fc16215f2e0aa9bac6beb4010f4801942a8d092
stage: qa
---

# QA Report

## Verification Matrix

- unit: run
- integration: not applicable
- build/lint/type: run
- curl/api: not applicable
- playwright: not applicable
- manual: not applicable

## Evidence

- commands:
  - `bun run test:unit`
  - `bun run build`
  - `bun run lint`
  - `cd frontend-react && CI=true bun run test -- --watchAll=false src/App.test.tsx src/utils/api-test.test.ts`
  - `cd frontend-react && bun run lint`
  - `cd frontend-react && bun run build:develop`
  - `bun scripts/require-node20.ts && node -p process.version`
  - `bun run cdk synth --context environment=develop`
  - `cd frontend-react && bun run build:production`
  - `rg -n "Adding authorization token|Token expires|Login successful|Testing API Configuration|Final API configuration|token received, length|Using production configuration|Using development configuration" frontend-react/build/static/js frontend-react/build/index.html || true`
- outputs:
  - unit: 4 suites passed, 18 tests passed
  - root TypeScript build: exit 0
  - root lint: exit 0
  - frontend targeted tests: 2 suites passed, 3 tests passed
  - frontend lint: exit 0
  - frontend develop build: compiled successfully with existing Browserslist age warning
  - Node guard: exit 0 with `v22.22.0`
  - CDK synth: successfully synthesized to `cdk.out`
  - frontend production build: compiled successfully with existing Browserslist age warning
  - bundle string check: no matches
- residual risks:
  - No develop redeploy was performed in QA.
  - CI status must be checked after pushing the final implementation commit.

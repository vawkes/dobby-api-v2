# Verification Matrix

Mark each line as `run`, `not applicable`, or `blocked`.

## Verification Lines

- unit tests
- integration tests
- build / lint / type checks
- API verification via `curl`
- browser verification via Playwright
- manual verification, only when unavoidable

## Evidence Rules

- Prefer automated evidence.
- Local verification is the default.
- If `develop` is required, include a preflight note with reason, target
  resources, blast radius, verification plan, and rollback / cleanup plan.
- Report CI separately from local completion.

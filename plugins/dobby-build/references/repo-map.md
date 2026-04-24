# Repo Map

## Core Areas

- `lambda/`: Hono API routes, auth middleware, watchdog, and event handlers.
- `shared/`: database client, repositories, shared schemas.
- `lib/` and `deployment/`: CDK infrastructure and environment config.
- `frontend-react/`: React frontend and API integration.
- `test/`: Jest tests and supporting helpers.

## Repo Rules

- Prefer TypeScript-only edits.
- Treat side-by-side committed `*.js` and `*.d.ts` in `lambda/` as legacy noise.
- Start from a fresh worktree based on `main`.
- Follow branch naming by approved task type: `feature/`, `bugfix/`, `chore/`.

## Common Commands

- Install: `bun install`
- Build TypeScript: `bun run build`
- Lint: `bun run lint`
- Unit tests: `bun run test:unit`
- API tests: `bun run test:api`
- Performance tests: `bun run test:performance`

## Runtime Notes

- Local-first verification.
- `develop` may be used when local evidence is insufficient.
- Production is always out of bounds.

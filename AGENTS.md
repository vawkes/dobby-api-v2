# AGENTS.md

This file gives coding agents a fast, accurate map of the `dobby-api-v2`
repository.

## Purpose

- Backend API for GridCube/Dobby devices, including the GridCube CTA-2045 UCM
  cloud pipe over Amazon Sidewalk (AWS Lambda + Hono + API Gateway/Function
  URL).
- Infrastructure as code with AWS CDK (TypeScript).
- React frontend for device operations in `frontend-react/`.
- Shared DynamoDB/repository logic in `shared/`.
- This app is used as a management platform for the GridCube devices. It
  contains a frontend and backend API to send actions to the device and
  retrieve/monitor data. It also contains the data ingestion layer to process
  incoming data packets from the devices. It is all managed with CDK.

## High-Level Architecture

- API entrypoint: `lambda/index.ts`
  - Mounts route modules: `devices`, `events`, `companies`, and public `auth`
    routes.
  - Uses JWT auth middleware (`lambda/utils/auth.ts`) and CORS.
  - Exposes OpenAPI JSON (`/public/openapi`) and Scalar docs (`/public/docs`).
- Event command handling:
  - `lambda/events/events.ts` validates and dispatches event handlers.
  - Event handlers in `lambda/events/eventHandlers/` send commands to IoT
    Wireless.
  - Protocol reference: `docs/protocols/gridcube-cta-2045-sidewalk.md`.
- Watchdog:
  - `lambda/watchdog/watchdog.ts` periodically scans devices and sends
    connection-info requests.
- Data layer:
  - Unified DynamoDB client in `shared/database/client.ts`.
  - Repositories in `shared/database/repositories/`.
- CDK stacks:
  - App bootstrap: `bin/dobby-api-v2.ts`.
  - Main infra: `lib/dobby-api-v2-stack.ts`.
  - Frontend infra: `lib/react-frontend-stack.ts`.
  - Cert/DNS support: `lib/certificate-stack.ts`, `lib/dns-stack.ts`.
- Environment config:
  - `deployment/config.ts` defines `develop` and `production` accounts/profiles.
- Incoming d

## Important Directories

- `lambda/`: Backend handlers and route modules.
- `shared/`: Shared schemas and database/repository code.
- `lib/`: CDK stacks.
- `deployment/`: Environment configuration and deployment wiring.
- `test/`: Jest tests and DB test scripts.
- `frontend-react/`: Separate React app and build pipeline.
- `data-handler-ts/`: Device uplink processing lambda.
- `docs/`: Architecture, testing, deployment, and security docs.

## Commands Agents Should Use

From repo root:

- Install deps: `bun install`
- Build TS: `bun run build`
- Lint: `bun run lint`
- Format: `bun run format`
- Unit/integration set used in current scripts: `bun run test:unit`
- Full Jest suite: `bun run test`
- Coverage: `bun run test:coverage`

Frontend (run inside `frontend-react/`):

- Install deps: `bun install`
- Dev server: `bun run start`
- Build: `bun run build`
- Lint: `bun run lint`

CDK deploy/destroy:

- Develop deploy: `bun run deploy:develop`
- Production deploy: `bun run deploy:production`
- Develop destroy: `bun run destroy:develop`

## Repo-Specific Caveats

- Mixed source/build artifacts in `lambda/`:
  - `*.ts`, `*.js`, and `*.d.ts` are committed side-by-side.
  - Prefer editing `*.ts` files unless user explicitly asks otherwise.
  - After TS edits, consider whether rebuild/regeneration is required before
    handoff.
- Tests currently include disabled files:
  - `test/*.disabled` files are not picked up by Jest.
  - Active scripts in `package.json` are the source of truth for what runs in
    CI/dev.
- Root `README.md` is generic CDK boilerplate and not a full architecture
  source.

## Safe Change Workflow for Agents

1. Read the relevant route/module and nearby utils before modifying behavior.
2. Make minimal TypeScript-first changes (`*.ts`).
3. Run targeted checks first (`bun run test:unit` or specific Jest file), then
   broader checks as needed.
4. If infra-related behavior changes, inspect matching CDK stack and
   `deployment/config.ts`.
5. Summarize impact by area (API routes, DynamoDB access, auth/permissions,
   deployment risk).

## Where to Start for Common Tasks

- API route bug/feature:
  - `lambda/index.ts` then the specific route module (`lambda/devices/*`,
    `lambda/events/*`, `lambda/companies/*`).
- Auth/permission issue:
  - `lambda/utils/auth.ts`, `lambda/utils/authRoutes.ts`,
    `lambda/utils/permissions.ts`, `lambda/utils/deviceAccess.ts`.
- Event command/device behavior:
  - `lambda/events/events.ts`, `lambda/events/eventHandlers/*`,
    `lambda/utils/sendToDobby.ts`.
- DynamoDB schema/access bug:
  - `shared/database/client.ts`, repository files in
    `shared/database/repositories/`.
- Deployment problem:
  - `bin/dobby-api-v2.ts`, `lib/*.ts`, `deployment/config.ts`, docs in
    `docs/operations/`.
- Frontend/API integration issue:
  - `frontend-react/src/services/` and `frontend-react/src/utils/config.ts`.

## Documentation Pointers

- Architecture summary: `docs/architecture/overview.md`
- GridCube CTA-2045/Sidewalk protocol:
  `docs/protocols/gridcube-cta-2045-sidewalk.md`
- Deployment runbook: `docs/operations/deployment.md`
- Testing docs: `docs/testing/testing.md`, `docs/testing/test-status.md`
- API/OpenAPI notes: `docs/backend/*`

## Git workflow

- When working on a new feature, bug fix, or task, create a new branch from main
  prefixed with the type of change. e.g. `feature/something`
  `bugfix/something_else`
- Commit small changes as you go.
- Open the PR on github with the changes you made back into main. I will review
  them.
- This should follow a github flow type workflow.

## Process

- Be very concise. Sacrifice grammer for the sake of concision.

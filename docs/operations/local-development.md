# Local Development

## Prerequisites
- Bun 1.1+
- Docker

## One-command startup

From repo root:

```bash
bun install
cd frontend-react && bun install && cd ..
bun run local:up
```

This starts:
- DynamoDB Local container (`dobby-dynamodb-local`)
- API (`http://localhost:8787`)
- Frontend (`http://localhost:3000`)

## Data bootstrap
The startup flow runs:
- `scripts/local/setup-dynamodb.ts` (table + GSI creation)
- `scripts/local/seed-dynamodb.ts` (baseline data)

Seeded entities:
- Company: `local-company`
- User: `local-dev-admin` (role: `SUPER_ADMIN`)
- Device mapping: `000001 -> 11111111-1111-1111-1111-111111111111`

## Auth behavior in local mode
`LOCAL_DEV=true` and `LOCAL_DEV_BYPASS_AUTH=true` enable local auth mode:
- Public auth endpoints return local success responses
- Protected routes use a local user payload instead of Cognito JWT verification

You can override seeded/identity values with env vars:
- `LOCAL_DEV_USER_ID`
- `LOCAL_DEV_USER_EMAIL`
- `LOCAL_DEV_COMPANY_ID`
- `LOCAL_DEV_DEVICE_ID`
- `LOCAL_DEV_WIRELESS_DEVICE_ID`

## Standalone commands
- Start DB: `bun run local:db:start`
- Setup tables: `bun run local:db:setup`
- Seed data: `bun run local:db:seed`
- Start API only: `bun run local:api`
- Start frontend only: `bun run local:frontend`
- Stop DB: `bun run local:db:stop`

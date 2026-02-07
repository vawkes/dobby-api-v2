# dobby-api-v2

Backend API + infrastructure + React frontend for GridCube/Dobby devices.

## Local Development (Bun)

Run the full stack locally (DynamoDB Local + API + frontend):

```bash
bun install
cd frontend-react && bun install && cd ..
bun run local:up
```

Local endpoints:
- Frontend: `http://localhost:3000`
- API: `http://localhost:8787`
- DynamoDB Local: `http://localhost:8000`

### What `local:up` does
- Starts DynamoDB Local in Docker (`dobby-dynamodb-local`)
- Creates required tables and indexes
- Seeds baseline local data (company, user, device, device data)
- Starts Bun API server with local auth bypass enabled
- Starts React frontend configured against local API

### Local auth mode
When running via local scripts, auth endpoints and protected routes run in local-dev mode:
- `/public/auth/login` returns a local token
- Protected routes accept local user context without Cognito verification
- Default local user id: `local-dev-admin`

Override with env vars:
- `LOCAL_DEV_USER_ID`
- `LOCAL_DEV_USER_EMAIL`

### Useful local commands
- `bun run local:db:start`
- `bun run local:db:setup`
- `bun run local:db:seed`
- `bun run local:api`
- `bun run local:frontend`
- `bun run local:db:stop`

## Existing project commands
- Build TS: `bun run build`
- Lint: `bun run lint`
- Unit tests: `bun run test:unit`
- Full tests: `bun run test`
- Coverage: `bun run test:coverage`

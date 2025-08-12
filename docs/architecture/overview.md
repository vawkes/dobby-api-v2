# Architecture Overview

This document provides a concise, high-level view of the system architecture for Dobby API v2.

## System Diagram

```mermaid
flowchart LR
  subgraph Client
    Web[React Frontend]
  end

  subgraph AWS
    CF[CloudFront] --> S3[S3 Static Site]
    Web --> CF

    API[Lambda (Hono API)]
    GW[Function URL / API Gateway]
    GW --> API

    Auth[Cognito User Pool]
    API --- Auth

    DB[(DynamoDB)]
    API <--> DB

    IoT[IoT Wireless]
    API --> IoT

    DH[Data Handler Lambda]
    IoT --> DH
    DH --> DB

    WD[Watchdog Lambda (scheduled)]
    WD --> IoT
  end
```

## Key Components

- Backend API (Lambda + Hono):
  - Entry: `lambda/index.ts` mounts routes: `devices`, `events`, `companies`, and public `auth` routes.
  - Middleware: CORS, `auth` (Cognito JWT verification), permission checks.
  - OpenAPI: `hono-openapi` with Scalar UI for interactive docs.

- Authentication and Authorization:
  - Cognito User Pool and App Client created by CDK (`lib/dobby-api-v2-stack.ts`).
  - Middleware validates JWT and enriches context with user claims (`lambda/utils/auth.ts`).
  - Fine-grained permissions and device-level checks in `lambda/utils/permissions.ts` and `lambda/utils/deviceAccess.ts`.

- Events and Device Commands:
  - Routes in `lambda/events/events.ts` validate requests (Zod) and dispatch to event handlers.
  - Event handlers build binary payloads and send via IoT Wireless (`lambda/utils/sendToDobby.ts`).
  - Events are flattened and stored in DynamoDB via repositories in `shared/database/repositories/`.
  - Device ID mapping supports human 6-digit IDs and IoT UUIDs (`lambda/utils/deviceIdMapping.ts`).

- Data Ingestion (Uplink):
  - `data-handler-ts` Lambda processes uplinks from devices, decodes payloads by type, writes device data (`DobbyData`), and acknowledges events.
  - Uses a shared DynamoDB DocumentClient (`shared/database/client.ts`) and schemas in `shared/schemas/`.

- Watchdog Timer:
  - `lambda/watchdog/watchdog.ts` periodically pings devices (info-request) to prevent watchdog timeouts.

- Frontend:
  - React app in `frontend-react/` uses Axios (`src/services/api.ts`) with a configurable base URL (`src/utils/config.ts`).
  - Authentication uses `/public/auth/*` endpoints and stores tokens in `localStorage`.

- Infrastructure (CDK):
  - `lib/dobby-api-v2-stack.ts` provisions Cognito, Lambda, DynamoDB tables, permissions, and IoT access.
  - `lib/react-frontend-stack.ts` builds the React app, creates S3 + CloudFront, and deploys assets.
  - `lib/certificate-stack.ts` and `lib/dns-stack.ts` manage certificates and DNS when configured.

## Data Model (DynamoDB)

- Existing tables imported: `DobbyInfo`, `DobbyEvent`, `DobbyData`, `ProductionLine`.
- New org tables: `Companies`, `CompanyUsers` (GSI on `user_id`), `CompanyDevices`.
- Repositories provide access patterns:
  - `shared/database/repositories/device-repository.ts`
  - `shared/database/repositories/event-repository.ts`

## Request Flow (Example)

1. Web calls API via Function URL / API Gateway.
2. CORS and Auth middleware validate request.
3. Route handler validates body (Zod), enforces permissions, and performs action.
4. For events, a binary payload is sent via IoT Wireless; an event record is saved to DynamoDB.
5. Device uplink is processed by `data-handler-ts`, acknowledging events and persisting data.

## Open Questions (to finalize this doc)

- What is the canonical public API URL for each environment, and is API Gateway used or Lambda Function URL in production?
- Which services publish uplinks to `data-handler-ts` (direct IoT Wireless rule vs. API Gateway integration)?
- SLAs and SLOs for API latency and device command delivery?
- Expected payload sizes and throughput (requests per second, devices count)?
- Error handling policy: retry strategies and dead-letter queues in use?
- Observability: logs, metrics, dashboards, alarms (CloudWatch, X-Ray, etc.)?
- Secrets management strategy (SSM, Secrets Manager) and rotation?
- Frontend auth model: which token(s) stored, expiration/refresh, and logout behavior?
- Multi-tenant boundaries: how are companies isolated and audited?
- Deployment environments and promotion strategy (develop → production)?



---
task_slug: shelf-devices-attention
branch: feature/shelf-devices-attention
base_commit: c0a5812a1f7a67d4d4875cb89aee0bee7edfa308
source_artifact_type: plain feature brief
source_artifact_snapshot: "Devices assigned to a company before installation show as offline/no-data attention items. They are actually shelf inventory waiting to be installed, so they should not alarm fleet managers. Use a Pending Install state, and infer installation once device data starts flowing."
stage: spec
---

# Shelf Devices Attention Spec

## Problem

Fleet managers currently see newly shipped but not-yet-installed devices in the
dashboard attention queue because frontend health status is derived from
`DobbyInfo.updated_at` and signal fields. A device assigned to a company before
installation often has no telemetry, so it becomes `no_data` or `offline` even
though no action is required.

## Goal

Represent company-assigned shelf devices as `PENDING_INSTALL` and keep them out
of alarm-oriented dashboard and device-list attention views until telemetry
exists. Once telemetry exists, the device should be treated as installed and
normal online/degraded/offline/no-data health rules should apply.

## Non-Goals

- Do not add a new DynamoDB table or index.
- Do not change IoT Wireless command behavior, event handlers, watchdog command
  behavior, or Sidewalk payload handling.
- Do not add a manual install workflow in this change.
- Do not change production resources directly.
- Do not hide devices from the fleet. Pending-install devices must remain
  visible outside alarm-only views.

## Recommended Data Model

Use `CompanyDevices.status` as the canonical assignment lifecycle field.

- New company-device assignments default to `PENDING_INSTALL`.
- Existing assignment statuses remain valid, with `ACTIVE` representing a
  normally installed device.
- A missing legacy status is treated as active/normal for compatibility.
- The device API exposes assignment lifecycle metadata on device responses so
  the frontend does not need to query company assignment endpoints separately.

This keeps fulfillment/installation state scoped to the company-device
relationship instead of putting company-specific business state into the global
`DobbyInfo` telemetry record.

## Lifecycle Semantics

`PENDING_INSTALL` means the device has been assigned/shipped to the company but
has not yet produced telemetry for that assignment.

The API should compute an effective lifecycle for device health:

- If `CompanyDevices.status` is `PENDING_INSTALL` and `DobbyInfo.updated_at` is
  absent, effective lifecycle is `PENDING_INSTALL`.
- If `CompanyDevices.status` is `PENDING_INSTALL` and `DobbyInfo.updated_at` is
  present, effective lifecycle is `ACTIVE`.
- If assignment status is `ACTIVE`, `MAINTENANCE`, `INACTIVE`, or `OFFLINE`,
  preserve that status for the response.
- If assignment status is missing, default effective lifecycle to `ACTIVE` to
  preserve current behavior.

First-data promotion is intentionally inferred at read time for this feature.
Persisting `PENDING_INSTALL -> ACTIVE` from the ingestion path can be added
later if stale assignment rows become operationally painful.

## API Design

Update device response schemas and route assembly so `/devices` and
`/devices/:deviceId` include optional assignment lifecycle fields:

- `assignment_status`: stored `CompanyDevices.status` when available.
- `effective_assignment_status`: computed status used by frontend health.

The exact names may be adjusted during implementation to match local naming
style, but the API must clearly distinguish stored lifecycle from effective
lifecycle if both are exposed.

Assigned devices should remain visible even when `DobbyInfo` is sparse or
missing. If a user has access through `CompanyDevices` but no matching
`DobbyInfo` item can be loaded, the API should return a minimal device response
with `device_id`, pending-install lifecycle metadata, and optional telemetry
fields omitted. This preserves fleet inventory visibility without inventing
telemetry values.

The `/companies/:companyId/devices` assignment endpoint should create rows with
`status: "PENDING_INSTALL"` unless a future explicit status parameter is added.

## Frontend Design

Extend shared device status logic in `frontend-react/src/utils/deviceStatus.ts`.

- Pending-install devices display as `Pending Install`.
- Pending-install devices do not count toward attention load.
- Dashboard attention queue excludes pending-install devices.
- `/devices?filter=attention` excludes pending-install devices.
- Devices table/list still shows pending-install devices in all-devices views.
- Once the API reports effective status as active, existing telemetry health
  rules determine `Online`, `Degraded`, `Offline`, or `No Data`.

## Acceptance Criteria

1. Assigning a device to a company creates or returns a company-device row with
   `PENDING_INSTALL` lifecycle.
2. A company user can still see pending-install devices in normal fleet lists.
3. Pending-install devices with no telemetry are excluded from dashboard
   attention queue and attention counts.
4. Pending-install devices with telemetry are treated as active and evaluated
   by existing telemetry health rules.
5. Assigned devices with no matching or complete `DobbyInfo` row still appear as
   pending-install inventory rather than disappearing from the fleet.
6. Legacy company-device rows with no status preserve current attention
   behavior.
7. Tenant isolation is preserved: lifecycle data is derived only from company
   assignments the authenticated user can already access.
8. OpenAPI/device schemas accept and document the added optional lifecycle
   fields.

## Adversarial Review

- API contract drift: adding optional response fields is backward-compatible,
  but frontend and docs must not assume every device has assignment metadata.
- Auth / tenant boundaries: device lifecycle must be fetched only from the
  `CompanyDevices` row that grants access. Do not scan or expose other
  companies' assignments.
- Device / event side effects: no command dispatch, watchdog, or event handler
  behavior should change.
- DynamoDB schema / query impact: use existing `CompanyDevices.status`. No table
  migration is required for legacy rows because missing status defaults to
  active behavior.
- CDK / deploy blast radius: no CDK resource changes expected.
- Rollback path: frontend can ignore lifecycle fields and the API can stop
  returning them without data loss. Existing assignment rows with
  `PENDING_INSTALL` are safe, but would again appear as no-data/offline if the
  lifecycle-aware frontend is rolled back.
- Failure modes: missing `DobbyInfo` for an assigned device should not crash the
  device list. Missing assignment status should not hide a device from attention.
- Testability: behavior can be covered with focused unit tests for status logic
  and backend route/schema tests or targeted mocks around company-device
  assignment enrichment.

## Alternatives Considered

### Store lifecycle in `DobbyInfo`

Pros: simpler device reads, one record carries device state, and data ingestion
already touches the table that receives telemetry.

Cons: pending install begins as company assignment/fulfillment state, not device
telemetry state. Putting it in `DobbyInfo` mixes tenant-specific business state
into global device metadata, complicates reassignment/return/refurbish flows,
and increases accidental overwrite risk from ingestion updates.

### Infer pending install from assigned-but-no-data only

Pros: no new persisted field and very small implementation.

Cons: hides genuinely installed devices that never reported or stopped reporting
before first successful telemetry. This weakens the alarm model instead of
making shelf inventory explicit.

### Persist `ACTIVE` on first data payload now

Pros: stored assignment state eventually matches reality and read logic stays
simple.

Cons: adds writes and lookup logic to the ingestion path, which is higher blast
radius and harder to verify. A malformed or test payload could prematurely
activate an assignment. The update must also be carefully constrained to
`PENDING_INSTALL -> ACTIVE` so maintenance/inactive states are not overwritten.

## Implementation Notes

Likely areas:

- `lambda/companies/companiesSchema.ts`
- `lambda/companies/companies.ts`
- `lambda/devices/devicesSchema.ts`
- `lambda/devices/devices.ts`
- `lambda/utils/deviceAccess.ts` or a small nearby helper for assignment
  metadata
- `frontend-react/src/types/index.ts`
- `frontend-react/src/utils/deviceStatus.ts`
- `frontend-react/src/pages/Dashboard.tsx`
- `frontend-react/src/pages/Devices.tsx`
- `frontend-react/src/components/data/DataTableColumns.tsx`
- focused tests under `test/` and `frontend-react/src/utils/`

## Verification Plan

- unit tests: run targeted frontend status tests and backend tests covering
  assignment default/enrichment if available.
- integration tests: run `bun run test:unit` from repo root after targeted
  tests pass.
- build / lint / type checks: run `bun run build`; run frontend build if
  frontend types change.
- API verification via `curl`: not required unless local API fixture/server is
  already available.
- browser verification via Playwright: not required for first backend-focused
  implementation; use if dashboard rendering changes are nontrivial.
- manual verification: inspect dashboard/device list behavior for a mocked or
  seeded pending-install device if automated UI coverage cannot cover it.

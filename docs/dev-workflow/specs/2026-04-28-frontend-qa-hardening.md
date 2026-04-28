---
task_slug: frontend-qa-hardening
branch: bugfix/frontend-qa-hardening
base_commit: fa1bd57469ddeb5449dac55c247464482f619db8
source_artifact_type: pasted production QA findings
source_artifact_snapshot: Devices search crash, status language mismatch, null/fixed-width string leakage, bad event rendering, blank firmware fields, dark-mode bulk schedule contrast, authenticated login route.
stage: spec
---

# Frontend QA Hardening

## Source

Production QA at `https://gridcube.vawkes.com` found frontend failures across Dashboard, Devices, device detail pages, Bulk Schedule, theme switching, and `/login`. No production commands were submitted.

## Classification

Bugfix.

## Scope

- Prevent Devices search from crashing when API device fields are missing, null, empty, or fixed-width padded.
- Sanitize device identifier/display strings before search and rendering.
- Align Devices table status language with Dashboard and detail status labels: `Online`, `Degraded`, `Offline`, `No Data`.
- Render unknown/malformed events defensively without presenting invalid dates or pending acknowledgements as facts.
- Render missing firmware/profile fields with explicit fallback copy.
- Fix the low-contrast Bulk Schedule device labels in dark mode.
- Redirect authenticated users away from `/login` to `/dashboard`.
- Improve telemetry summary formatting for large cumulative energy values and operational state codes.

## Non-Goals

- No API contract changes.
- No DynamoDB schema or repository changes.
- No event/device command behavior changes.
- No production verification, production writes, or schedule submissions.
- No redesign of Bulk Schedule workflow beyond dark-mode label contrast.
- No deployment/CDK changes.

## Acceptance Criteria

- Searching `000416` or any text on Devices does not throw when device string fields are undefined/null/empty.
- Search matches sanitized model, serial, firmware, type, and device ID values.
- Fixed-width null bytes and control characters do not appear in visible device strings or accessible text.
- Devices table and mobile table use shared status semantics and labels.
- Missing firmware, firmware date, CTA version, vendor ID, revision, capability, or GridCube firmware render as `Not reported` or are omitted when appropriate.
- Device events with unknown type or invalid/missing timestamps show `Unknown Event (<raw type>)` and `Unknown` date, with raw event ID/type visible enough for debugging.
- Bulk Schedule device labels remain readable in dark mode.
- Authenticated visits to `/login` redirect to `/dashboard`.
- Latest telemetry summary formats large energy values with grouping and labels operational state as a code, not an unexplained bare number.

## Adversarial Interview

- API contract drift: Treat backend data as unreliable at UI boundaries, but do not change request/response schemas.
- Auth / tenant boundaries: No auth logic changes except public-route redirect based on existing `useAuth` state.
- Device / event side effects: No writes to devices/events; schedule defaults and submit flow remain unchanged in this task.
- DynamoDB impact: None. Sanitization is display/search only.
- CDK / deploy blast radius: None.
- Rollback path: Revert frontend-only commit(s); no data migration.
- Failure modes: Over-sanitizing could hide useful raw identifiers. Preserve raw event IDs/types where diagnostic value matters.
- Testability: Add unit/component tests for string sanitization, status labels, search crash prevention, event fallback rendering, and login redirect where practical.

## Test Plan

- `frontend-react`: targeted tests for new utilities/components.
- `frontend-react`: existing React test suite in non-watch mode.
- `frontend-react`: lint and production build.
- Browser/local verification only if a local app can be started without blocking; production is out of bounds.

---
task_slug: nav-company-display
branch: feature/nav-company-display
base_commit: ee60b474c4ef9ba792f4c1a9d1efbe8372b54284
source_artifact_type: plain feature brief
source_artifact_snapshot: "On the navigation bar, I want the name of the company that is being used to be visible."
stage: spec
---

# Navigation Company Display

## Scope

Show the active company name in the authenticated frontend navigation.

## Acceptance Criteria

- Desktop navigation shows a readable company label near the user/account area.
- Mobile drawer shows the same company label in the user section.
- Long company names truncate without breaking the navbar or drawer layout.
- If no company name is available, navigation shows a neutral fallback instead of failing.
- The change does not alter backend routes, auth enforcement, DynamoDB schema, or CDK resources.

## Constraints

- Keep the implementation in `frontend-react/`.
- Prefer existing auth context and navigation patterns.
- Do not introduce a new company selector or tenant-switching behavior.
- Do not broaden API permissions to retrieve companies.

## Non-Goals

- No backend API contract change.
- No company switching UX.
- No changes to device/event behavior.
- No CDK/deployment changes.

## Adversarial Review

- API contract drift: avoid changing auth or companies route responses unless existing data is insufficient.
- Auth / tenant boundaries: only display the company name already associated with the authenticated user context; do not scan all companies for ordinary users.
- Device / event side effects: none expected because this is display-only frontend work.
- DynamoDB impact: none expected.
- CDK / deploy blast radius: none expected.
- Rollback path: revert frontend navigation/auth-context changes.
- Failure modes: missing company name, legacy localStorage user object, or long company name must not break navigation.
- Testability: add focused frontend unit tests for desktop/mobile visible company label or at minimum build/type verification if test harness is not configured for these components.

## Implementation Plan

1. Add optional company fields to the frontend user type and auth context localStorage parsing.
2. Map available auth/login response company fields onto `user`.
3. Render a compact company label in desktop `ResponsiveNavigation`.
4. Render the same label in `MobileNavigation`.
5. Verify with frontend build and targeted tests where practical.

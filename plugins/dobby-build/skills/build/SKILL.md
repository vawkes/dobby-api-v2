---
name: build
description: Use for explicit dobby-api-v2 development requests when you should run the full spec-first Build workflow from source artifact through engineering, review, QA, and PR reporting.
---

# Build

Use this only when explicitly invoked for development work in `dobby-api-v2`.
This workflow is explicit-only and is intended for most repo development tasks.

## Required inputs

- Require one concrete source artifact before design starts:
  - pasted ticket
  - issue text
  - spec note
  - screenshot
  - API example
  - plain feature brief
- If an external ticket or source cannot be fetched directly, stop and require
  pasted content.

## Required references

Read these before moving beyond intake:

- `../../references/repo-map.md`
- `../../references/review-rubric.md`
- `../../references/verification-matrix.md`
- `../../references/artifact-templates.md`
- `../../../../AGENTS.md`

Load sibling role files only when entering that stage:

- `../orchestrator/SKILL.md`
- `../engineer/SKILL.md`
- `../reviewer/SKILL.md`
- `../qa/SKILL.md`

## Workflow

1. Create a fresh worktree from `main`.
2. Classify the approved task into `feature`, `bugfix`, or `chore`.
3. Conduct a strong adversarial interview before implementation.
4. Cover: scope, constraints, non-goals, acceptance criteria, risks, and test
   plan.
5. Challenge the request from these repo-relevant angles:
   - API contract drift
   - auth / tenant boundaries
   - device / event side effects
   - DynamoDB schema / query impact
   - CDK / deploy blast radius
   - rollback path
   - failure modes
   - testability
6. Write and commit the spec to `docs/dev-workflow/specs/YYYY-MM-DD-<slug>.md`.
7. Open a draft PR immediately after the spec commit.
8. If the task is narrow, clear, and assumption-free, proceed. Otherwise require
   explicit user approval of the spec.
9. Run engineering, review, and QA in that order, with the orchestrator
   controlling stage transitions and arbitration.
10. End with local completion plus reported CI status.

## Hard gates

- The orchestrator must not edit application code.
- The engineer is the only code-writing owner.
- The reviewer is read-only.
- QA is non-coding and evidence-based.
- Any contract change requires a committed spec update.
- Production is always out of bounds.

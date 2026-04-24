---
task_slug: dobby-build
branch: chore/dobby-build-design
base_commit: ad257534fe0b37b1f409d9867d58048f23028db2
source_artifact_type: chat-brief
source_artifact_snapshot: "Design a repo-local Build plugin for dobby-api-v2 with a non-coding orchestrator, autonomous engineer/reviewer/qa subagents, committed spec-first workflow, draft PR lifecycle, local-first QA, controlled develop access, and no production access."
stage: spec-approved
---

# Dobby Build Plugin Design

## Summary

Create a repo-local Codex plugin named `dobby-build` with display name `Build`.
`Build` is the only user-facing entrypoint. It orchestrates a full software
development workflow for this repo without editing code itself. It gathers a
concrete source artifact, interviews the user aggressively, adversarially
challenges the requirements, writes and commits a spec, opens a draft PR, then
coordinates engineer, reviewer, and QA subagents until the work is locally
complete and CI status is reported.

## Goals

- Provide one explicit workflow entrypoint for most development work in this
  repo.
- Keep requirements, scope, and decisions stable through a committed spec.
- Separate authority cleanly across orchestration, implementation, review, and
  QA.
- Enforce stronger verification than "looks good" through explicit evidence.
- Integrate with the repo's GitHub flow: fresh branch from `main`, incremental
  commits, draft PR, final CI status reporting.

## Non-Goals

- Do not auto-trigger on ordinary chat. The workflow is explicit-only.
- Do not expose engineer, reviewer, or QA as user-facing entrypoints.
- Do not allow any role to touch production.
- Do not require legacy side-by-side `*.js` or `*.d.ts` outputs in `lambda/`.
- Do not merge branch-only process artifacts into `main`.

## Chosen Approach

Use a repo-local plugin with one public workflow skill and internal role-specific
instructions/resources. Keep task handling mostly universal, with lightweight
task classification used only to load repo-specific references and checks.

This was chosen over a single giant skill because role separation is a hard
requirement, and over a fully scripted workflow because the process needs to
remain adaptable while the team learns how the workflow behaves in practice.

## Plugin Structure

Planned structure:

```text
plugins/dobby-build/
  .codex-plugin/plugin.json
  skills/
    build/
      SKILL.md
      agents/openai.yaml
    orchestrator/
      SKILL.md
    engineer/
      SKILL.md
    reviewer/
      SKILL.md
    qa/
      SKILL.md
  references/
    repo-map.md
    review-rubric.md
    verification-matrix.md
    artifact-templates.md
```

V1 should ship without a `scripts/` directory. Add helper scripts only after
real workflow repetition proves they reduce prompt drift or setup noise.

### Public entrypoint

- `Build` is the only user-facing workflow surface.
- It accepts vague prompts, but must require one concrete source artifact before
  design starts.

### Internal roles

- `orchestrator`: owns intake, source capture, adversarial interview, spec
  authoring, arbitration, stage transitions, PR state, and final status.
- `engineer`: owns all code changes and integration. It may spawn helper worker
  agents only when write scopes are clearly disjoint.
- `reviewer`: read-only. It inspects code, runs checks, and emits findings only.
- `qa`: non-coding. It validates against the approved spec and reports evidence.

## Source Intake Rules

- Minimum starting input is one concrete artifact:
  - pasted ticket text
  - issue text
  - spec note
  - screenshot
  - API example
  - plain feature brief
- If the request cites an external artifact the workflow cannot fetch directly
  (for example Trello), it must stop and require pasted content.
- The orchestrator snapshots the source artifact into the spec frontmatter and
  uses it as the start of the contract.

## Control Flow

1. User invokes `Build`.
2. Orchestrator creates a fresh worktree from `main`.
3. Orchestrator chooses branch naming from approved task type:
   - `feature/<slug>`
   - `bugfix/<slug>`
   - `chore/<slug>`
4. Orchestrator gathers the source artifact and runs a strong adversarial
   interview.
5. Orchestrator writes a spec to `docs/dev-workflow/specs/` and commits it.
6. Orchestrator opens a draft PR immediately after the spec commit.
7. If the spec is approved, or narrowly scoped and unambiguous, the
   orchestrator spawns the engineer.
8. Engineer implements with incremental commits.
9. Reviewer runs a read-only pass and emits structured findings.
10. Orchestrator arbitrates disagreements and updates the spec whenever the
    agreed contract changes.
11. The engineer/reviewer loop repeats up to three cycles.
12. QA runs the verification matrix and returns evidence.
13. If QA fails, the orchestrator decides whether to reopen engineering,
    review, or requirements.
14. Workflow ends with local completion plus reported CI status from the draft
    PR.

## Artifact Model

### Committed artifact

- Spec path:
  - `docs/dev-workflow/specs/YYYY-MM-DD-<slug>.md`
- Specs are merged into `main`.

### Branch-only artifacts

- Decision log path:
  - `docs/dev-workflow/decisions/YYYY-MM-DD-<slug>.md`
- QA report path:
  - `docs/dev-workflow/qa/YYYY-MM-DD-<slug>.md`
- These do not merge into `main`.

### Required frontmatter

Every workflow artifact should carry:

- `task_slug`
- `branch`
- `base_commit`
- `source_artifact_type`
- `source_artifact_snapshot`
- `stage`

### PR as live status surface

The draft PR should always reflect:

- current stage
- spec link
- local QA status
- CI status
- residual risks

Suggested stages:

- `intake`
- `spec-drafting`
- `spec-approved`
- `engineering`
- `review-loop`
- `qa`
- `locally-complete`
- `ci-reported`
- `blocked`

## Role Contracts

### Orchestrator

- May write non-code artifacts only:
  - spec
  - decision log
  - QA plan/report scaffolding
  - PR summary/status updates
- Must never edit application code.
- Owns arbitration between reviewer and engineer.
- Must update the committed spec whenever the agreed contract changes.
- Must stop only for:
  - requirements contradiction
  - missing external credential/system
  - unsafe/destructive action

### Engineer

- Sole owner of code changes.
- Must not code before the committed spec exists.
- Must stop immediately on a requirements contradiction and return control to
  the orchestrator.
- Must add or update automated verification for every task through the
  applicable layer.
- Must commit incrementally with meaningful, stage-based commit messages.

### Reviewer

- Strictly read-only.
- May inspect code and run checks.
- Must never edit files.
- Every review must include:
  - blocking findings
  - residual risks / untested areas
- Each finding should include:
  - severity
  - evidence
  - repo-specific risk area
  - concrete expected fix

### QA

- Strictly non-coding.
- Validates against the approved spec, not informal chat state.
- May reopen only through the orchestrator.
- Must produce explicit evidence, not conclusions alone.

## Interview and Spec Rules

The orchestrator should default to a strong adversarial interview. It should not
finish the interview until it has covered:

- problem and scope
- constraints
- non-goals
- acceptance criteria
- risks
- test plan

It must also challenge the design from repo-relevant angles:

- API contract drift
- auth and tenant boundaries
- device and event side effects
- DynamoDB schema and query impact
- CDK/deploy blast radius
- rollback path
- failure modes
- testability

The orchestrator may proceed without explicit user approval only when the task
is narrow, the spec is clear, and there are no unresolved assumptions.

## Review and Repair Loop

- Max three engineer/reviewer cycles.
- After cycle 2, reviewer must consolidate blockers into one list.
- After cycle 3, orchestrator must decide between:
  - reopening design
  - escalating to the user
  - explicitly rejecting reviewer findings with rationale

## Verification Matrix

Every task ends with an explicit matrix where each line is marked `run`,
`not applicable`, or `blocked`.

Relevant lines include:

- unit tests
- integration tests
- build/lint/type checks
- API verification via `curl`
- browser verification via Playwright
- manual verification, only when unavoidable

Rule: local-first, surface-specific verification.

- QA should run only the applicable subset, but must always produce evidence.
- GitHub PR checks are reported at the end, but failing CI does not
  automatically reopen the loop.

## Environment Policy

### Local and develop

- Local validation is the default.
- QA may use the `develop` environment when local evidence is insufficient.
- `develop` writes/deploys are allowed autonomously only with a preflight note.

### Required preflight for develop mutation

- reason local evidence is insufficient
- target resources
- expected blast radius
- verification plan
- rollback/cleanup plan

### Production

- Production is always out of bounds.
- No production deploys, writes, or verification exceptions.

## Repo-Specific Rules

- Treat this workflow as applicable to most development in this repo.
- Prefer TypeScript-only edits.
- Treat committed side-by-side `*.js` and `*.d.ts` in `lambda/` as legacy repo
  noise, not required outputs.
- Use lightweight task classification only to load the right references and
  checks, not to split the workflow into separate user-facing lanes.
- Use fresh worktrees from `main` by default, even when the user's current
  checkout has unrelated changes.

## Acceptance Criteria

- A repo-local plugin named `dobby-build` can be scaffolded from this design.
- `Build` is the only public entrypoint.
- The workflow writes and commits a spec before code implementation starts.
- The workflow opens a draft PR immediately after the spec commit.
- The engineer is the only coding owner.
- The reviewer is read-only.
- QA is non-coding and evidence-based.
- Spec changes update the committed spec.
- Decision logs and QA reports remain branch-only.
- The workflow supports local-first QA and controlled `develop` usage.
- The workflow forbids all production access.
- The workflow respects repo Git rules and TS-only editing expectations.

## Risks

- Overly aggressive interviewing could slow narrow tasks.
  - Mitigation: allow skip of explicit user approval only for truly narrow,
    assumption-free specs.
- Reviewer findings could loop on style over substance.
  - Mitigation: require severity, evidence, repo risk area, and concrete fix
    expectation.
- Autonomous `develop` access could be abused.
  - Mitigation: preflight artifact, explicit blast radius, and rollback/cleanup.
- PR state could drift from artifact state.
  - Mitigation: markdown artifacts are the system of record; PR is the summary
    surface.

## Test Plan for Plugin Implementation

- Validate plugin scaffold shape:
  - plugin manifest exists
  - public vs internal role structure is correct
- Validate orchestrator prompt behavior on representative prompts:
  - vague feature request
  - pasted ticket
  - missing source artifact
- Validate control flow:
  - spec written before code phase
  - draft PR opens after spec commit
  - reviewer remains read-only
  - QA reopens through orchestrator only
- Validate repo-specific rules:
  - branch from `main`
  - branch naming matches task type
  - TS-only guidance is loaded
  - production is blocked
- Validate evidence output:
  - verification matrix emitted
  - CI status reported separately from local completion

## V1 Decisions

- Use the standard repo-local plugin scaffold shape for
  `.codex-plugin/plugin.json` and marketplace metadata.
- Do not add helper scripts in v1.
- Start with simple markdown templates in plugin references for decision logs,
  QA reports, and PR summaries, then tighten them only after real usage shows
  gaps.

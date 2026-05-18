# Codex Linear Setup

This repo is prepared for the built-in Codex + Linear workflow:

```text
Linear issue -> @Codex or delegate -> Codex Cloud task -> tested diff -> PR for review
```

## Accounts And Integrations

1. In ChatGPT, open Codex settings and connect GitHub.
2. Enable Codex Cloud Tasks for the GitHub repository `dobby-api-v2`.
3. Install the Codex agent in Linear from Codex settings.
4. In Linear, enable the GitHub integration for this repository so PRs link back
   to issues.
5. Optional but recommended: enable Codex code review for this repository.

## Codex Cloud Environment

Create one environment for this repository:

- Name: `dobby-api-v2`
- Repository: `dobby-api-v2`
- Base branch: `main`
- Runtime: Node.js 22
- Bun: 1.2.2 when package version pinning is available
- Agent internet access: off by default

Setup script:

```bash
bun install --frozen-lockfile
bun install --cwd frontend-react --frozen-lockfile
cd data-handler-ts && npm ci
```

Maintenance script:

```bash
git fetch origin main
bun install --frozen-lockfile
bun install --cwd frontend-react --frozen-lockfile
cd data-handler-ts && npm ci
```

Only add AWS credentials or deployment secrets after the workflow has proven
itself on code-only PRs. Production credentials should not be available to the
agent.

## Linear Agent Guidance

Add this to Linear workspace or team-level agent guidance:

```md
For code changes in GridCube/Dobby, use GitHub repo `dobby-api-v2` and Codex
environment `dobby-api-v2`.

Follow the repository `AGENTS.md`. Treat the Linear issue as the source artifact.
Use branch names like `feature/<issue-key>-<slug>`,
`bugfix/<issue-key>-<slug>`, or `chore/<issue-key>-<slug>`.

Do not deploy to production or mutate production AWS resources. Do not deploy to
develop unless the issue explicitly requests it.

Before opening or updating a PR, run the relevant verification:

- Root/API: `bun run build` and `bun run test:unit`
- Frontend: `cd frontend-react && bun run lint && bun run build`
- Data handler: `cd data-handler-ts && npm test && npm run build`
- CDK/infra: `bun run cdk synth --all --context environment=develop`

PR descriptions must link the Linear issue, summarize changed areas, list the
verification commands and results, and call out residual risks.
```

## Smoke Test Issue

Create a low-risk Linear issue and assign or mention `@Codex`:

```md
Title: Verify Codex Linear workflow with docs-only PR

Please make a docs-only change in `docs/operations/codex-linear-setup.md` by
adding one sentence under "Smoke Test Issue" confirming the workflow was tested.
Follow `AGENTS.md`, open a PR, and include verification notes. Do not modify
application code and do not deploy.
```

Expected result:

- Codex posts progress in Linear.
- Codex creates a cloud task in the `dobby-api-v2` environment.
- A GitHub PR is created or a Codex task link is posted for PR creation,
  depending on the current Codex Linear flow.
- The PR links back to the Linear issue.

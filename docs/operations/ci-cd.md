# CI/CD

## Test Workflows

- `.github/workflows/ci.yml`
- `.github/workflows/test.yml`

Both run Bun-based test checks.

## Deploy Workflow

- `.github/workflows/deploy.yml`

Manual trigger (`workflow_dispatch`) with:
- `environment`: `develop` or `production`
- `diff_only`: `true` or `false`

Deploy step always uses the same command as local:

```bash
bun run deploy --env <develop|production> --ci
```

Diff mode:

```bash
bun run deploy --env <develop|production> --ci --diff-only
```

## Required GitHub Secrets

- `AWS_ROLE_TO_ASSUME_DEVELOP`
- `AWS_ROLE_TO_ASSUME_PRODUCTION`

Optional repo variable:
- `AWS_REGION` (defaults to `us-east-1`)

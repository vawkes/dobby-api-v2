# Deployment

Single deploy action for backend, frontend, and data layer:

```bash
bun run deploy --env develop
bun run deploy --env production
```

This command:
1. Builds frontend (`frontend-react`) for the target env.
2. Deploys all CDK stacks (`CertificateStack`, `DobbyApiV2Stack`, `ReactFrontendStack`).
3. Includes API + data handler + watchdog + frontend infra in one run.

## Command

```bash
bun run deploy --env <develop|production> [options]
```

Options:
- `--ci`: CI mode. Skips local-only behavior and uses ambient AWS creds.
- `--profile <name>`: Override AWS profile (local use).
- `--diff-only`: Run `cdk diff` instead of deploy.
- `-- <extra cdk args>`: Pass args directly to CDK.

Examples:

```bash
# local
bun run deploy --env develop

# local with explicit profile override
bun run deploy --env production --profile dobby_production

# CI deploy
bun run deploy --env develop --ci

# CI diff
bun run deploy --env production --ci --diff-only
```

## Environment Source of Truth

`deployment/config.ts` defines:
- account
- region
- default local profile
- domain config
- tags

## Prereqs

1. Bun installed.
2. Local: AWS profiles configured (`dobby_develop`, `dobby_production`) or pass `--profile`.
3. CI: AWS credentials provided by role/OIDC or env vars.
4. CDK bootstrapped in target account/region.

## Destroy

```bash
bun run destroy:develop
bun run destroy:production
```

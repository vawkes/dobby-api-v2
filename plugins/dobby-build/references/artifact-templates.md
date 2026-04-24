# Artifact Templates

## Spec Frontmatter

```yaml
---
task_slug:
branch:
base_commit:
source_artifact_type:
source_artifact_snapshot:
stage:
---
```

## Decision Log Template

```md
---
task_slug:
branch:
base_commit:
stage:
---

# Decision Log

## Entry

- date:
- trigger:
- decision:
- downstream reruns:
```

## QA Report Template

```md
---
task_slug:
branch:
base_commit:
stage: qa
---

# QA Report

## Verification Matrix

- unit:
- integration:
- build/lint/type:
- curl/api:
- playwright:
- manual:

## Evidence

- commands:
- outputs:
- residual risks:
```

## Develop Preflight Template

```md
## Develop Preflight

- reason local evidence is insufficient:
- target resources:
- expected blast radius:
- verification plan:
- rollback / cleanup plan:
```

## PR Summary Template

```md
- spec:
- current stage:
- local status:
- ci status:
- residual risks:
```

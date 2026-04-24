# Review Rubric

Every review must include:

- blocking findings, if any
- residual risks / untested areas

Every blocking finding should include:

- severity
- evidence
- repo-specific risk area
- concrete expected fix

## Repo-Specific Risk Areas

- API contract drift
- auth / permission impact
- device or event side effects
- DynamoDB schema / repository impact
- CDK / deployment blast radius
- frontend / API integration regressions

## Review Rules

- Reviewer is strictly read-only.
- Reviewer may run checks but may not edit files.
- After review cycle 2, blockers must be consolidated into one list.

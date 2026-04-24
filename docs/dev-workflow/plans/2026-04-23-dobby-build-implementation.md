# Dobby Build Plugin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the repo-local `dobby-build` plugin, its internal role skills, shared references, and validation coverage described in the approved spec.

**Architecture:** Add one repo-local plugin under `plugins/dobby-build`, register it in a repo marketplace, keep `build` as the sole public entry skill, and encode orchestration behavior in role-specific internal skills plus shared references. Validate the scaffold with a Jest test that checks the manifest, marketplace entry, public/internal skill layout, and key policy invariants.

**Tech Stack:** Markdown skills, JSON/YAML plugin metadata, Jest with `ts-jest`, Node filesystem assertions, Git/GitHub workflow files

---

### Task 1: Plan and test the plugin scaffold

**Files:**
- Create: `test/dobby-build-plugin.test.ts`
- Modify: `package.json`
- Test: `test/dobby-build-plugin.test.ts`

- [ ] **Step 1: Write the failing scaffold test**

```ts
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const pluginRoot = path.join(repoRoot, 'plugins', 'dobby-build');
const manifestPath = path.join(pluginRoot, '.codex-plugin', 'plugin.json');
const marketplacePath = path.join(repoRoot, '.agents', 'plugins', 'marketplace.json');

describe('dobby-build plugin scaffold', () => {
  test('creates the plugin manifest and marketplace entry', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(marketplacePath)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `bun run jest test/dobby-build-plugin.test.ts`
Expected: FAIL because `plugins/dobby-build/.codex-plugin/plugin.json` does not exist yet.

- [ ] **Step 3: Add the test to repo unit coverage**

```json
"test:unit": "jest test/dobby-api-v2.test.ts test/role-management.test.ts test/openapi-spec.test.ts test/dobby-build-plugin.test.ts"
```

- [ ] **Step 4: Re-run the targeted test**

Run: `bun run jest test/dobby-build-plugin.test.ts`
Expected: still FAIL for missing plugin files, confirming the test is checking the right gap.

- [ ] **Step 5: Commit the red test**

```bash
git add package.json test/dobby-build-plugin.test.ts
git commit -m "test: add dobby-build scaffold validation"
```

### Task 2: Scaffold the plugin and marketplace

**Files:**
- Create: `plugins/dobby-build/.codex-plugin/plugin.json`
- Create: `.agents/plugins/marketplace.json`
- Create: `plugins/dobby-build/skills/`
- Modify: `test/dobby-build-plugin.test.ts`

- [ ] **Step 1: Generate the base plugin skeleton**

Run:

```bash
python3 /Users/evanbiskey/.codex/skills/.system/plugin-creator/scripts/create_basic_plugin.py \
  dobby-build \
  --with-skills \
  --with-marketplace \
  --category Productivity
```

Expected: `plugins/dobby-build/` and `.agents/plugins/marketplace.json` exist.

- [ ] **Step 2: Replace placeholder manifest values with repo-specific metadata**

```json
{
  "name": "dobby-build",
  "version": "0.1.0",
  "description": "Repo-local development workflow for dobby-api-v2.",
  "skills": "./skills/",
  "interface": {
    "displayName": "Build",
    "shortDescription": "Spec-first repo workflow",
    "longDescription": "Runs spec-first orchestration, engineering, review, and QA for dobby-api-v2.",
    "developerName": "Evan Biskey",
    "category": "Productivity",
    "capabilities": ["Interactive", "Write"]
  }
}
```

- [ ] **Step 3: Normalize the marketplace entry**

```json
{
  "name": "dobby-api-v2",
  "interface": {
    "displayName": "dobby-api-v2 Local Plugins"
  },
  "plugins": [
    {
      "name": "dobby-build",
      "source": {
        "source": "local",
        "path": "./plugins/dobby-build"
      },
      "policy": {
        "installation": "AVAILABLE",
        "authentication": "ON_INSTALL"
      },
      "category": "Productivity"
    }
  ]
}
```

- [ ] **Step 4: Extend the Jest test to assert manifest fields and marketplace shape**

```ts
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const marketplace = JSON.parse(fs.readFileSync(marketplacePath, 'utf8'));

expect(manifest.name).toBe('dobby-build');
expect(manifest.interface.displayName).toBe('Build');
expect(marketplace.plugins[0].source.path).toBe('./plugins/dobby-build');
```

- [ ] **Step 5: Commit the scaffold**

```bash
git add .agents/plugins/marketplace.json plugins/dobby-build/.codex-plugin/plugin.json test/dobby-build-plugin.test.ts
git commit -m "feat: scaffold dobby-build plugin"
```

### Task 3: Add shared references and templates

**Files:**
- Create: `plugins/dobby-build/references/repo-map.md`
- Create: `plugins/dobby-build/references/review-rubric.md`
- Create: `plugins/dobby-build/references/verification-matrix.md`
- Create: `plugins/dobby-build/references/artifact-templates.md`
- Test: `test/dobby-build-plugin.test.ts`

- [ ] **Step 1: Write repo guidance references from the approved spec**

```md
# Repo Map

- API: `lambda/`
- Shared data: `shared/`
- Infra: `lib/`, `deployment/`
- Frontend: `frontend-react/`
- Tests: `test/`
```

- [ ] **Step 2: Add the review rubric and verification matrix**

```md
# Review Rubric

- auth/permission impact
- DynamoDB/repository impact
- CDK/deploy impact
- frontend/API integration impact
```

```md
# Verification Matrix

- unit
- integration
- build/lint/type checks
- curl/api
- playwright
- manual
```

- [ ] **Step 3: Add artifact templates for decision logs, QA reports, and PR summaries**

```md
## Decision Log Template

---
task_slug:
branch:
base_commit:
stage:
---
```

- [ ] **Step 4: Extend the Jest test to assert reference files exist**

```ts
for (const relPath of [
  'references/repo-map.md',
  'references/review-rubric.md',
  'references/verification-matrix.md',
  'references/artifact-templates.md'
]) {
  expect(fs.existsSync(path.join(pluginRoot, relPath))).toBe(true);
}
```

- [ ] **Step 5: Commit the shared references**

```bash
git add plugins/dobby-build/references test/dobby-build-plugin.test.ts
git commit -m "docs: add dobby-build shared references"
```

### Task 4: Author the public and internal skills

**Files:**
- Create: `plugins/dobby-build/skills/build/SKILL.md`
- Create: `plugins/dobby-build/skills/build/agents/openai.yaml`
- Create: `plugins/dobby-build/skills/orchestrator/SKILL.md`
- Create: `plugins/dobby-build/skills/engineer/SKILL.md`
- Create: `plugins/dobby-build/skills/reviewer/SKILL.md`
- Create: `plugins/dobby-build/skills/qa/SKILL.md`
- Test: `test/dobby-build-plugin.test.ts`

- [ ] **Step 1: Initialize the public `build` skill**

Run:

```bash
python3 /Users/evanbiskey/.codex/skills/.system/skill-creator/scripts/init_skill.py \
  build \
  --path plugins/dobby-build/skills \
  --resources references \
  --interface display_name=Build \
  --interface short_description="Spec-first repo workflow" \
  --interface default_prompt='Use $build to implement a new dobby-api-v2 feature from a pasted ticket.'
```

- [ ] **Step 2: Write `build` skill instructions that expose only the orchestrator workflow**

```md
---
name: build
description: Use for explicit development requests in dobby-api-v2 that should run the full spec-first Build workflow.
---
```

- [ ] **Step 3: Create internal role skills**

```md
---
name: orchestrator
description: Internal role for intake, adversarial design, arbitration, and stage control in dobby-build.
---
```

Repeat for `engineer`, `reviewer`, and `qa`, with role-specific constraints from the spec.

- [ ] **Step 4: Extend the Jest test to assert skill presence and public/internal boundaries**

```ts
expect(fs.existsSync(path.join(pluginRoot, 'skills', 'build', 'SKILL.md'))).toBe(true);
for (const skillName of ['orchestrator', 'engineer', 'reviewer', 'qa']) {
  expect(fs.existsSync(path.join(pluginRoot, 'skills', skillName, 'SKILL.md'))).toBe(true);
}
```

- [ ] **Step 5: Commit the skills**

```bash
git add plugins/dobby-build/skills test/dobby-build-plugin.test.ts
git commit -m "feat: add dobby-build workflow skills"
```

### Task 5: Validate and finalize

**Files:**
- Modify: `docs/dev-workflow/specs/2026-04-23-dobby-build-design.md`
- Test: `test/dobby-build-plugin.test.ts`

- [ ] **Step 1: Mark the spec as approved/executing**

Update frontmatter:

```yaml
stage: spec-approved
```

- [ ] **Step 2: Run targeted validation**

Run:

```bash
bun run jest test/dobby-build-plugin.test.ts
python3 /Users/evanbiskey/.codex/skills/.system/skill-creator/scripts/quick_validate.py plugins/dobby-build/skills/build
```

Expected: PASS for the Jest test; skill validation exits 0.

- [ ] **Step 3: Run broader repo checks that cover changed surfaces**

Run:

```bash
bun run test:unit
```

Expected: PASS, including `test/dobby-build-plugin.test.ts`.

- [ ] **Step 4: Commit the green state**

```bash
git add docs/dev-workflow/specs/2026-04-23-dobby-build-design.md package.json test/dobby-build-plugin.test.ts plugins/dobby-build .agents/plugins/marketplace.json
git commit -m "feat: implement dobby-build plugin"
```

- [ ] **Step 5: Publish the branch**

Run:

```bash
git push -u origin chore/dobby-build-design
```

Then open a draft PR summarizing:

```md
- spec: `docs/dev-workflow/specs/2026-04-23-dobby-build-design.md`
- local status: complete
- ci status: pending
- residual risks: workflow behavior still needs real task usage
```

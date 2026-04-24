import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';

const repoRoot = path.resolve(__dirname, '..');
const pluginRoot = path.join(repoRoot, 'plugins', 'dobby-build');
const manifestPath = path.join(pluginRoot, '.codex-plugin', 'plugin.json');
const marketplacePath = path.join(repoRoot, '.agents', 'plugins', 'marketplace.json');

function readText(filePath: string): string {
  return fs.readFileSync(filePath, 'utf8');
}

describe('dobby-build plugin scaffold', () => {
  test('creates the plugin manifest and marketplace entry', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    expect(fs.existsSync(marketplacePath)).toBe(true);

    const manifest = JSON.parse(readText(manifestPath));
    const marketplace = JSON.parse(readText(marketplacePath));

    expect(manifest.name).toBe('dobby-build');
    expect(manifest.skills).toBe('./skills/');
    expect(manifest.interface.displayName).toBe('Build');

    const entry = marketplace.plugins.find(
      (plugin: { name: string }) => plugin.name === 'dobby-build'
    );

    expect(entry).toBeDefined();
    expect(entry.source.path).toBe('./plugins/dobby-build');
    expect(entry.policy.installation).toBe('AVAILABLE');
    expect(entry.policy.authentication).toBe('ON_INSTALL');
  });

  test('adds shared references', () => {
    const referencePaths = [
      'references/repo-map.md',
      'references/review-rubric.md',
      'references/verification-matrix.md',
      'references/artifact-templates.md'
    ];

    for (const relativePath of referencePaths) {
      expect(fs.existsSync(path.join(pluginRoot, relativePath))).toBe(true);
    }
  });

  test('adds the public build skill and internal role skills', () => {
    expect(fs.existsSync(path.join(pluginRoot, 'skills', 'build', 'SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(pluginRoot, 'skills', 'build', 'agents', 'openai.yaml'))).toBe(
      true
    );
    expect(readText(path.join(pluginRoot, 'skills', 'build', 'agents', 'openai.yaml'))).toMatch(
      /allow_implicit_invocation: false/
    );

    for (const skillName of ['orchestrator', 'engineer', 'reviewer', 'qa']) {
      const skillRoot = path.join(pluginRoot, 'skills', skillName);

      expect(fs.existsSync(path.join(skillRoot, 'SKILL.md'))).toBe(true);
      expect(fs.existsSync(path.join(skillRoot, 'agents', 'openai.yaml'))).toBe(true);
      expect(readText(path.join(skillRoot, 'agents', 'openai.yaml'))).toMatch(
        /allow_implicit_invocation: false/
      );
    }
  });
});

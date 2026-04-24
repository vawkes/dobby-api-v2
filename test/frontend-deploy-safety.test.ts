import { describe, expect, test } from '@jest/globals';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validateFrontendBuildPath } from '../lib/react-frontend-stack';

const repoRoot = path.resolve(__dirname, '..');

function makeTempBuild(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'frontend-build-'));
}

describe('frontend deploy safety', () => {
  test('deploy scripts build the matching frontend artifact before CDK deploy', () => {
    const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));

    expect(packageJson.scripts['deploy:develop']).toContain('scripts/require-node20.ts');
    expect(packageJson.scripts['deploy:production']).toContain('scripts/require-node20.ts');
    expect(packageJson.scripts['deploy:develop']).toContain(
      'bun --cwd frontend-react run build:develop'
    );
    expect(packageJson.scripts['deploy:production']).toContain(
      'bun --cwd frontend-react run build:production'
    );
    expect(packageJson.scripts['deploy:develop'].indexOf('scripts/require-node20.ts')).toBeLessThan(
      packageJson.scripts['deploy:develop'].indexOf('bun --cwd frontend-react run build:develop')
    );
    expect(
      packageJson.scripts['deploy:production'].indexOf('scripts/require-node20.ts')
    ).toBeLessThan(
      packageJson.scripts['deploy:production'].indexOf(
        'bun --cwd frontend-react run build:production'
      )
    );
  });

  test('frontend build validation rejects missing index.html', () => {
    const buildPath = makeTempBuild();
    fs.mkdirSync(path.join(buildPath, 'static', 'js'), { recursive: true });
    fs.writeFileSync(path.join(buildPath, 'static', 'js', 'main.js'), '');

    expect(() => validateFrontendBuildPath(buildPath)).toThrow(/index\.html/);
  });

  test('frontend build validation rejects missing static bundles', () => {
    const buildPath = makeTempBuild();
    fs.writeFileSync(path.join(buildPath, 'index.html'), '<!doctype html>');

    expect(() => validateFrontendBuildPath(buildPath)).toThrow(/static bundle/);
  });

  test('frontend build validation accepts index and static js/css bundles', () => {
    const buildPath = makeTempBuild();
    fs.mkdirSync(path.join(buildPath, 'static', 'js'), { recursive: true });
    fs.mkdirSync(path.join(buildPath, 'static', 'css'), { recursive: true });
    fs.writeFileSync(path.join(buildPath, 'index.html'), '<!doctype html>');
    fs.writeFileSync(path.join(buildPath, 'static', 'js', 'main.js'), '');
    fs.writeFileSync(path.join(buildPath, 'static', 'css', 'main.css'), '');

    expect(validateFrontendBuildPath(buildPath)).toBeUndefined();
  });
});

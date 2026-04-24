import { execFileSync } from 'node:child_process';

const nodeVersion = execFileSync('node', ['-p', 'process.versions.node'], {
  encoding: 'utf8',
}).trim();
const major = Number.parseInt(nodeVersion.split('.')[0] ?? '0', 10);

if (!Number.isFinite(major) || major < 20) {
  console.error(`Node.js 20 or newer is required for deploys. Current version: v${nodeVersion}`);
  process.exit(1);
}

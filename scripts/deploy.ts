#!/usr/bin/env bun

import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { getEnvironmentConfig } from '../deployment/config';

type DeployOptions = {
  env: string;
  ci: boolean;
  profile?: string;
  diffOnly: boolean;
  cdkArgs: string[];
};

function parseArgs(argv: string[]): DeployOptions {
  const args = [...argv];
  const options: DeployOptions = {
    env: 'develop',
    ci: process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true',
    profile: undefined,
    diffOnly: false,
    cdkArgs: [],
  };

  while (args.length > 0) {
    const arg = args.shift();

    if (!arg) continue;

    if (arg === '--') {
      options.cdkArgs.push(...args);
      break;
    }

    if (arg === '--env' || arg === '-e') {
      options.env = args.shift() || options.env;
      continue;
    }

    if (arg.startsWith('--env=')) {
      options.env = arg.split('=')[1] || options.env;
      continue;
    }

    if (arg === '--profile') {
      options.profile = args.shift();
      continue;
    }

    if (arg.startsWith('--profile=')) {
      options.profile = arg.split('=')[1];
      continue;
    }

    if (arg === '--ci') {
      options.ci = true;
      continue;
    }

    if (arg === '--diff-only') {
      options.diffOnly = true;
      continue;
    }

    options.cdkArgs.push(arg);
  }

  return options;
}

function run(command: string, args: string[], cwd = process.cwd()) {
  const result = spawnSync(command, args, {
    cwd,
    stdio: 'inherit',
    env: process.env,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

const options = parseArgs(process.argv.slice(2));
const envConfig = getEnvironmentConfig(options.env);
const rootDir = process.cwd();
const frontendDir = path.join(rootDir, 'frontend-react');
const frontendBuildPath = path.resolve(frontendDir, 'build');
const frontendBuildCommand =
  options.env === 'production' ? 'build:production' : 'build:develop';

console.log(`Deploy environment: ${envConfig.name}`);
console.log(`Execution mode: ${options.ci ? 'ci' : 'local'}`);

console.log('Installing frontend dependencies...');
run('bun', ['install'], frontendDir);

console.log(`Building frontend (${frontendBuildCommand})...`);
run('bun', ['run', frontendBuildCommand], frontendDir);

if (!existsSync(frontendBuildPath)) {
  console.error(`Frontend build output not found: ${frontendBuildPath}`);
  process.exit(1);
}

const cdkCommand = options.diffOnly ? 'diff' : 'deploy';
const cdkBaseArgs = [
  'cdk',
  cdkCommand,
  '--all',
  '-c',
  `environment=${envConfig.name}`,
  '-c',
  `frontendBuildPath=${frontendBuildPath}`,
];

if (!options.diffOnly) {
  cdkBaseArgs.push('--require-approval', 'never');
}

if (!options.ci) {
  cdkBaseArgs.push('--progress', 'events');
}

const resolvedProfile = options.profile || (!options.ci ? envConfig.awsProfile : undefined);
if (resolvedProfile) {
  cdkBaseArgs.push('--profile', resolvedProfile);
}

if (options.cdkArgs.length > 0) {
  cdkBaseArgs.push(...options.cdkArgs);
}

console.log(`Running CDK ${cdkCommand}...`);
run('bunx', cdkBaseArgs, rootDir);

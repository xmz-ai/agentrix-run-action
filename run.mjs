import { mkdtempSync, readFileSync, rmSync, appendFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const AGENTRIX_RUN_VERSION = '0.2.0';
const AGENTRIX_RUN_PACKAGE = `@agentrix/agentrix-run@${AGENTRIX_RUN_VERSION}`;

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(name) {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function appendOptionalArg(args, flag, value) {
  if (value) {
    args.push(flag, value);
  }
}

function buildChildEnv() {
  const env = { ...process.env };
  const apiKey = getRequiredEnv('INPUT_API_KEY');
  const gitServerId = getOptionalEnv('INPUT_GIT_SERVER_ID');

  env.AGENTRIX_API_KEY = apiKey;
  if (gitServerId) {
    env.AGENTRIX_GIT_SERVER_ID = gitServerId;
  }

  delete env.INPUT_API_KEY;
  delete env.INPUT_GIT_SERVER_ID;
  return env;
}

function writeGithubOutputs(path, data) {
  const delimiter = `__AGENTRIX_RESULT_${Date.now()}_${Math.random().toString(36).slice(2)}__`;
  appendFileSync(
    path,
    [
      `run-id=${typeof data.runId === 'string' ? data.runId : ''}`,
      `status=${typeof data.status === 'string' ? data.status : ''}`,
      `detail-url=${typeof data.detailUrl === 'string' ? data.detailUrl : ''}`,
      `result<<${delimiter}`,
      typeof data.result === 'string' ? data.result : '',
      delimiter,
      `structured-output-json<<${delimiter}`,
      JSON.stringify(data.structuredOutput ?? null),
      delimiter,
      '',
    ].join('\n')
  );
}

function main() {
  const outputPath = getRequiredEnv('GITHUB_OUTPUT');
  const tempDir = mkdtempSync(join(tmpdir(), 'agentrix-github-'));
  const resultFile = join(tempDir, 'result.json');

  try {
    const args = [
      '--yes',
      AGENTRIX_RUN_PACKAGE,
      '--agent',
      getRequiredEnv('INPUT_AGENT'),
    ];

    appendOptionalArg(args, '--title', getOptionalEnv('INPUT_TITLE'));
    appendOptionalArg(args, '--output-schema', getOptionalEnv('INPUT_OUTPUT_SCHEMA'));

    args.push(
      '--prompt',
      getRequiredEnv('INPUT_PROMPT'),
      '--response-mode',
      getOptionalEnv('INPUT_RESPONSE_MODE') ?? 'stream',
      '--result-file',
      resultFile,
      '--base-url',
      getRequiredEnv('INPUT_BASE_URL')
    );

    appendOptionalArg(args, '--repo', getOptionalEnv('INPUT_REPO'));
    appendOptionalArg(args, '--issue-number', getOptionalEnv('INPUT_ISSUE_NUMBER'));
    appendOptionalArg(args, '--timeout', getOptionalEnv('INPUT_TIMEOUT'));
    appendOptionalArg(args, '--capability-profile', getOptionalEnv('INPUT_CAPABILITY_PROFILE'));
    appendOptionalArg(args, '--runner-id', getOptionalEnv('INPUT_RUNNER_ID'));

    const child = spawnSync('npx', args, {
      stdio: 'inherit',
      env: buildChildEnv(),
    });

    if (child.status !== 0) {
      process.exit(child.status ?? 1);
    }

    const result = JSON.parse(readFileSync(resultFile, 'utf8'));
    writeGithubOutputs(outputPath, result);
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

main();

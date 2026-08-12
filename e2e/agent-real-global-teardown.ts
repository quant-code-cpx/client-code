import { execFileSync } from 'node:child_process';
import { resolve as resolvePath } from 'node:path';
import { rmSync, existsSync, readFileSync } from 'node:fs';

type AgentRealE2eState = {
  apiProcessId: number;
  postgresContainer: string;
  redisContainer: string;
};

const STATE_PATH = resolvePath(process.cwd(), 'e2e/.agent-real-state.json');
const AUTH_STATE_PATH = resolvePath(process.cwd(), 'e2e/.auth/agent-real.json');

export default async function globalTeardown(): Promise<void> {
  if (!existsSync(STATE_PATH)) {
    rmSync(AUTH_STATE_PATH, { force: true });
    return;
  }
  const state = JSON.parse(readFileSync(STATE_PATH, 'utf8')) as AgentRealE2eState;
  try {
    process.kill(state.apiProcessId, 'SIGTERM');
  } catch {
    // Backend may already be stopped.
  }
  await new Promise((resolve) => setTimeout(resolve, 1_000));
  for (const container of [state.redisContainer, state.postgresContainer]) {
    try {
      execFileSync('docker', ['rm', '--force', container], { stdio: 'pipe' });
    } catch {
      // Container may already be removed by backend shutdown.
    }
  }
  rmSync(STATE_PATH, { force: true });
  rmSync(AUTH_STATE_PATH, { force: true });
}

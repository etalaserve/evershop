import { execFile } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

const __dirname = path.dirname(fileURLToPath(import.meta.url));
// tests/e2e/shared → repo root (core/)
export const REPO_ROOT = path.join(__dirname, '..', '..', '..');
const CLI = path.join('packages', 'evershop', 'dist', 'bin', 'evershop.js');

export interface CliResult {
  stdout: string;
  stderr: string;
  exitCode: number;
}

/**
 * EverShop's DB layer (`lib/postgres/connection.js`) reads discrete `DB_HOST`
 * / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` env vars, but this suite
 * is configured with a single `DATABASE_URL` (see `.env.example`). A CLI child
 * process therefore started with no credentials and died on
 * `SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string`,
 * failing every theme spec for a reason that had nothing to do with themes.
 *
 * Derive the discrete vars from the URL the suite already has rather than
 * making every developer maintain the same connection in two formats in a
 * gitignored file. Anything already set in the environment wins, so a real
 * `DB_*` setup is never overridden.
 */
function dbEnvFromDatabaseUrl(): NodeJS.ProcessEnv {
  const url = process.env.DATABASE_URL;
  if (!url) return {};
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return {};
  }
  const derived: NodeJS.ProcessEnv = {
    DB_HOST: parsed.hostname,
    DB_PORT: parsed.port || '5432',
    DB_USER: decodeURIComponent(parsed.username),
    DB_PASSWORD: decodeURIComponent(parsed.password),
    DB_NAME: parsed.pathname.replace(/^\//, ''),
    DB_SSLMODE: parsed.searchParams.get('sslmode') ?? 'disable'
  };
  // Don't clobber an explicitly-configured environment.
  for (const key of Object.keys(derived)) {
    if (process.env[key]) delete derived[key];
  }
  return derived;
}

/**
 * Run a compiled `evershop` theme CLI verb as a child process from the repo
 * root, so it picks up `.env`, `config/`, and `themes/` exactly as a real
 * invocation would. Never throws — returns the exit code so specs can assert
 * on both success and failure paths.
 */
export async function runThemeCli(args: string[]): Promise<CliResult> {
  try {
    const { stdout, stderr } = await execFileAsync('node', [CLI, ...args], {
      cwd: REPO_ROOT,
      // Non-TTY child: destructive verbs require --yes, prompts never fire.
      env: { ...process.env, ...dbEnvFromDatabaseUrl() }
    });
    return { stdout, stderr, exitCode: 0 };
  } catch (e) {
    const err = e as { stdout?: string; stderr?: string; code?: number };
    return {
      stdout: err.stdout ?? '',
      stderr: err.stderr ?? '',
      exitCode: typeof err.code === 'number' ? err.code : 1
    };
  }
}

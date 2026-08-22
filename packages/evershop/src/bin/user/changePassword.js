import 'dotenv/config';
import { select, update } from '@evershop/postgres-query-builder';
import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import { error, success } from '../../lib/log/logger.js';
import { pool } from '../../lib/postgres/connection.js';
import { hashPassword } from '../../lib/util/passwordHelper.js';

function isValidPassword(password) {
  return password.length >= 8;
}

// `yargs(hideBin(process.argv))`, not a bare `yargs` — the module export is a
// factory, so calling .option() on it directly throws "yargs.option is not a
// function" before any argument is parsed, failing the command unconditionally.
// Every other CLI in this directory (user:create, theme:*) already uses this
// form; this one was the outlier.
const { argv } = yargs(hideBin(process.argv))
  .option('email', {
    alias: 'e',
    description: 'User email',
    demandOption: true,
    type: 'string',
    validate: (email) => {
      if (email.length === 0) {
        throw new Error('Email is required');
      }
      return true;
    }
  })
  .option('password', {
    alias: 'p',
    description: 'New password',
    demandOption: true,
    type: 'string'
  })
  .check((argv) => {
    if (!isValidPassword(argv.password)) {
      throw new Error(
        'Invalid password. Password must be at least 8 characters long'
      );
    }
    return true;
  })
  .help();

async function updatePassword() {
  const { email, password } = argv;

  try {
    const user = await select()
      .from('admin_user')
      .where('email', '=', email)
      .load(pool);

    if (!user) {
      throw new Error('User not found');
    }
    await update('admin_user')
      .given({
        password: hashPassword(password)
      })
      .where('admin_user_id', '=', user.admin_user_id)
      .execute(pool);
    success('Password is updated successfully');
    await shutdown(0);
  } catch (e) {
    error(e);
    await shutdown(1);
  }
}

/**
 * Close the pool and let the log drain before exiting.
 *
 * Calling process.exit() straight after success()/error() truncated the
 * output: the logger writes asynchronously, so the process was gone before
 * anything reached stdout. That mattered because the exit code carried no
 * information either — the catch branch also exited 0 — leaving a caller
 * with no way at all to tell a completed password change from a failed one.
 * Ending the pool releases the handle keeping the loop alive, so the exit
 * code below is the honest one.
 */
async function shutdown(code) {
  try {
    await pool.end();
  } catch {
    // Already closed, or never opened; the exit code is what matters here.
  }
  process.exit(code);
}

updatePassword();

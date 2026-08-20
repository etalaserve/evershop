import { select } from '@evershop/postgres-query-builder';
import { pool } from '../../../../lib/postgres/connection.js';
import type { AppLoadContext } from '../../../../bin/lib/createStorefrontMiddleware.js';

/**
 * Mirrors `modules/auth/pages/admin/all/[context]auth.js`'s check exactly
 * (same table, same columns, same "logged out or disabled account" test) —
 * reads the SAME `request.session` the legacy pipeline reads, since
 * `context.expressRequest` (see createStorefrontMiddleware.ts's
 * getLoadContext) is the identical Express request object, with the admin
 * `asid` session already attached by addDefaultMiddlewareFuncs.ts's
 * session-middleware before this ever runs.
 */
export interface CurrentAdminUser {
  admin_user_id: number;
  uuid: string;
  email: string;
  full_name: string;
}

export async function getCurrentAdminUser(
  context: AppLoadContext
): Promise<CurrentAdminUser | null> {
  const userID = context.expressRequest.session?.userID as
    | number
    | undefined;
  if (!userID) return null;
  const user = await select()
    .from('admin_user')
    .where('admin_user_id', '=', userID)
    .and('status', '=', 1)
    .load(pool);
  return user
    ? {
        admin_user_id: user.admin_user_id,
        uuid: user.uuid,
        email: user.email,
        full_name: user.full_name ?? ''
      }
    : null;
}

/**
 * Wrapper around `request.loginUserWithEmail` (attached to every Express
 * request by modules/auth/bootstrap.ts). Its error surface is split two
 * ways, both handled here: bad credentials reject the promise it *returns*
 * (thrown inside `services/loginUserWithEmail.ts`, before the callback is
 * ever reached), while a session-persistence failure is reported through
 * the *callback* (`this.session.save(callback)`). Missing either path
 * leaves the caller hanging forever on bad credentials — verified the hard
 * way (a plain callback-only wrapper never settles on a wrong password).
 */
export function loginWithEmail(
  context: AppLoadContext,
  email: string,
  password: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const settle = (error: unknown) => {
      if (error) reject(new Error('Invalid email or password'));
      else resolve();
    };
    (context.expressRequest as any)
      .loginUserWithEmail(email, password, settle)
      .catch(() => reject(new Error('Invalid email or password')));
  });
}

/** Promise wrapper around `request.logoutUser` (also attached by modules/auth/bootstrap.ts). Unlike login, this one never throws before the callback — no dual error path to handle. */
export function logout(context: AppLoadContext): Promise<void> {
  return new Promise((resolve, reject) => {
    (context.expressRequest as any).logoutUser((error: unknown) => {
      if (error) reject(error instanceof Error ? error : new Error(String(error)));
      else resolve();
    });
  });
}

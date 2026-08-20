import { redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { logout } from '~/lib/admin/session.js';
import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';

export async function action({ context }: ActionFunctionArgs) {
  await logout(context as AppLoadContext);
  return redirect('/admin/login');
}

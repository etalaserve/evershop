import { Form, redirect, useActionData, useNavigation } from 'react-router';
import type { ActionFunctionArgs, LoaderFunctionArgs } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Input } from '~/components/ui/input.js';
import { getCurrentAdminUser, loginWithEmail } from '~/lib/admin/session.js';
import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';

/** Already logged in? Skip the form, go straight to the (still legacy) dashboard. */
export async function loader({ context }: LoaderFunctionArgs) {
  const user = await getCurrentAdminUser(context as AppLoadContext);
  if (user) {
    throw redirect('/admin');
  }
  return null;
}

export async function action({ request, context }: ActionFunctionArgs) {
  const formData = await request.formData();
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');
  try {
    await loginWithEmail(context as AppLoadContext, email, password);
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Invalid email or password' };
  }
  // The legacy dashboard (/admin) isn't migrated yet — this correctly falls
  // through to it via the gate in createStorefrontMiddleware.ts.
  return redirect('/admin');
}

export default function AdminLogin() {
  const actionData = useActionData<typeof action>();
  const navigation = useNavigation();
  const submitting = navigation.state === 'submitting';

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-4 py-16">
      {/* Same technique the legacy LoginForm.tsx used: this page has no admin
          shell yet (that's Admin Phase 1+), so hide the storefront's own
          header/footer rather than restructure the whole route tree for one
          page. Revisit once a real admin layout route exists. */}
      <style>{'header, footer { display: none !important; }'}</style>
      <h1 className="mb-6 text-center text-2xl font-semibold">Admin sign in</h1>
      <Form method="post" className="space-y-4">
        <Input type="email" name="email" placeholder="Email" required autoFocus />
        <Input type="password" name="password" placeholder="Password" required />
        {actionData?.error && (
          <p className="text-sm text-destructive">{actionData.error}</p>
        )}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </Form>
    </div>
  );
}

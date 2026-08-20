import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router';
import type { MetaFunction } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Input } from '~/components/ui/input.js';
import { customerLogin } from '~/lib/auth/client.js';
import { buildMeta } from '~/lib/seo.js';

export const meta: MetaFunction = () => buildMeta({ title: 'Sign in', noindex: true });

export default function LoginPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await customerLogin(email, password);
      navigate(searchParams.get('redirect') || '/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          type="email"
          placeholder="Email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Input
          type="password"
          placeholder="Password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        No account?{' '}
        <Link to="/register" className="text-foreground underline">
          Create one
        </Link>
      </p>
    </div>
  );
}

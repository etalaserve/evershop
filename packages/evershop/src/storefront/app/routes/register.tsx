import { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import type { MetaFunction } from 'react-router';

import { Button } from '~/components/ui/button.js';
import { Input } from '~/components/ui/input.js';
import { customerRegister } from '~/lib/auth/client.js';
import { buildMeta } from '~/lib/seo.js';

export const meta: MetaFunction = () => buildMeta({ title: 'Create an account', noindex: true });

export default function RegisterPage() {
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await customerRegister({ email, password, fullName });
      navigate('/account');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create your account');
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 px-4 py-16">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          placeholder="Full name"
          required
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
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
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? 'Creating account…' : 'Create account'}
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link to="/login" className="text-foreground underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}

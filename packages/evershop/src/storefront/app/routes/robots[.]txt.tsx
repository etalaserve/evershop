import type { LoaderFunctionArgs } from 'react-router';

export async function loader({ request }: LoaderFunctionArgs) {
  const origin = new URL(request.url).origin;
  const body = [
    'User-agent: *',
    'Disallow: /cart',
    'Disallow: /checkout',
    'Disallow: /account',
    'Disallow: /login',
    'Disallow: /register',
    'Disallow: /order',
    'Disallow: /search',
    `Sitemap: ${origin}/sitemap.xml`
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain' } });
}

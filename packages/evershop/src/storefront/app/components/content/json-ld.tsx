/** Renders a JSON-LD <script> block. Never interpolate untrusted strings directly into the tag — JSON.stringify already escapes for HTML context via the replacer below. */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}

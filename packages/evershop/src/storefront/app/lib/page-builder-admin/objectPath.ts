/** Minimal dot-path get/set — supports the `link.url`-style nested keys field configs use. */
export function getPath(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((acc, key) => (acc && typeof acc === 'object' ? (acc as Record<string, unknown>)[key] : undefined), obj);
}

export function setPath<T extends Record<string, unknown>>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const next: Record<string, unknown> = { ...obj };
  let cursor = next;
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i];
    const existing = cursor[key];
    const clone = existing && typeof existing === 'object' ? { ...(existing as Record<string, unknown>) } : {};
    cursor[key] = clone;
    cursor = clone;
  }
  cursor[keys[keys.length - 1]] = value;
  return next as T;
}

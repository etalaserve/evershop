import { data, redirect } from 'react-router';
import type { ActionFunctionArgs } from 'react-router';

import { getCurrentAdminUser } from '~/lib/admin/session.js';
import { processAndSaveImage } from '~/lib/admin/uploadImage.js';
import type { AppLoadContext } from '../../../bin/lib/createStorefrontMiddleware.js';

const MAX_BYTES = 15 * 1024 * 1024; // 15MB — generous ceiling for a source photo before it gets resized down
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif']);

/**
 * Resource route (no default export — action-only) backing every admin
 * image field: `POST /admin/uploads`, multipart `file` field, returns
 * `{url, width, height}`. See `lib/admin/uploadImage.ts` for the actual
 * resize/WebP pipeline.
 */
export async function action({ request, context }: ActionFunctionArgs) {
  const user = await getCurrentAdminUser(context as AppLoadContext);
  if (!user) throw redirect('/admin/login');

  const formData = await request.formData();
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    throw data({ error: 'No file provided' }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    throw data({ error: 'File too large (15MB max)' }, { status: 400 });
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw data({ error: `Unsupported file type: ${file.type}` }, { status: 400 });
  }

  try {
    const result = await processAndSaveImage(file);
    return result;
  } catch (err) {
    throw data({ error: err instanceof Error ? err.message : 'Upload failed' }, { status: 500 });
  }
}

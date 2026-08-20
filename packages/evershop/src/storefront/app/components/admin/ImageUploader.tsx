import { ImagePlus, Loader2, X } from 'lucide-react';
import { useRef, useState } from 'react';

import { imageUrl } from '~/lib/image.js';

/**
 * Uploads through `POST /admin/uploads` (resize + WebP conversion happens
 * server-side, see `lib/admin/uploadImage.ts`) and calls `onChange` with the
 * resulting `/assets/uploads/...` URL. Used everywhere an admin form or the
 * page-builder settings form needs to pick an image — replaces the plain
 * URL text input every image field used before this existed.
 */
export function ImageUploader({ value, onChange, className }: { value: string; onChange: (url: string) => void; className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setIsUploading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/admin/uploads', { method: 'POST', body: formData });
      const body = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(body?.error ?? `Upload failed (${res.status})`);
      }
      onChange(body.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/avif"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = '';
        }}
      />
      {value ? (
        <div className="relative inline-block">
          <img src={imageUrl(value)} alt="" className="h-32 w-32 rounded-md border border-input object-cover" />
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-input bg-background text-muted-foreground hover:text-destructive"
            title="Remove image"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={isUploading}
          className="flex h-32 w-32 flex-col items-center justify-center gap-1 rounded-md border border-dashed border-input text-muted-foreground hover:bg-accent disabled:opacity-50"
        >
          {isUploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
          <span className="text-xs">{isUploading ? 'Uploading…' : 'Upload'}</span>
        </button>
      )}
      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  );
}

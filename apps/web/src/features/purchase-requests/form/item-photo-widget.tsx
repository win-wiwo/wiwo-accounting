import { useRef, useCallback, useEffect } from 'react';
import { Camera, X } from 'lucide-react';

export interface ItemPhotoWidgetProps {
  index: number;
  staged: { file: File; url: string } | null;
  serverPhotoName?: string | null;
  serverPhotoPreviewUrl: string | null;
  onViewServer: () => void;
  onStage: (index: number, file: File) => void;
  onClearStaged: (index: number) => void;
}

const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export function ItemPhotoWidget({
  index,
  staged,
  serverPhotoName,
  serverPhotoPreviewUrl,
  onViewServer,
  onStage,
  onClearStaged,
}: ItemPhotoWidgetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onStage(index, file);
    e.target.value = '';
  };

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (ACCEPTED_TYPES.includes(item.type)) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            onStage(index, file);
            return;
          }
        }
      }
    },
    [index, onStage],
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    el.addEventListener('paste', handlePaste);
    return () => el.removeEventListener('paste', handlePaste);
  }, [handlePaste]);

  if (staged) {
    return (
      <div ref={containerRef} tabIndex={-1} className="outline-none">
        <div className="flex items-center gap-2 rounded-lg border border-blue-100 bg-blue-50/40 px-3 py-2">
          <Camera className="h-3.5 w-3.5 text-blue-500 shrink-0" />
          <img
            src={staged.url}
            alt="preview"
            className="h-8 w-8 rounded-md object-cover border border-zinc-200"
          />
          <span className="text-[12px] text-zinc-700 truncate max-w-[140px]">
            {staged.file.name}
          </span>
          <button
            type="button"
            onClick={() => onClearStaged(index)}
            className="h-6 w-6 flex items-center justify-center rounded-md text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors ml-auto"
            aria-label="Remove photo"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      </div>
    );
  }

  if (serverPhotoName) {
    return (
      <div ref={containerRef} tabIndex={-1} className="outline-none">
        <div className="flex items-center gap-2 rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 py-2">
          <Camera className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          {serverPhotoPreviewUrl && (
            <img
              src={serverPhotoPreviewUrl}
              alt="ref"
              className="h-8 w-8 rounded-md object-cover border border-zinc-200"
            />
          )}
          <span className="text-[12px] text-zinc-700 truncate max-w-[140px]">
            {serverPhotoName}
          </span>
          <button
            type="button"
            onClick={onViewServer}
            className="ml-auto inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
          >
            View
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-800 transition-colors"
          >
            Replace
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} tabIndex={-1} className="outline-none space-y-1.5">
      <div className="flex items-center gap-2">
        <Camera className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="inline-flex items-center rounded-md px-2 py-1 text-[12px] font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
        >
          Add reference photo
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
      <p className="text-[11px] text-zinc-400 leading-relaxed">
        Upload a file or paste (Ctrl+V) an image of this specific item, model, or site condition.
      </p>
    </div>
  );
}

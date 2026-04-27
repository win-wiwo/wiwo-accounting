import { useRef } from 'react';
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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onStage(index, file);
    e.target.value = '';
  };

  if (staged) {
    return (
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
        <span className="text-[10px] font-semibold uppercase tracking-[0.06em] text-blue-600">
          Pending save
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
    );
  }

  if (serverPhotoName) {
    return (
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
    );
  }

  return (
    <div className="space-y-1.5">
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
        Use this for an image of this specific item, model, or site condition.
      </p>
    </div>
  );
}

import { useRef } from 'react';
import { Button } from '@/components/ui/button';
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
  index, staged, serverPhotoName, serverPhotoPreviewUrl,
  onViewServer, onStage, onClearStaged,
}: ItemPhotoWidgetProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onStage(index, file);
    e.target.value = '';
  };

  if (staged) {
    return (
      <div className="flex items-center gap-2">
        <Camera className="h-3.5 w-3.5 text-blue-500 shrink-0" />
        <img src={staged.url} alt="preview" className="h-8 w-8 rounded object-cover border" />
        <span className="text-xs text-muted-foreground truncate max-w-[140px]">{staged.file.name}</span>
        <span className="text-[10px] text-blue-600 font-medium">pending save</span>
        <Button
          type="button" variant="ghost" size="icon"
          className="h-6 w-6 text-destructive hover:text-destructive"
          onClick={() => onClearStaged(index)}
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
    );
  }

  if (serverPhotoName) {
    return (
      <div className="flex items-center gap-2">
        <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        {serverPhotoPreviewUrl && (
          <img src={serverPhotoPreviewUrl} alt="ref" className="h-8 w-8 rounded object-cover border" />
        )}
        <span className="text-xs text-muted-foreground truncate max-w-[140px]">{serverPhotoName}</span>
        <Button type="button" variant="ghost" size="sm" className="h-6 text-xs px-2" onClick={onViewServer}>
          View
        </Button>
        <Button
          type="button" variant="ghost" size="sm"
          className="h-6 text-xs px-2 text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          Replace
        </Button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <Camera className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <Button
          type="button" variant="ghost" size="sm"
          className="h-6 text-xs px-2 text-muted-foreground"
          onClick={() => fileInputRef.current?.click()}
        >
          Add reference photo
        </Button>
        <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileChange} />
      </div>
      <p className="text-[11px] text-muted-foreground">
        Use this for an image of this specific item, model, or site condition.
      </p>
    </div>
  );
}

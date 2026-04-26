import { useEffect, useRef, useState, useCallback } from 'react';

export function useStagedFiles() {
  const stagedPhotosRef = useRef<Record<number, { file: File; url: string }>>({});

  const [stagedPhotos, setStagedPhotos] = useState<Record<number, { file: File; url: string }>>({});
  const [photoViewDialog, setPhotoViewDialog] = useState<{ open: boolean; url: string | null }>({ open: false, url: null });

  const stagePhoto = useCallback((index: number, file: File) => {
    setStagedPhotos((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index].url);
      return { ...prev, [index]: { file, url: URL.createObjectURL(file) } };
    });
  }, []);

  const clearStagedPhoto = useCallback((index: number) => {
    setStagedPhotos((prev) => {
      if (prev[index]) URL.revokeObjectURL(prev[index].url);
      const next = { ...prev };
      delete next[index];
      return next;
    });
  }, []);

  // Keep ref in sync for cleanup
  useEffect(() => { stagedPhotosRef.current = stagedPhotos; }, [stagedPhotos]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      Object.values(stagedPhotosRef.current).forEach(({ url }) => URL.revokeObjectURL(url));
    };
  }, []);

  return {
    stagedPhotos,
    photoViewDialog,
    stagePhoto,
    clearStagedPhoto,
    setPhotoViewDialog,
  };
}

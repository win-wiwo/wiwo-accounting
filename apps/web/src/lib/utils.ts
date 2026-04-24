import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function resolvePhotoUrl(photoUrl: string | null | undefined): string | undefined {
  if (!photoUrl) return undefined;
  if (photoUrl.startsWith('http://') || photoUrl.startsWith('https://')) return photoUrl;
  const base = (import.meta.env.VITE_API_URL || '').replace(/\/api$/, '');
  return `${base}${photoUrl}`;
}

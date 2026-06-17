
import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getImageUrl(
  media: string | { url: string } | null | undefined,
  size: 'thumb' | 'medium' | 'original' = 'original'
): string {
  if (!media) return '';
  const url = typeof media === 'string' ? media : media.url;
  if (!url) return '';

  if (url.includes('_original.webp')) {
    if (size === 'thumb') {
      return url.replace('_original.webp', '_thumb.webp');
    }
    if (size === 'medium') {
      return url.replace('_original.webp', '_medium.webp');
    }
  }
  return url;
}

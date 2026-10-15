import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Merge utility classes without letting conflicting hover/padding tokens leak. */
export function cn(...values: ClassValue[]) {
  return twMerge(clsx(values));
}

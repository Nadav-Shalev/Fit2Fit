type ClassValue = string | false | null | undefined;

/**
 * Joins class names, dropping falsy entries.
 * Small enough not to warrant a dependency for it.
 */
export function cn(...values: ClassValue[]): string {
  return values.filter(Boolean).join(' ');
}

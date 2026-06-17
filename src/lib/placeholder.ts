function hashString(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }
  return hash;
}

export interface PlaceholderColors {
  background: string;
  foreground: string;
}

export function placeholderColors(seed: string): PlaceholderColors {
  const hue = hashString(seed || "book") % 360;
  return {
    background: `hsl(${hue} 70% 88%)`,
    foreground: `hsl(${hue} 55% 25%)`,
  };
}

/**
 * The first two letters of a title, uppercased — used for placeholder covers
 * when no image is available. Skips leading non-letter/digit characters (quotes,
 * brackets, etc.) so e.g. "(The) Hobbit" → "TH" rather than "(T".
 */
export function initials(title: string): string {
  const chars = [...(title || "")].filter((c) => /[\p{L}\p{N}]/u.test(c));
  return chars.slice(0, 2).join("").toUpperCase() || "?";
}

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

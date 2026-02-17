function isValidHex(hex: string) {
  const s = hex.trim();
  return /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(s);
}
isValidHex.displayName = "isValidHex";

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let h = hex.replace("#", "");
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const num = parseInt(h, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255,
  };
}
hexToRgb.displayName = "hexToRgb";

/** Convert RGB [0..255] to HSL [0..360, 0..100, 0..100] */
function rgbToHsl(r: number, g: number, b: number) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b);
  let h = 0,
    s = 0;
  const l = (max + min) / 2;
  const d = max - min;
  if (d !== 0) {
    s = d / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case r:
        h = 60 * (((g - b) / d) % 6);
        break;
      case g:
        h = 60 * ((b - r) / d + 2);
        break;
      case b:
        h = 60 * ((r - g) / d + 4);
        break;
    }
  }
  if (h < 0) h += 360;
  return { h, s: s * 100, l: l * 100 };
}
rgbToHsl.displayName = "rgbToHsl";

function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}
clamp.displayName = "clamp";

function stopsFromHex(baseHex: string, count: number): string[] {
  const { r, g, b } = hexToRgb(baseHex);
  const { h, s, l } = rgbToHsl(r, g, b);
  const stops: string[] = [];
  const n = Math.max(1, Math.min(count || 3, 7));
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0 : i / (n - 1);
    const hue = (h + (t - 0.5) * 24 + 360) % 360;
    const sat = clamp(s + (t - 0.5) * 22, 25, 95);
    const lig = clamp(l + (t - 0.5) * 22, 15, 85);
    stops.push(`hsl(${hue} ${sat}% ${lig}%)`);
  }
  return stops;
}
stopsFromHex.displayName = "stopsFromHex";

export { isValidHex, hexToRgb, rgbToHsl, clamp, stopsFromHex };

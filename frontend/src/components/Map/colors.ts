/**
 * Color scales for map layers. Mapped to MapLibre `interpolate` expression stops.
 */

export type LayerKey = "prices" | "carbon" | "interconnection" | "none";

export const NO_DATA_FILL = "rgba(0,0,0,0)";
export const COUNTRY_OUTLINE = "#1f2937";
export const HOVER_OUTLINE = "#fbbf24";
export const WORLD_MASK_COLOR = "#0a0e1a";
export const WORLD_MASK_OPACITY_ACTIVE = 0.78;

export const priceColorStops: Array<[number, string]> = [
  [30, "#10b981"],
  [60, "#84cc16"],
  [90, "#eab308"],
  [120, "#f97316"],
  [160, "#ef4444"],
];

export const carbonColorStops: Array<[number, string]> = [
  [10, "#10b981"],
  [100, "#84cc16"],
  [250, "#eab308"],
  [450, "#f97316"],
  [700, "#ef4444"],
];

export const interconnectionStatusColor: Record<string, string> = {
  exporter: "#10b981",
  balanced: "#3b82f6",
  importer: "#ef4444",
};

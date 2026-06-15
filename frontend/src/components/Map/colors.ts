/**
 * Color scales for map layers. Mapped to MapLibre `interpolate` expression stops.
 */

export type LayerKey = "prices" | "carbon" | "interconnection" | "none";

export const NO_DATA_FILL = "#ffffff";
export const COUNTRY_OUTLINE = "#1f2937";
export const HOVER_OUTLINE = "#fbbf24";

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
  balanced: "#6b7280",
  importer: "#ef4444",
};

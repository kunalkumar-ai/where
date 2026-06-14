export type GridStatus = "Available" | "Congested" | "Full";

export interface Country {
  code: string;
  name: string;
  flag: string;
  powerPrice: number; // €/MWh
  carbon: number; // gCO2/kWh
  grid: GridStatus;
  connectivity: number; // 1-10
  // approximate position on a 1000x800 stylized map (x,y %)
  x: number;
  y: number;
}

export const COUNTRIES: Country[] = [
  { code: "NO", name: "Norway", flag: "🇳🇴", powerPrice: 38, carbon: 20, grid: "Available", connectivity: 8, x: 52, y: 18 },
  { code: "SE", name: "Sweden", flag: "🇸🇪", powerPrice: 41, carbon: 30, grid: "Available", connectivity: 9, x: 58, y: 22 },
  { code: "FI", name: "Finland", flag: "🇫🇮", powerPrice: 42, carbon: 45, grid: "Available", connectivity: 9, x: 66, y: 20 },
  { code: "DK", name: "Denmark", flag: "🇩🇰", powerPrice: 55, carbon: 110, grid: "Congested", connectivity: 9, x: 54, y: 33 },
  { code: "IE", name: "Ireland", flag: "🇮🇪", powerPrice: 96, carbon: 290, grid: "Full", connectivity: 10, x: 22, y: 35 },
  { code: "UK", name: "United Kingdom", flag: "🇬🇧", powerPrice: 102, carbon: 220, grid: "Congested", connectivity: 10, x: 32, y: 35 },
  { code: "NL", name: "Netherlands", flag: "🇳🇱", powerPrice: 87, carbon: 320, grid: "Full", connectivity: 10, x: 47, y: 40 },
  { code: "BE", name: "Belgium", flag: "🇧🇪", powerPrice: 84, carbon: 180, grid: "Congested", connectivity: 9, x: 46, y: 44 },
  { code: "DE", name: "Germany", flag: "🇩🇪", powerPrice: 89, carbon: 350, grid: "Congested", connectivity: 10, x: 55, y: 44 },
  { code: "FR", name: "France", flag: "🇫🇷", powerPrice: 72, carbon: 55, grid: "Available", connectivity: 9, x: 42, y: 52 },
  { code: "ES", name: "Spain", flag: "🇪🇸", powerPrice: 65, carbon: 145, grid: "Available", connectivity: 8, x: 32, y: 68 },
  { code: "PT", name: "Portugal", flag: "🇵🇹", powerPrice: 68, carbon: 130, grid: "Available", connectivity: 7, x: 22, y: 68 },
  { code: "IT", name: "Italy", flag: "🇮🇹", powerPrice: 118, carbon: 240, grid: "Congested", connectivity: 8, x: 56, y: 64 },
  { code: "CH", name: "Switzerland", flag: "🇨🇭", powerPrice: 95, carbon: 35, grid: "Available", connectivity: 9, x: 52, y: 53 },
  { code: "AT", name: "Austria", flag: "🇦🇹", powerPrice: 92, carbon: 90, grid: "Available", connectivity: 8, x: 60, y: 53 },
  { code: "PL", name: "Poland", flag: "🇵🇱", powerPrice: 71, carbon: 650, grid: "Available", connectivity: 7, x: 64, y: 42 },
  { code: "CZ", name: "Czechia", flag: "🇨🇿", powerPrice: 78, carbon: 410, grid: "Available", connectivity: 8, x: 60, y: 47 },
  { code: "RO", name: "Romania", flag: "🇷🇴", powerPrice: 62, carbon: 220, grid: "Available", connectivity: 7, x: 72, y: 53 },
  { code: "GR", name: "Greece", flag: "🇬🇷", powerPrice: 110, carbon: 380, grid: "Congested", connectivity: 6, x: 70, y: 70 },
  { code: "EE", name: "Estonia", flag: "🇪🇪", powerPrice: 58, carbon: 400, grid: "Available", connectivity: 8, x: 68, y: 28 },
];

export const EXISTING_DATA_CENTERS: { name: string; country: string; x: number; y: number }[] = [
  { name: "Dublin Cluster", country: "IE", x: 22, y: 35 },
  { name: "Amsterdam AMS", country: "NL", x: 47, y: 40 },
  { name: "Frankfurt FRA", country: "DE", x: 53, y: 46 },
  { name: "London LON", country: "UK", x: 32, y: 37 },
  { name: "Paris PAR", country: "FR", x: 42, y: 50 },
  { name: "Stockholm STO", country: "SE", x: 60, y: 23 },
  { name: "Oslo OSL", country: "NO", x: 52, y: 20 },
];

export function gridColor(status: GridStatus): string {
  switch (status) {
    case "Available": return "text-success border-success/40 bg-success/10";
    case "Congested": return "text-warning border-warning/40 bg-warning/10";
    case "Full": return "text-destructive border-destructive/40 bg-destructive/10";
  }
}

// scoring helpers
function norm(v: number, min: number, max: number, invert = false) {
  const x = Math.max(0, Math.min(1, (v - min) / (max - min)));
  return invert ? 1 - x : x;
}
const gridScoreMap: Record<GridStatus, number> = { Available: 1, Congested: 0.5, Full: 0.15 };

export interface SubScores { cost: number; carbon: number; grid: number; connectivity: number; }
export function subScores(c: Country): SubScores {
  return {
    cost: norm(c.powerPrice, 30, 130, true) * 100,
    carbon: norm(c.carbon, 10, 700, true) * 100,
    grid: gridScoreMap[c.grid] * 100,
    connectivity: (c.connectivity / 10) * 100,
  };
}

export interface Weights { cost: number; carbon: number; grid: number; connectivity: number; }
export function overallScore(c: Country, w: Weights): number {
  const s = subScores(c);
  const total = w.cost + w.carbon + w.grid + w.connectivity || 1;
  return (
    (s.cost * w.cost + s.carbon * w.carbon + s.grid * w.grid + s.connectivity * w.connectivity) /
    total
  );
}

export function tradeoff(c: Country): string {
  const s = subScores(c);
  const arr = [
    { k: "ultra-low carbon", v: s.carbon },
    { k: "competitive pricing", v: s.cost },
    { k: "abundant grid capacity", v: s.grid },
    { k: "tier-1 fibre", v: s.connectivity },
  ].sort((a, b) => b.v - a.v);
  const weak = arr[arr.length - 1];
  const weakWord =
    weak.k === "ultra-low carbon" ? "higher carbon intensity"
    : weak.k === "competitive pricing" ? "elevated power cost"
    : weak.k === "abundant grid capacity" ? "constrained grid headroom"
    : "lighter connectivity";
  return `Strong ${arr[0].k} and ${arr[1].k}; trade-off is ${weakWord}.`;
}
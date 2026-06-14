import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { COUNTRIES, EXISTING_DATA_CENTERS, gridColor, type Country } from "@/lib/mock-data";
import { Layers, Flame, Leaf, ZapOff, Server, X } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Map · where" },
      { name: "description", content: "Interactive European map of power prices, carbon intensity, grid congestion, and data center connectivity." },
      { property: "og:title", content: "Map · where" },
      { property: "og:description", content: "Interactive European map of power prices, carbon intensity, grid congestion, and data center connectivity." },
    ],
  }),
  component: Index,
});

interface LayerState {
  power: boolean;
  carbon: boolean;
  grid: boolean;
  dcs: boolean;
}

function Index() {
  const [layers, setLayers] = useState<LayerState>({ power: true, carbon: true, grid: true, dcs: true });
  const [selected, setSelected] = useState<Country | null>(null);

  const toggle = (k: keyof LayerState) => setLayers((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      {/* Sidebar */}
      <aside className="w-72 shrink-0 border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Map Layers</h2>
        </div>
        <div className="space-y-1 p-3">
          <LayerToggle label="Power Prices" hint="€/MWh · day-ahead" active={layers.power} onClick={() => toggle("power")} icon={<Flame className="h-3.5 w-3.5" />} color="text-warning" />
          <LayerToggle label="Carbon Intensity" hint="gCO₂/kWh · grid avg" active={layers.carbon} onClick={() => toggle("carbon")} icon={<Leaf className="h-3.5 w-3.5" />} color="text-success" />
          <LayerToggle label="Grid Congestion" hint="TSO availability" active={layers.grid} onClick={() => toggle("grid")} icon={<ZapOff className="h-3.5 w-3.5" />} color="text-destructive" />
          <LayerToggle label="Existing Data Centers" hint={`${EXISTING_DATA_CENTERS.length} hyperscale clusters`} active={layers.dcs} onClick={() => toggle("dcs")} icon={<Server className="h-3.5 w-3.5" />} color="text-primary" />
        </div>

        <div className="mx-3 mt-4 rounded-sm border border-border bg-card p-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Legend</h3>
          <div className="mt-3 space-y-2 text-[11px]">
            <LegendRow label="Available" cls="bg-success" />
            <LegendRow label="Congested" cls="bg-warning" />
            <LegendRow label="Full" cls="bg-destructive" />
          </div>
        </div>

        <div className="mx-3 mt-4 rounded-sm border border-border bg-card p-3 text-[11px] text-muted-foreground">
          <div className="flex justify-between"><span>Coverage</span><span className="tabular text-foreground">30 countries</span></div>
          <div className="flex justify-between mt-1"><span>Last refresh</span><span className="tabular text-foreground">12 min ago</span></div>
          <div className="flex justify-between mt-1"><span>Data sources</span><span className="tabular text-foreground">ENTSO-E · ElectricityMaps</span></div>
        </div>
      </aside>

      {/* Map */}
      <div className="relative flex-1 overflow-hidden bg-[radial-gradient(ellipse_at_center,oklch(0.22_0.025_260)_0%,oklch(0.15_0.018_260)_70%)]">
        {/* grid backdrop */}
        <svg className="absolute inset-0 h-full w-full opacity-[0.07]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="g" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="currentColor" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#g)" />
        </svg>

        {/* Stylized Europe outline */}
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path
            d="M 18,30 Q 22,20 30,22 L 38,18 Q 48,15 56,16 L 68,18 Q 76,22 78,30 L 82,40 Q 80,52 76,60 L 70,72 Q 60,80 50,78 L 38,76 Q 28,72 22,62 L 18,52 Q 14,40 18,30 Z"
            fill="oklch(0.23 0.025 260)"
            stroke="oklch(0.42 0.05 260)"
            strokeWidth="0.15"
          />
        </svg>

        {/* Country markers */}
        {COUNTRIES.map((c) => (
          <CountryMarker key={c.code} c={c} layers={layers} onClick={() => setSelected(c)} active={selected?.code === c.code} />
        ))}

        {/* Existing DCs */}
        {layers.dcs && EXISTING_DATA_CENTERS.map((d) => (
          <div
            key={d.name}
            className="absolute -translate-x-1/2 -translate-y-1/2"
            style={{ left: `${d.x}%`, top: `${d.y}%` }}
            title={d.name}
          >
            <div className="flex h-3 w-3 items-center justify-center">
              <div className="h-2 w-2 rotate-45 border border-primary bg-primary/40" />
            </div>
          </div>
        ))}

        {/* Map status chrome */}
        <div className="absolute left-4 top-4 flex items-center gap-2 rounded-sm border border-border bg-card/80 px-3 py-1.5 text-[11px] backdrop-blur">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span className="font-medium">Europe</span>
          <span className="text-muted-foreground">· EPSG:3035 · MapLibre stub</span>
        </div>
        <div className="absolute right-4 top-4 flex flex-col gap-1">
          {["+","−"].map((s) => (
            <button key={s} className="flex h-7 w-7 items-center justify-center rounded-sm border border-border bg-card/80 text-sm text-muted-foreground hover:text-foreground">{s}</button>
          ))}
        </div>

        {/* Detail panel */}
        {selected && <DetailPanel c={selected} onClose={() => setSelected(null)} />}
      </div>
    </div>
  );
}

function LayerToggle({ label, hint, active, onClick, icon, color }: { label: string; hint: string; active: boolean; onClick: () => void; icon: React.ReactNode; color: string }) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left transition-colors " +
        (active ? "border-primary/40 bg-primary/5" : "border-border bg-transparent hover:bg-secondary/50")
      }
    >
      <div className="flex items-center gap-2.5">
        <span className={color}>{icon}</span>
        <div>
          <div className="text-[12px] font-medium text-foreground">{label}</div>
          <div className="text-[10px] text-muted-foreground">{hint}</div>
        </div>
      </div>
      <div className={"h-3.5 w-6 rounded-full p-0.5 transition-colors " + (active ? "bg-primary" : "bg-secondary")}>
        <div className={"h-2.5 w-2.5 rounded-full bg-background transition-transform " + (active ? "translate-x-2.5" : "")} />
      </div>
    </button>
  );
}

function LegendRow({ label, cls }: { label: string; cls: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className={"h-2 w-2 rounded-full " + cls} />
      <span className="text-muted-foreground">{label}</span>
    </div>
  );
}

function CountryMarker({ c, layers, onClick, active }: { c: Country; layers: LayerState; onClick: () => void; active: boolean }) {
  // Color logic: prioritize grid if layer on, else carbon, else power
  let dotColor = "bg-muted-foreground";
  if (layers.grid) dotColor = c.grid === "Available" ? "bg-success" : c.grid === "Congested" ? "bg-warning" : "bg-destructive";
  else if (layers.carbon) dotColor = c.carbon < 100 ? "bg-success" : c.carbon < 300 ? "bg-warning" : "bg-destructive";
  else if (layers.power) dotColor = c.powerPrice < 60 ? "bg-success" : c.powerPrice < 90 ? "bg-warning" : "bg-destructive";

  const size = layers.power ? 8 + (130 - Math.min(130, c.powerPrice)) / 12 : 10;

  return (
    <button
      className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer"
      style={{ left: `${c.x}%`, top: `${c.y}%` }}
      onClick={onClick}
    >
      <div className="relative flex items-center justify-center">
        <span className={"absolute rounded-full opacity-30 " + dotColor} style={{ width: size * 2.2, height: size * 2.2 }} />
        <span className={"rounded-full ring-2 ring-background " + dotColor + (active ? " ring-primary" : "")} style={{ width: size, height: size }} />
      </div>
      <div className={"mt-1 whitespace-nowrap text-[10px] font-medium tabular " + (active ? "text-primary" : "text-foreground/80")}>
        {c.flag} {c.code}
        {layers.power && <span className="ml-1 text-muted-foreground">€{c.powerPrice}</span>}
      </div>
    </button>
  );
}

function DetailPanel({ c, onClose }: { c: Country; onClose: () => void }) {
  return (
    <div className="absolute inset-x-4 bottom-4 rounded-sm border border-border bg-card/95 backdrop-blur shadow-2xl">
      <div className="flex items-start justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{c.flag}</span>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Country · {c.code}</div>
            <h3 className="text-lg font-semibold tracking-tight">{c.name}</h3>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-sm border border-border bg-background/40 px-2 py-1 font-mono text-[10px] text-muted-foreground">
            src: ENTSO-E · upd 12m ago · conf ±4%
          </span>
          <button onClick={onClose} className="rounded-sm p-1 text-muted-foreground hover:bg-secondary hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border">
        <Metric label="Power Price" value={`€${c.powerPrice}`} unit="/MWh" tone={c.powerPrice < 60 ? "good" : c.powerPrice < 90 ? "warn" : "bad"} />
        <Metric label="Carbon Intensity" value={`${c.carbon}`} unit="gCO₂/kWh" tone={c.carbon < 100 ? "good" : c.carbon < 300 ? "warn" : "bad"} />
        <div className="px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Grid Status</div>
          <div className={"mt-2 inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[12px] font-medium " + gridColor(c.grid)}>
            <span className="h-1.5 w-1.5 rounded-full bg-current" /> {c.grid}
          </div>
        </div>
        <Metric label="Connectivity" value={`${c.connectivity}`} unit="/ 10" tone={c.connectivity >= 8 ? "good" : c.connectivity >= 6 ? "warn" : "bad"} />
      </div>
    </div>
  );
}

function Metric({ label, value, unit, tone }: { label: string; value: string; unit: string; tone: "good" | "warn" | "bad" }) {
  const toneCls = tone === "good" ? "text-success" : tone === "warn" ? "text-warning" : "text-destructive";
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={"text-2xl font-semibold tabular " + toneCls}>{value}</span>
        <span className="text-[11px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Layers, Flame, Leaf, Zap, Wind, X } from "lucide-react";

import { EuropeMap } from "@/components/Map/EuropeMap";
import { type LayerKey, fuelColors } from "@/components/Map/colors";
import {
  fetchAllCountryData,
  type CountryDataMap,
  type CountryData,
  type GenerationMix,
} from "@/lib/api/client";
import { countryDisplay } from "@/lib/countries";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Map · where" },
      {
        name: "description",
        content:
          "Interactive European map of power prices, carbon intensity, and grid interconnection for data center siting.",
      },
    ],
  }),
  component: Index,
});

function Index() {
  const [data, setData] = useState<CountryDataMap>({});
  const [activeLayer, setActiveLayer] = useState<LayerKey>("prices");
  const [selectedIso, setSelectedIso] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAllCountryData()
      .then(setData)
      .catch((e: Error) => setError(e.message));
  }, []);

  const selectedData = selectedIso ? data[selectedIso] : null;
  const countryCount = Object.keys(data).length;

  return (
    <div className="flex h-[calc(100vh-5rem)]">
      <aside className="w-72 shrink-0 border-r border-border bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Layers className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Map Layer</h2>
        </div>
        <div className="space-y-1 p-3">
          <LayerOption
            label="Power Prices"
            hint="€/MWh · annual avg"
            active={activeLayer === "prices"}
            onClick={() => setActiveLayer("prices")}
            icon={<Flame className="h-3.5 w-3.5" />}
            color="text-warning"
          />
          <LayerOption
            label="Carbon Intensity"
            hint="gCO₂/kWh · grid avg"
            active={activeLayer === "carbon"}
            onClick={() => setActiveLayer("carbon")}
            icon={<Leaf className="h-3.5 w-3.5" />}
            color="text-success"
          />
          <LayerOption
            label="Clean Energy %"
            hint="nuclear + renewables"
            active={activeLayer === "clean"}
            onClick={() => setActiveLayer("clean")}
            icon={<Wind className="h-3.5 w-3.5" />}
            color="text-success"
          />
          <LayerOption
            label="Grid Interconnection"
            hint="exporter / importer"
            active={activeLayer === "interconnection"}
            onClick={() => setActiveLayer("interconnection")}
            icon={<Zap className="h-3.5 w-3.5" />}
            color="text-primary"
          />
          <LayerOption
            label="No layer"
            hint="country borders only"
            active={activeLayer === "none"}
            onClick={() => setActiveLayer("none")}
            icon={<Layers className="h-3.5 w-3.5" />}
            color="text-muted-foreground"
          />
        </div>

        <div className="mx-3 mt-4 rounded-sm border border-border bg-card p-3">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Legend</h3>
          <div className="mt-3 space-y-2 text-[11px]">
            {activeLayer === "prices" && <PriceLegend />}
            {activeLayer === "carbon" && <CarbonLegend />}
            {activeLayer === "clean" && <CleanLegend />}
            {activeLayer === "interconnection" && <InterconnectionLegend />}
            {activeLayer === "none" && (
              <div className="text-muted-foreground">
                Browse mode: country borders and labels only. Choose a layer to colour the map.
              </div>
            )}
          </div>
        </div>

        <div className="mx-3 mt-4 rounded-sm border border-border bg-card p-3 text-[11px] text-muted-foreground">
          <div className="flex justify-between">
            <span>Coverage</span>
            <span className="tabular-nums text-foreground">{countryCount} countries</span>
          </div>
          <div className="mt-1 flex justify-between">
            <span>Data sources</span>
            <span className="tabular-nums text-foreground">Ember</span>
          </div>
          <div className="mt-2 text-[10px] leading-relaxed">
            When a data layer is active, only the {countryCount} countries with Ember data are
            shown. The rest of the world is dimmed to focus on the comparable set.
          </div>
        </div>
      </aside>

      <div className="relative flex-1 overflow-hidden">
        <EuropeMap countryData={data} activeLayer={activeLayer} onCountryClick={setSelectedIso} />

        {error && (
          <div className="absolute left-4 top-4 rounded-sm border border-destructive/40 bg-destructive/10 px-3 py-1.5 text-[11px] text-destructive">
            API error: {error}
          </div>
        )}

        {selectedIso && selectedData && (
          <DetailPanel iso3={selectedIso} data={selectedData} onClose={() => setSelectedIso(null)} />
        )}
        {selectedIso && !selectedData && (
          <NoDataPanel iso3={selectedIso} onClose={() => setSelectedIso(null)} />
        )}
      </div>
    </div>
  );
}

function LayerOption({
  label,
  hint,
  active,
  onClick,
  icon,
  color,
}: {
  label: string;
  hint: string;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  color: string;
}) {
  return (
    <button
      onClick={onClick}
      className={
        "flex w-full items-center justify-between rounded-sm border px-3 py-2 text-left transition-colors " +
        (active
          ? "border-primary/40 bg-primary/5"
          : "border-border bg-transparent hover:bg-secondary/50")
      }
    >
      <div className="flex items-center gap-2.5">
        <span className={color}>{icon}</span>
        <div>
          <div className="text-[12px] font-medium text-foreground">{label}</div>
          <div className="text-[10px] text-muted-foreground">{hint}</div>
        </div>
      </div>
      <div
        className={
          "h-3.5 w-3.5 rounded-full border " +
          (active ? "border-primary bg-primary" : "border-border bg-transparent")
        }
      />
    </button>
  );
}

function LegendStops({ stops }: { stops: Array<[string, string]> }) {
  return (
    <div className="space-y-1.5">
      {stops.map(([color, label]) => (
        <div key={label} className="flex items-center gap-2">
          <span className="h-3 w-5 rounded-sm" style={{ backgroundColor: color }} />
          <span className="text-muted-foreground">{label}</span>
        </div>
      ))}
    </div>
  );
}

function PriceLegend() {
  return (
    <LegendStops
      stops={[
        ["#10b981", "≤ €30/MWh"],
        ["#84cc16", "€60"],
        ["#eab308", "€90"],
        ["#f97316", "€120"],
        ["#ef4444", "≥ €160/MWh"],
      ]}
    />
  );
}

function CarbonLegend() {
  return (
    <LegendStops
      stops={[
        ["#10b981", "≤ 10 gCO₂/kWh"],
        ["#84cc16", "100"],
        ["#eab308", "250"],
        ["#f97316", "450"],
        ["#ef4444", "≥ 700 gCO₂/kWh"],
      ]}
    />
  );
}

function CleanLegend() {
  return (
    <LegendStops
      stops={[
        ["#10b981", "100% clean"],
        ["#84cc16", "75%"],
        ["#eab308", "50%"],
        ["#f97316", "25%"],
        ["#ef4444", "0% clean (all fossil)"],
      ]}
    />
  );
}

function InterconnectionLegend() {
  return (
    <LegendStops
      stops={[
        ["#10b981", "Net exporter"],
        ["#3b82f6", "Balanced"],
        ["#ef4444", "Net importer"],
      ]}
    />
  );
}

function DetailPanel({ iso3, data, onClose }: { iso3: string; data: CountryData; onClose: () => void }) {
  const info = countryDisplay(iso3);
  const interconn = "status" in data.interconnection ? data.interconnection : null;
  const gen = "clean_share_pct" in data.generation ? data.generation : null;

  return (
    <div className="absolute inset-x-4 bottom-4 rounded-sm border border-border bg-card/95 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between border-b border-border px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{info.flag}</span>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Country · {iso3}
            </div>
            <h3 className="text-lg font-semibold tracking-tight">{info.name}</h3>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          className="rounded-sm p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="grid grid-cols-4 divide-x divide-border">
        <Metric
          label="Power Price"
          value={`€${data.price_eur_mwh.toFixed(0)}`}
          unit="/MWh"
          tone={data.price_eur_mwh < 60 ? "good" : data.price_eur_mwh < 100 ? "warn" : "bad"}
        />
        <Metric
          label="Carbon Intensity"
          value={`${data.carbon_gco2_kwh.toFixed(0)}`}
          unit="gCO₂/kWh"
          tone={
            data.carbon_gco2_kwh < 100 ? "good" : data.carbon_gco2_kwh < 300 ? "warn" : "bad"
          }
        />
        <Metric
          label="Clean Energy"
          value={gen ? `${gen.clean_share_pct.toFixed(0)}` : "—"}
          unit="%"
          tone={
            !gen
              ? "warn"
              : gen.clean_share_pct >= 75
              ? "good"
              : gen.clean_share_pct >= 40
              ? "warn"
              : "bad"
          }
        />
        <div className="px-5 py-4">
          <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Grid Status
          </div>
          {interconn ? (
            <>
              <div
                className={
                  "mt-2 inline-flex items-center gap-1.5 rounded-sm border px-2 py-1 text-[12px] font-medium " +
                  statusClasses(interconn.status)
                }
              >
                <span className="h-1.5 w-1.5 rounded-full bg-current" />
                {interconn.status}
              </div>
              <div className="mt-1.5 text-[10px] text-muted-foreground tabular-nums">
                {interconn.net_position_twh > 0 ? "+" : ""}
                {interconn.net_position_twh.toFixed(1)} TWh net
              </div>
            </>
          ) : (
            <div className="mt-2 text-[11px] text-muted-foreground">No data</div>
          )}
        </div>
      </div>
      {gen && <FuelMixBar mix={gen.mix_pct} />}
    </div>
  );
}

const FUEL_LABELS: Record<keyof GenerationMix, string> = {
  coal: "Coal",
  other_fossil: "Other Fossil",
  gas: "Gas",
  nuclear: "Nuclear",
  hydro: "Hydro",
  wind: "Wind",
  solar: "Solar",
  bioenergy: "Bioenergy",
  other_renewables: "Other Renew.",
};

const FUEL_ORDER: Array<keyof GenerationMix> = [
  "coal",
  "other_fossil",
  "gas",
  "nuclear",
  "hydro",
  "wind",
  "solar",
  "bioenergy",
  "other_renewables",
];

function FuelMixBar({ mix }: { mix: GenerationMix }) {
  const entries = FUEL_ORDER.filter((k) => mix[k] >= 0.5);
  const total = entries.reduce((s, k) => s + mix[k], 0) || 1;

  return (
    <div className="border-t border-border px-5 py-3">
      <div className="mb-2 text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
        Electricity Generation Mix
      </div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-sm">
        {entries.map((k) => (
          <div
            key={k}
            style={{ width: `${(mix[k] / total) * 100}%`, backgroundColor: fuelColors[k] }}
            title={`${FUEL_LABELS[k]} ${mix[k].toFixed(1)}%`}
          />
        ))}
      </div>
      <div className="mt-2 grid grid-cols-3 gap-x-4 gap-y-1 text-[10px] sm:grid-cols-5">
        {entries.map((k) => (
          <div key={k} className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: fuelColors[k] }} />
            <span className="text-muted-foreground">
              {FUEL_LABELS[k]} <span className="tabular-nums text-foreground">{mix[k].toFixed(1)}%</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function NoDataPanel({ iso3, onClose }: { iso3: string; onClose: () => void }) {
  const info = countryDisplay(iso3);
  return (
    <div className="absolute inset-x-4 bottom-4 rounded-sm border border-border bg-card/95 px-5 py-4 shadow-2xl backdrop-blur">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <span className="text-2xl leading-none">{info.flag}</span>
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">
              Country · {iso3}
            </div>
            <h3 className="text-base font-semibold tracking-tight">{info.name}</h3>
            <p className="mt-1 text-[12px] text-muted-foreground">
              No backend data available for this country yet. See `docs/data-sources.md` country coverage.
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          aria-label="Close detail panel"
          className="rounded-sm p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  tone,
}: {
  label: string;
  value: string;
  unit: string;
  tone: "good" | "warn" | "bad";
}) {
  const toneCls = tone === "good" ? "text-success" : tone === "warn" ? "text-warning" : "text-destructive";
  return (
    <div className="px-5 py-4">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={"text-2xl font-semibold tabular-nums " + toneCls}>{value}</span>
        <span className="text-[11px] text-muted-foreground">{unit}</span>
      </div>
    </div>
  );
}

function statusClasses(status: "exporter" | "importer" | "balanced"): string {
  if (status === "exporter") return "text-success border-success/40 bg-success/10";
  if (status === "importer") return "text-destructive border-destructive/40 bg-destructive/10";
  return "text-muted-foreground border-border bg-muted/20";
}

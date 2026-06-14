import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { COUNTRIES, overallScore, subScores, tradeoff, type Weights } from "@/lib/mock-data";
import { Sparkles, Search, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/recommender")({
  head: () => ({
    meta: [
      { title: "Recommender · where" },
      { name: "description", content: "Rank European countries for new data center capacity by cost, carbon, grid, and connectivity." },
      { property: "og:title", content: "Recommender · where" },
      { property: "og:description", content: "Rank European countries for new data center capacity by cost, carbon, grid, and connectivity." },
    ],
  }),
  component: RecommenderPage,
});

function RecommenderPage() {
  const [mw, setMw] = useState(120);
  const [w, setW] = useState<Weights>({ cost: 30, carbon: 30, grid: 25, connectivity: 15 });
  const [submitted, setSubmitted] = useState<{ mw: number; w: Weights } | null>({ mw: 120, w });

  const total = w.cost + w.carbon + w.grid + w.connectivity;

  const ranked = useMemo(() => {
    if (!submitted) return [];
    return [...COUNTRIES]
      .map((c) => ({ c, score: overallScore(c, submitted.w), sub: subScores(c) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }, [submitted]);

  const setSlider = (k: keyof Weights, v: number) => {
    // rebalance to keep sum=100
    const others = (Object.keys(w) as (keyof Weights)[]).filter((x) => x !== k);
    const remaining = Math.max(0, 100 - v);
    const oldOthersSum = others.reduce((s, x) => s + w[x], 0) || 1;
    const next: Weights = { ...w, [k]: v };
    others.forEach((x) => { next[x] = Math.round((w[x] / oldOthersSum) * remaining); });
    // fix rounding
    const diff = 100 - (next.cost + next.carbon + next.grid + next.connectivity);
    next[others[0]] += diff;
    setW(next);
  };

  return (
    <div className="grid h-[calc(100vh-5rem)] grid-cols-[380px_1fr] divide-x divide-border">
      {/* Input form */}
      <aside className="overflow-y-auto bg-sidebar">
        <SectionHeader icon={<Sparkles className="h-3.5 w-3.5" />}>Brief</SectionHeader>
        <div className="space-y-5 p-5">
          <div>
            <Label>Capacity demand</Label>
            <div className="mt-2 flex items-stretch overflow-hidden rounded-sm border border-border bg-card">
              <input
                type="number"
                min={1}
                max={500}
                value={mw}
                onChange={(e) => setMw(Math.max(1, Math.min(500, Number(e.target.value) || 0)))}
                className="flex-1 bg-transparent px-3 py-2 text-sm tabular outline-none"
              />
              <span className="flex items-center border-l border-border bg-secondary/40 px-3 text-xs text-muted-foreground">MW</span>
            </div>
            <input type="range" min={1} max={500} value={mw} onChange={(e) => setMw(Number(e.target.value))} className="mt-3 w-full accent-[--color-primary]" />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Priority weighting</Label>
              <span className={"text-[11px] tabular " + (total === 100 ? "text-success" : "text-warning")}>{total}% / 100%</span>
            </div>
            <div className="mt-3 space-y-3">
              <WeightSlider label="Cost" value={w.cost} onChange={(v) => setSlider("cost", v)} />
              <WeightSlider label="Carbon" value={w.carbon} onChange={(v) => setSlider("carbon", v)} />
              <WeightSlider label="Grid Availability" value={w.grid} onChange={(v) => setSlider("grid", v)} />
              <WeightSlider label="Connectivity" value={w.connectivity} onChange={(v) => setSlider("connectivity", v)} />
            </div>
          </div>

          <button
            onClick={() => setSubmitted({ mw, w })}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <Search className="h-4 w-4" /> Find Best Locations
          </button>

          <div className="rounded-sm border border-border bg-card p-3 text-[11px] text-muted-foreground">
            Model evaluates {COUNTRIES.length} European jurisdictions across day-ahead pricing, grid CO₂, TSO headroom, and tier-1 fibre. Updated every 15 minutes.
          </div>
        </div>
      </aside>

      {/* Results */}
      <section className="overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Site Recommendations</h1>
            <p className="text-[12px] text-muted-foreground">
              {submitted ? <>Top 5 of {COUNTRIES.length} countries · {submitted.mw} MW · weights cost {submitted.w.cost}% / carbon {submitted.w.carbon}% / grid {submitted.w.grid}% / connectivity {submitted.w.connectivity}%</> : "Configure the brief and run a search"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-sm border border-border bg-card px-2 py-1 font-mono text-[10px] text-muted-foreground">
              MCDA v2.1 · ENTSO-E + EMaps · 14 Jun 14:00 CET
            </span>
            <div className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
              <TrendingUp className="h-3 w-3 text-primary" /> Weighted multi-criteria
            </div>
          </div>
        </div>

        <div className="space-y-3 p-6">
          {ranked.map((r, i) => (
            <article key={r.c.code} className="grid grid-cols-[64px_1fr_220px] items-center gap-5 rounded-sm border border-border bg-card p-5 transition-colors hover:border-primary/30">
              <div className="text-center">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Rank</div>
                <div className={"mt-1 text-3xl font-bold tabular " + (i === 0 ? "text-primary" : "text-foreground")}>#{i + 1}</div>
              </div>
              <div>
                <div className="flex items-baseline gap-3">
                  <span className="text-xl">{r.c.flag}</span>
                  <h3 className="text-base font-semibold tracking-tight">{r.c.name}</h3>
                  <span className="text-[11px] text-muted-foreground tabular">€{r.c.powerPrice}/MWh · {r.c.carbon}gCO₂ · {r.c.grid}</span>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">{tradeoff(r.c)}</p>
                <div className="mt-3 grid grid-cols-4 gap-3">
                  <SubBar label="Cost" v={r.sub.cost} />
                  <SubBar label="Carbon" v={r.sub.carbon} />
                  <SubBar label="Grid" v={r.sub.grid} />
                  <SubBar label="Connectivity" v={r.sub.connectivity} />
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Overall</div>
                <div className={"text-4xl font-bold tabular " + (i === 0 ? "text-primary" : "text-foreground")}>{r.score.toFixed(1)}</div>
                <div className="text-[11px] text-muted-foreground">/ 100</div>
              </div>
            </article>
          ))}

          {submitted && ranked.length > 0 && (
            <div className="mt-6 rounded-sm border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">AI Analysis</span>
              </div>
              <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
                For a {submitted.mw}MW load with your weighting profile, <strong>{ranked[0].c.name}</strong> emerges as the lead candidate driven by {ranked[0].sub.carbon > 80 ? "near-zero carbon intensity" : "balanced grid economics"} and {ranked[0].sub.grid > 70 ? "ample TSO headroom" : "manageable interconnect timelines"}. {ranked[1].c.name} and {ranked[2].c.name} are credible fallbacks if Nordic permitting risk is a concern. Avoid {COUNTRIES.find(c => c.grid === "Full")?.name ?? "saturated markets"} for new builds &gt; 50MW — connection queues exceed 36 months. Consider a phased Nordic-anchor with a {ranked[3]?.c.name ?? "secondary"} backup PPA layer.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-primary">
      {icon}
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{children}</h2>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</label>;
}

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <span className="text-foreground">{label}</span>
        <span className="tabular text-primary">{value}%</span>
      </div>
      <input type="range" min={0} max={100} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[--color-primary]" />
    </div>
  );
}

function SubBar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular text-foreground">{Math.round(v)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary" style={{ width: `${v}%` }} />
      </div>
    </div>
  );
}
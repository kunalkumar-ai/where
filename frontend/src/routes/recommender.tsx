import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Search, TrendingUp, Loader2, AlertTriangle } from "lucide-react";

import {
  fetchRecommendation,
  type RecommendPriorities,
  type RecommendationResponse,
  type CountryScore,
} from "@/lib/api/client";
import { countryDisplay } from "@/lib/countries";

export const Route = createFileRoute("/recommender")({
  head: () => ({
    meta: [
      { title: "Recommender · where" },
      {
        name: "description",
        content:
          "Rank European countries for new data center capacity by cost, carbon, clean energy, and grid availability.",
      },
    ],
  }),
  component: RecommenderPage,
});

type Submitted = { mw: number; priorities: RecommendPriorities };

function RecommenderPage() {
  const [mw, setMw] = useState(100);
  const [priorities, setPriorities] = useState<RecommendPriorities>({
    cost: 30,
    carbon: 30,
    clean: 20,
    grid: 20,
  });
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [result, setResult] = useState<RecommendationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const total = priorities.cost + priorities.carbon + priorities.clean + priorities.grid;

  const handleSetSlider = (k: keyof RecommendPriorities, v: number) => {
    setPriorities((p) => ({ ...p, [k]: v }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    setSubmitted({ mw, priorities });
    try {
      const r = await fetchRecommendation({ mw, priorities, top_n: 5, explain: true });
      setResult(r);
    } catch (e) {
      setError((e as Error).message);
      setResult(null);
    } finally {
      setLoading(false);
    }
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
                max={2000}
                value={mw}
                onChange={(e) =>
                  setMw(Math.max(1, Math.min(2000, Number(e.target.value) || 0)))
                }
                className="flex-1 bg-transparent px-3 py-2 text-sm tabular-nums outline-none"
              />
              <span className="flex items-center border-l border-border bg-secondary/40 px-3 text-xs text-muted-foreground">
                MW
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={500}
              value={mw}
              onChange={(e) => setMw(Number(e.target.value))}
              className="mt-3 w-full accent-[--color-primary]"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Priority weighting</Label>
              <span
                className={
                  "text-[11px] tabular-nums " +
                  (total === 100 ? "text-success" : "text-muted-foreground")
                }
              >
                {total} / 100
              </span>
            </div>
            <div className="mt-3 space-y-3">
              <WeightSlider
                label="Cost"
                hint="Power price €/MWh"
                value={priorities.cost}
                onChange={(v) => handleSetSlider("cost", v)}
              />
              <WeightSlider
                label="Carbon"
                hint="gCO₂/kWh"
                value={priorities.carbon}
                onChange={(v) => handleSetSlider("carbon", v)}
              />
              <WeightSlider
                label="Clean Energy"
                hint="Nuclear + renewables %"
                value={priorities.clean}
                onChange={(v) => handleSetSlider("clean", v)}
              />
              <WeightSlider
                label="Grid Availability"
                hint="Net exporter status"
                value={priorities.grid}
                onChange={(v) => handleSetSlider("grid", v)}
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Analysing…
              </>
            ) : (
              <>
                <Search className="h-4 w-4" /> Find Best Locations
              </>
            )}
          </button>

          <div className="rounded-sm border border-border bg-card p-3 text-[11px] text-muted-foreground">
            Weights are normalised — they don't need to sum to 100. Empty weights = equal.
            Backend scores all European countries with full Ember data, then ranks the top 5.
          </div>
        </div>
      </aside>

      {/* Results */}
      <section className="overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Site Recommendations</h1>
            <p className="text-[12px] text-muted-foreground">
              {submitted && result ? (
                <>
                  Top {result.rankings.length} of {result.countries_evaluated} countries ·{" "}
                  {submitted.mw} MW · grid demand {result.grid_demand_mw} MW · ~
                  {(result.annual_mwh / 1000).toFixed(0)} GWh/year
                </>
              ) : submitted ? (
                <>Running analysis for {submitted.mw} MW…</>
              ) : (
                "Configure the brief and run a search"
              )}
            </p>
          </div>
          <div className="flex items-center gap-1.5 rounded-sm border border-border bg-card px-3 py-1.5 text-[11px] text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-primary" /> Weighted multi-criteria
          </div>
        </div>

        <div className="space-y-3 p-6">
          {!submitted && !loading && (
            <div className="rounded-sm border border-dashed border-border p-8 text-center text-[12px] text-muted-foreground">
              Set capacity and priority weights on the left, then run a search.
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 rounded-sm border border-destructive/40 bg-destructive/10 p-3 text-[12px] text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <div>
                <div className="font-semibold">API error</div>
                <div className="opacity-80">{error}</div>
              </div>
            </div>
          )}

          {loading && !result && (
            <div className="rounded-sm border border-border bg-card p-8 text-center text-[12px] text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
              Scoring countries and generating analysis…
            </div>
          )}

          {result?.rankings.map((r, i) => (
            <RankingCard key={r.iso3} rank={i + 1} score={r} />
          ))}

          {result?.explanation && (
            <div className="mt-6 rounded-sm border border-primary/30 bg-primary/5 p-5">
              <div className="flex items-center gap-2 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
                <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
                  AI Analysis
                </span>
              </div>
              <div className="prose prose-invert prose-sm mt-2 max-w-none text-[13px] leading-relaxed text-foreground/90 whitespace-pre-line">
                {result.explanation}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

function RankingCard({ rank, score }: { rank: number; score: CountryScore }) {
  const info = countryDisplay(score.iso3);
  const m = score.metrics;
  return (
    <article
      className={
        "grid grid-cols-[64px_1fr_220px] items-center gap-5 rounded-sm border bg-card p-5 transition-colors hover:border-primary/30 " +
        (rank === 1 ? "border-primary/40" : "border-border")
      }
    >
      <div className="text-center">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Rank</div>
        <div
          className={
            "mt-1 text-3xl font-bold tabular-nums " +
            (rank === 1 ? "text-primary" : "text-foreground")
          }
        >
          #{rank}
        </div>
      </div>
      <div>
        <div className="flex items-baseline gap-3">
          <span className="text-xl">{info.flag}</span>
          <h3 className="text-base font-semibold tracking-tight">{info.name}</h3>
          <span className="text-[11px] text-muted-foreground tabular-nums">
            €{m.price_eur_mwh.toFixed(0)}/MWh · {m.carbon_gco2_kwh.toFixed(0)} gCO₂ ·{" "}
            {m.clean_share_pct.toFixed(0)}% clean · {m.grid_status}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-3">
          <SubBar label="Cost" v={score.sub_scores.cost} />
          <SubBar label="Carbon" v={score.sub_scores.carbon} />
          <SubBar label="Clean" v={score.sub_scores.clean} />
          <SubBar label="Grid" v={score.sub_scores.grid} />
        </div>
      </div>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Overall</div>
        <div
          className={
            "text-4xl font-bold tabular-nums " +
            (rank === 1 ? "text-primary" : "text-foreground")
          }
        >
          {score.overall.toFixed(1)}
        </div>
        <div className="text-[11px] text-muted-foreground">/ 100</div>
      </div>
    </article>
  );
}

function SectionHeader({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2 border-b border-border px-5 py-3 text-primary">
      {icon}
      <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
        {children}
      </h2>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </label>
  );
}

function WeightSlider({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-[12px]">
        <div>
          <span className="text-foreground">{label}</span>
          <span className="ml-2 text-[10px] text-muted-foreground">{hint}</span>
        </div>
        <span className="tabular-nums text-primary">{value}</span>
      </div>
      <input
        type="range"
        min={0}
        max={100}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 w-full accent-[--color-primary]"
      />
    </div>
  );
}

function SubBar({ label, v }: { label: string; v: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-muted-foreground">
        <span>{label}</span>
        <span className="tabular-nums text-foreground">{Math.round(v)}</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
        <div className="h-full bg-primary" style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
      </div>
    </div>
  );
}

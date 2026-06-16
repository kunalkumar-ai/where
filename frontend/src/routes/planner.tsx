import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Zap, Sparkles, Loader2, AlertTriangle } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import { fetchPlan, type PlanResponse } from "@/lib/api/client";
import { COUNTRY_INFO, countryDisplay } from "@/lib/countries";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner · where" },
      {
        name: "description",
        content:
          "Build a power procurement plan across spot market, PPA, and on-site generation.",
      },
    ],
  }),
  component: PlannerPage,
});

const HORIZONS = [5, 10, 15, 20] as const;

const COUNTRY_OPTIONS = Object.entries(COUNTRY_INFO)
  .map(([iso3, info]) => ({ iso3, ...info }))
  .sort((a, b) => a.name.localeCompare(b.name));

function PlannerPage() {
  const [country, setCountry] = useState("DEU");
  const [mw, setMw] = useState(100);
  const [cleanTarget, setCleanTarget] = useState(90);
  const [horizon, setHorizon] = useState<(typeof HORIZONS)[number]>(10);

  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setLoading(true);
    setError(null);
    try {
      const r = await fetchPlan({
        location: country,
        mw,
        target_clean_pct: cleanTarget,
        contract_years: horizon,
        explain: true,
      });
      setPlan(r);
    } catch (e) {
      setError((e as Error).message);
      setPlan(null);
    } finally {
      setLoading(false);
    }
  };

  const info = countryDisplay(country);

  return (
    <div className="grid h-[calc(100vh-5rem)] grid-cols-[380px_1fr] divide-x divide-border">
      <aside className="overflow-y-auto bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Plan Inputs
          </h2>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <Label>Country</Label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {COUNTRY_OPTIONS.map((c) => (
                <option key={c.iso3} value={c.iso3}>
                  {c.flag}  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label>MW demand</Label>
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
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label>Clean energy target</Label>
              <span className="text-[11px] tabular-nums text-primary">{cleanTarget}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={cleanTarget}
              onChange={(e) => setCleanTarget(Number(e.target.value))}
              className="mt-2 w-full accent-[--color-primary]"
            />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
              <span>0% (any)</span>
              <span>100% (all clean)</span>
            </div>
          </div>

          <div>
            <Label>Contract horizon</Label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={
                    "rounded-sm border px-2 py-2 text-[12px] font-medium tabular-nums transition-colors " +
                    (horizon === h
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground")
                  }
                >
                  {h}y
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-60"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Generating…
              </>
            ) : (
              <>
                <Zap className="h-4 w-4" /> Generate Power Plan
              </>
            )}
          </button>

          <div className="rounded-sm border border-border bg-card p-3 text-[11px] text-muted-foreground leading-relaxed">
            The planner finds the cheapest mix of spot / PPA / on-site that
            meets your clean-energy target. PPA priced at €35/MWh, on-site
            (solar + battery) at €70/MWh effective. On-site capped at 25%.
          </div>
        </div>
      </aside>

      <section className="overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Power Procurement Plan</h1>
            <p className="text-[12px] text-muted-foreground">
              {info.flag} {info.name} · {mw} MW · {horizon}-year horizon · target{" "}
              {cleanTarget}% clean
            </p>
          </div>
        </div>

        <div className="p-6">
          {!plan && !loading && !error && (
            <div className="rounded-sm border border-dashed border-border p-8 text-center text-[12px] text-muted-foreground">
              Configure the plan on the left and click Generate.
            </div>
          )}

          {loading && (
            <div className="rounded-sm border border-border bg-card p-8 text-center text-[12px] text-muted-foreground">
              <Loader2 className="mx-auto mb-3 h-5 w-5 animate-spin text-primary" />
              Optimising mix and generating analysis…
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

          {plan && <PlanView plan={plan} />}
        </div>
      </section>
    </div>
  );
}

function PlanView({ plan }: { plan: PlanResponse }) {
  const mixData = [
    { name: "Spot Market", value: Math.round(plan.mix.spot * 100), color: "#f59e0b" },
    { name: "PPA", value: Math.round(plan.mix.ppa * 100), color: "#3b82f6" },
    { name: "On-site", value: Math.round(plan.mix.onsite * 100), color: "#10b981" },
  ].filter((d) => d.value > 0);

  const spotOnlyCost =
    (plan.country_metrics.price_eur_mwh * plan.annual_mwh) / 1_000_000;
  const savings = spotOnlyCost - plan.annual_cost_meur;

  const costComparison = [
    { label: "100% Spot", value: Math.round(spotOnlyCost) },
    { label: "Optimised mix", value: Math.round(plan.annual_cost_meur) },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-[1fr_1.4fr] gap-4">
        <div className="rounded-sm border border-border bg-card p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
              Power Mix
            </h3>
            <span className="text-[11px] text-muted-foreground tabular-nums">
              Blended €{plan.blended_price_eur_mwh.toFixed(0)}/MWh
            </span>
          </div>
          <div className="mt-2 h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mixData}
                  dataKey="value"
                  innerRadius={55}
                  outerRadius={90}
                  stroke="var(--color-background)"
                  strokeWidth={2}
                >
                  {mixData.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "var(--color-card)",
                    border: "1px solid var(--color-border)",
                    borderRadius: 4,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-3 space-y-1.5">
            {mixData.map((d) => (
              <div key={d.name} className="flex items-center justify-between text-[12px]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm" style={{ background: d.color }} />
                  <span>{d.name}</span>
                </div>
                <span className="tabular-nums text-foreground">{d.value}%</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <MetricCard
            label="Annual Cost"
            value={`€${plan.annual_cost_meur.toFixed(1)}M`}
            hint={`${(plan.annual_mwh / 1000).toFixed(0)} GWh/yr`}
            tone="primary"
          />
          <MetricCard
            label="Carbon Intensity"
            value={`${Math.round(plan.achieved_carbon_gco2_kwh)}`}
            hint="gCO₂/kWh blended"
            tone={
              plan.achieved_carbon_gco2_kwh < 50
                ? "success"
                : plan.achieved_carbon_gco2_kwh < 200
                ? "warning"
                : "destructive"
            }
          />
          <MetricCard
            label="Clean Share"
            value={`${plan.achieved_clean_pct.toFixed(0)}%`}
            hint={`target ${plan.target_clean_pct.toFixed(0)}%`}
            tone={plan.feasible ? "success" : "warning"}
          />

          <div className="col-span-3 rounded-sm border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Annual Cost vs 100% Spot Baseline
              </h3>
              <span className="text-[11px] text-success tabular-nums">
                Saves €{savings.toFixed(1)}M/year
              </span>
            </div>
            <div className="mt-2 h-44">
              <ResponsiveContainer>
                <BarChart data={costComparison}>
                  <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
                  <XAxis
                    dataKey="label"
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                  />
                  <YAxis
                    stroke="var(--color-muted-foreground)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: "var(--color-border)" }}
                    label={{
                      value: "€M/yr",
                      angle: -90,
                      position: "insideLeft",
                      style: { fill: "var(--color-muted-foreground)", fontSize: 11 },
                    }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--color-card)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 4,
                      fontSize: 12,
                    }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {plan.explanation && (
        <div className="rounded-sm border border-primary/30 bg-primary/5 p-5">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-3.5 w-3.5" />
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">
              AI Analysis
            </span>
          </div>
          <div className="mt-2 whitespace-pre-line text-[13px] leading-relaxed text-foreground/90">
            {plan.explanation}
          </div>
        </div>
      )}
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

function MetricCard({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  tone: "primary" | "success" | "warning" | "destructive";
}) {
  const toneCls =
    tone === "primary"
      ? "text-primary"
      : tone === "success"
      ? "text-success"
      : tone === "warning"
      ? "text-warning"
      : "text-destructive";
  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={"mt-2 text-3xl font-bold tabular-nums " + toneCls}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

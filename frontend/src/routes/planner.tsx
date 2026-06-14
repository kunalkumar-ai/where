import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { COUNTRIES } from "@/lib/mock-data";
import { Zap, Sparkles } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";

export const Route = createFileRoute("/planner")({
  head: () => ({
    meta: [
      { title: "Planner · where" },
      { name: "description", content: "Build a power procurement plan across spot market, PPA, and on-site generation." },
      { property: "og:title", content: "Planner · where" },
      { property: "og:description", content: "Build a power procurement plan across spot market, PPA, and on-site generation." },
    ],
  }),
  component: PlannerPage,
});

const HORIZONS = [5, 10, 15, 20] as const;

function PlannerPage() {
  const [country, setCountry] = useState("DE");
  const [mw, setMw] = useState(80);
  const [cleanTarget, setCleanTarget] = useState(70);
  const [horizon, setHorizon] = useState<typeof HORIZONS[number]>(10);
  const [submitted, setSubmitted] = useState({ country: "DE", mw: 80, cleanTarget: 70, horizon: 10 as number });

  const c = COUNTRIES.find((x) => x.code === submitted.country)!;

  const plan = useMemo(() => {
    const cleanPct = submitted.cleanTarget;
    // Mix: more on-site & PPA when clean target high
    const onsite = Math.round(cleanPct * 0.25);
    const ppa = Math.round(cleanPct * 0.55);
    const spot = Math.max(0, 100 - onsite - ppa);
    const hoursYear = 8760;
    const mwh = submitted.mw * hoursYear * 0.92; // 92% utilization
    // Cost per MWh: spot uses country price; PPA cheaper, on-site mid
    const spotPrice = c.powerPrice;
    const ppaPrice = Math.max(35, c.powerPrice * 0.78);
    const onsitePrice = 62;
    const blended = (spot / 100) * spotPrice + (ppa / 100) * ppaPrice + (onsite / 100) * onsitePrice;
    const annualCostM = (mwh * blended) / 1_000_000;
    // Carbon: clean sources ~10 gCO2, spot = country carbon
    const carbon = (spot / 100) * c.carbon + ((ppa + onsite) / 100) * 12;
    return { onsite, ppa, spot, annualCostM, carbon, cleanPct, blended };
  }, [submitted, c]);

  const series = useMemo(() => {
    const years = submitted.horizon;
    return Array.from({ length: years }, (_, i) => {
      const y = i + 1;
      // simulate: cost drifts up 2.5%/yr for spot-heavy, PPAs hedge
      const costDrift = 1 + 0.025 * (plan.spot / 100) * y - 0.005 * (plan.ppa / 100) * y;
      const carbonDrift = Math.max(0.4, 1 - 0.04 * y);
      return {
        year: `Y${y}`,
        cost: +(plan.annualCostM * costDrift).toFixed(1),
        carbon: Math.round(plan.carbon * carbonDrift),
      };
    });
  }, [plan, submitted.horizon]);

  const mixData = [
    { name: "Spot Market", value: plan.spot, color: "var(--color-warning)" },
    { name: "PPA", value: plan.ppa, color: "var(--color-primary)" },
    { name: "On-site", value: plan.onsite, color: "var(--color-success)" },
  ];

  return (
    <div className="grid h-[calc(100vh-5rem)] grid-cols-[380px_1fr] divide-x divide-border">
      <aside className="overflow-y-auto bg-sidebar">
        <div className="flex items-center gap-2 border-b border-border px-5 py-3">
          <Zap className="h-3.5 w-3.5 text-primary" />
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Plan Inputs</h2>
        </div>
        <div className="space-y-5 p-5">
          <div>
            <Label>Country</Label>
            <select
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-2 w-full rounded-sm border border-border bg-card px-3 py-2 text-sm outline-none focus:border-primary"
            >
              {COUNTRIES.map((c) => (
                <option key={c.code} value={c.code}>{c.flag}  {c.name} — €{c.powerPrice}/MWh · {c.carbon}gCO₂</option>
              ))}
            </select>
          </div>

          <div>
            <Label>MW demand</Label>
            <div className="mt-2 flex items-stretch overflow-hidden rounded-sm border border-border bg-card">
              <input type="number" min={1} max={500} value={mw} onChange={(e) => setMw(Math.max(1, Math.min(500, Number(e.target.value) || 0)))} className="flex-1 bg-transparent px-3 py-2 text-sm tabular outline-none" />
              <span className="flex items-center border-l border-border bg-secondary/40 px-3 text-xs text-muted-foreground">MW</span>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between"><Label>Carbon target</Label><span className="text-[11px] tabular text-primary">{cleanTarget}% clean</span></div>
            <input type="range" min={0} max={100} value={cleanTarget} onChange={(e) => setCleanTarget(Number(e.target.value))} className="mt-2 w-full accent-[--color-primary]" />
            <div className="mt-1 flex justify-between text-[10px] text-muted-foreground"><span>Brown</span><span>100% clean</span></div>
          </div>

          <div>
            <Label>Contract horizon</Label>
            <div className="mt-2 grid grid-cols-4 gap-1.5">
              {HORIZONS.map((h) => (
                <button
                  key={h}
                  onClick={() => setHorizon(h)}
                  className={
                    "rounded-sm border px-2 py-2 text-[12px] font-medium tabular transition-colors " +
                    (horizon === h ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")
                  }
                >{h}y</button>
              ))}
            </div>
          </div>

          <button onClick={() => setSubmitted({ country, mw, cleanTarget, horizon })} className="flex w-full items-center justify-center gap-2 rounded-sm bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground hover:bg-primary/90">
            <Zap className="h-4 w-4" /> Generate Power Plan
          </button>
        </div>
      </aside>

      <section className="overflow-y-auto">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Power Procurement Plan</h1>
            <p className="text-[12px] text-muted-foreground">{c.flag} {c.name} · {submitted.mw} MW · {submitted.horizon}-year horizon · target {submitted.cleanTarget}% clean</p>
          </div>
        </div>

        <div className="grid grid-cols-[1fr_1.4fr] gap-4 p-6">
          {/* Donut */}
          <div className="rounded-sm border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Power Mix</h3>
              <span className="text-[11px] text-muted-foreground tabular">Blended €{plan.blended.toFixed(0)}/MWh</span>
            </div>
            <div className="mt-2 h-56">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={mixData} dataKey="value" innerRadius={55} outerRadius={90} stroke="var(--color-background)" strokeWidth={2}>
                    {mixData.map((d) => <Cell key={d.name} fill={d.color} />)}
                  </Pie>
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
                  <span className="tabular text-foreground">{d.value}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <MetricCard label="Annual Cost" value={`€${plan.annualCostM.toFixed(1)}M`} hint={`${(submitted.mw * 8.76 * 0.92).toFixed(0)} GWh/yr`} tone="primary" />
            <MetricCard label="Carbon Intensity" value={`${Math.round(plan.carbon)}`} hint="gCO₂/kWh blended" tone={plan.carbon < 100 ? "success" : plan.carbon < 250 ? "warning" : "destructive"} />
            <MetricCard label="Clean Share" value={`${plan.ppa + plan.onsite}%`} hint={`target ${submitted.cleanTarget}%`} tone="success" />

            <div className="col-span-3 rounded-sm border border-border bg-card p-5">
              <div className="flex items-center justify-between">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Cost vs Carbon Trajectory</h3>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-primary" /> Cost €M</span>
                  <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-warning" /> Carbon gCO₂</span>
                </div>
              </div>
              <div className="mt-2 h-48">
                <ResponsiveContainer>
                  <LineChart data={series}>
                    <CartesianGrid stroke="var(--color-border)" strokeDasharray="2 4" />
                    <XAxis dataKey="year" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <YAxis yAxisId="l" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <YAxis yAxisId="r" orientation="right" stroke="var(--color-muted-foreground)" fontSize={11} tickLine={false} axisLine={{ stroke: "var(--color-border)" }} />
                    <Tooltip contentStyle={{ background: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: 4, fontSize: 12 }} />
                    <Line yAxisId="l" type="monotone" dataKey="cost" stroke="var(--color-primary)" strokeWidth={2} dot={false} />
                    <Line yAxisId="r" type="monotone" dataKey="carbon" stroke="var(--color-warning)" strokeWidth={2} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          <div className="col-span-2 rounded-sm border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center gap-2 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em]">AI Analysis</span>
            </div>
            <p className="mt-2 text-[13px] leading-relaxed text-foreground/90">
              The recommended {plan.ppa}% PPA + {plan.onsite}% on-site mix hedges {c.name}'s spot exposure at €{c.powerPrice}/MWh while delivering a blended cost of €{plan.blended.toFixed(0)}/MWh. Over {submitted.horizon} years, this trajectory reduces effective carbon by ~{Math.round((1 - series[series.length-1].carbon / plan.carbon) * 100)}% as additional renewable PPAs come online. Residual spot exposure of {plan.spot}% provides flexibility for demand-response revenue; consider layering a corporate VPPA from {c.name === "Germany" ? "Iberian solar" : "Nordic hydro"} to push the clean share past {submitted.cleanTarget}% without lengthening payback beyond {Math.max(3, Math.round(submitted.horizon * 0.4))} years.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{children}</label>;
}

function MetricCard({ label, value, hint, tone }: { label: string; value: string; hint: string; tone: "primary" | "success" | "warning" | "destructive" }) {
  const toneCls = tone === "primary" ? "text-primary" : tone === "success" ? "text-success" : tone === "warning" ? "text-warning" : "text-destructive";
  return (
    <div className="rounded-sm border border-border bg-card p-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={"mt-2 text-3xl font-bold tabular " + toneCls}>{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}
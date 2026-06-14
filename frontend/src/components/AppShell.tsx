import { Link, useRouterState } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Map as MapIcon, Sparkles, Zap } from "lucide-react";
import logo from "@/assets/logo.png";

const NAV = [
  { to: "/", label: "Map", icon: MapIcon },
  { to: "/recommender", label: "Recommender", icon: Sparkles },
  { to: "/planner", label: "Planner", icon: Zap },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <div className="flex min-h-screen min-w-[1280px] flex-col bg-background text-foreground">
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-sidebar px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <img src={logo} alt="where logo" className="h-7 w-auto rounded-sm" />
            <span className="text-[15px] font-semibold tracking-tight">where</span>
          </Link>
          <nav className="flex items-center gap-1">
            {NAV.map((item) => {
              const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
              const Icon = item.icon;
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={
                    "flex items-center gap-2 rounded-sm px-3 py-1.5 text-[13px] font-medium transition-colors " +
                    (active
                      ? "bg-primary/10 text-primary ring-1 ring-primary/30"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/60")
                  }
                >
                  <Icon className="h-3.5 w-3.5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <button className="rounded-sm border border-border px-2.5 py-1 font-medium text-foreground/80 hover:text-foreground hover:border-primary/40">
            Export
          </button>
          <span className="rounded-sm border border-border px-2 py-1 tabular">analyst@where.eu</span>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <StatusBar />
    </div>
  );
}

function StatusBar() {
  const now = new Date();
  const ts = now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Brussels" });
  return (
    <footer className="flex h-6 shrink-0 items-center justify-between border-t border-border bg-sidebar px-4 font-mono text-[10.5px] text-muted-foreground tabular">
      <div className="flex items-center gap-4">
        <span className="flex items-center gap-1.5 text-success">
          <span className="h-1.5 w-1.5 rounded-full bg-success animate-pulse" /> LIVE
        </span>
        <span>ENTSO-E · ElectricityMaps · ENTSO-G</span>
        <span>EU-30</span>
      </div>
      <div className="flex items-center gap-4">
        <span>FREQ <span className="text-foreground">50.012 Hz</span></span>
        <span>EUR/USD <span className="text-foreground">1.0842</span></span>
        <span>LAG <span className="text-foreground">12m</span></span>
        <span>{ts} CET</span>
        <span>v0.3.1</span>
      </div>
    </footer>
  );
}
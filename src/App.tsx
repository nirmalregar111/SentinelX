import React, { useState, useEffect, useMemo } from "react";
import {
  ShieldIcon, LayoutIcon, VideoIcon, AlertTriangleIcon,
  MapPinIcon, UsersIcon, BarChartIcon, SettingsIcon,
  BellIcon, SearchIcon, ChevronDownIcon, EyeIcon
} from "./icons";
import { StoreProvider, useStore } from "./lib/store";
import AnimatedNumber from "./components/AnimatedNumber";

const isCameraSender = window.location.hash.startsWith("#camera-sender");
const LazyCameraSender = React.lazy(() => import("./pages/CameraSender"));

export type Page = "overview" | "monitoring" | "incidents" | "zones" | "people" | "analytics" | "evidence" | "settings";

const navItems: { id: Page; label: string; icon: React.FC<any> }[] = [
  { id: "overview",   label: "Overview",       icon: LayoutIcon },
  { id: "monitoring", label: "Live Monitoring", icon: VideoIcon },
  { id: "zones",      label: "Zones",           icon: MapPinIcon },
  { id: "people",     label: "People",          icon: UsersIcon },
  { id: "analytics",  label: "Analytics",       icon: BarChartIcon },
  { id: "evidence",   label: "Evidence",        icon: EyeIcon },
  { id: "settings",   label: "Settings",        icon: SettingsIcon },
];

function useTime() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return time;
}

const LazyOverview   = React.lazy(() => import("./pages/Overview"));
const LazyMonitoring = React.lazy(() => import("./pages/LiveMonitoring"));
const LazyIncidents  = React.lazy(() => import("./pages/Incidents"));
const LazyZones      = React.lazy(() => import("./pages/Zones"));
const LazyPeople     = React.lazy(() => import("./pages/People"));
const LazyAnalytics  = React.lazy(() => import("./pages/Analytics"));
const LazySettings   = React.lazy(() => import("./pages/Settings"));
const LazyEvidence   = React.lazy(() => import("./pages/Evidence"));

const STATIC_TICKER = [
  "AI ENGINE · Neural threat model v3.2 · Accuracy 99.2%",
  "NETWORK · All nodes nominal · Latency 12ms",
  "SYSTEM · Encryption AES-256 active · All comms secured",
  "AI ENGINE · Calibration complete · Zone accuracy 98.7%",
  "NETWORK · Backup relay online · Failover ready",
  "SYSTEM · Audit log synchronized · 0 anomalies",
];

function AppInner() {
  const [page, setPage]           = useState<Page>("overview");
  const [pageKey, setPageKey]     = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unread, setUnread]       = useState(0);
  const [searchFocused, setSearchFocused] = useState(false);
  const [searchVal, setSearchVal] = useState("");
  const time = useTime();
  const { activeIncidents, activeCameras, highRiskEvents, evidenceCount, state } = useStore();

  const navigate = (p: Page) => {
    if (p === page) return;
    setPage(p);
    setPageKey(k => k + 1);
  };

  // Notifications driven by real incidents
  const notifications = useMemo(() => {
    const incNotifs = state.incidents.slice(0, 4).map(inc => ({
      id: inc.id,
      type: (inc.severity === "CRITICAL" ? "critical" : inc.severity === "HIGH" ? "warning" : "info") as "critical" | "warning" | "info" | "success",
      msg: `${inc.eventType.replace(/_/g, " ")} — ${inc.personId}`,
      sub: `${inc.cameraName} · ${inc.zoneName}`,
      ago: (() => {
        const diff = Date.now() - new Date(inc.detectedAt).getTime();
        const m = Math.floor(diff / 60000);
        return m < 1 ? "Just now" : m < 60 ? `${m}m ago` : `${Math.floor(m / 60)}h ago`;
      })(),
      read: inc.status === "RESOLVED",
    }));
    if (incNotifs.length === 0) {
      return [{ id: "static-1", type: "success" as const, msg: "All systems nominal", sub: "No active threats detected", ago: "Now", read: true }];
    }
    return incNotifs;
  }, [state.incidents]);

  useEffect(() => {
    const unreadCount = notifications.filter(n => !n.read).length;
    setUnread(unreadCount);
  }, [notifications]);

  // Ticker events — mix static + real incident events
  const tickerEvents = useMemo(() => {
    const incEvents = state.incidents.slice(0, 5).map(inc =>
      `${inc.cameraId} · ${inc.eventType.replace(/_/g, " ")} · ${inc.personId} confidence ${inc.confidence}%`
    );
    return [...incEvents, ...STATIC_TICKER].slice(0, 10);
  }, [state.incidents]);

  // Threat level computed from real data
  const threatPct = useMemo(() => {
    if (activeIncidents === 0) return 8;
    const base = Math.min(95, activeIncidents * 15 + highRiskEvents * 20);
    return Math.max(12, base);
  }, [activeIncidents, highRiskEvents]);

  const threatLabel = threatPct >= 75 ? "CRITICAL" : threatPct >= 50 ? "HIGH" : threatPct >= 25 ? "ELEVATED" : "NOMINAL";
  const threatColor = threatPct >= 75 ? "#FF2D2D" : threatPct >= 50 ? "#FF6B35" : threatPct >= 25 ? "#FFB800" : "#00FF88";

  const notifColor = { critical: "#FF2D2D", warning: "#FFB800", success: "#00FF88", info: "#38BDF8" };
  const notifBg    = { critical: "#1a0808", warning: "#1a1208", success: "#081a10", info: "#081218" };
  const notifIcon  = { critical: "🚨", warning: "⚠", success: "✓", info: "ℹ" };

  return (
    <div className="flex h-full w-full overflow-hidden" style={{ background: "#040709", color: "#E8F4FD" }}>

      {/* ── Sidebar ── */}
      <aside
        className="flex flex-col flex-shrink-0 h-full relative overflow-hidden"
        style={{ width: 252, background: "linear-gradient(180deg, #080E15 0%, #04090F 100%)", borderRight: "1px solid #1E2D3D" }}
      >
        <div className="absolute inset-0 pointer-events-none grid-bg opacity-20" />

        {/* Ambient glow orbs */}
        <div className="absolute -top-20 -left-20 w-64 h-64 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(0,245,255,0.04) 0%, transparent 70%)" }} />
        <div className="absolute bottom-20 -right-10 w-48 h-48 rounded-full pointer-events-none" style={{ background: "radial-gradient(circle, rgba(59,130,246,0.05) 0%, transparent 70%)" }} />

        {/* Logo */}
        <div className="relative flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid #152030" }}>
          <div
            className="flex items-center justify-center rounded-[10px] flex-shrink-0 relative"
            style={{
              width: 38, height: 38,
              background: "linear-gradient(135deg, rgba(0,245,255,0.18) 0%, rgba(59,130,246,0.12) 100%)",
              border: "1px solid rgba(0,245,255,0.35)",
              boxShadow: "0 0 24px rgba(0,245,255,0.12), inset 0 1px 0 rgba(0,245,255,0.1)",
            }}
          >
            <ShieldIcon size={18} style={{ color: "#00F5FF", filter: "drop-shadow(0 0 6px rgba(0,245,255,0.8))" }} />
          </div>
          <div>
            <div className="font-display font-bold text-[17px] tracking-widest uppercase" style={{ color: "#E8F4FD", letterSpacing: "0.16em", textShadow: "0 0 20px rgba(0,245,255,0.2)" }}>
              SentinelX
            </div>
            <div className="font-mono text-[8px] tracking-widest" style={{ color: "#2E4560" }}>AI SECURITY · v3.2</div>
          </div>
          <div className="ml-auto flex flex-col items-center gap-0.5">
            <div className="relative">
              <div className="w-2 h-2 rounded-full" style={{ background: "#00FF88", boxShadow: "0 0 8px rgba(0,255,136,0.8)" }} />
              <div className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(0,255,136,0.4)", animationDuration: "2s" }} />
            </div>
            <span className="font-mono text-[7px] mt-0.5" style={{ color: "#2E4560" }}>LIVE</span>
          </div>
        </div>

        {/* Threat level */}
        <div className="relative px-5 py-3" style={{ borderBottom: "1px solid #152030" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-[9px] tracking-widest uppercase" style={{ color: "#2E4560" }}>Threat Level</span>
            <span className="font-mono text-[10px] font-bold critical-flicker" style={{ color: threatColor, textShadow: `0 0 8px ${threatColor}60` }}>
              {threatLabel}
            </span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden relative" style={{ background: "#0D1520" }}>
            <div
              className="h-full rounded-full progress-shine"
              style={{
                width: `${threatPct}%`,
                background: `linear-gradient(90deg, ${threatColor}60, ${threatColor})`,
                boxShadow: `0 0 12px ${threatColor}60`,
                backgroundSize: "200% 100%",
                transition: "width 1.5s cubic-bezier(0.16, 1, 0.3, 1), background-color 0.5s",
              }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="font-mono text-[8px]" style={{ color: "#2E4560" }}>NOMINAL</span>
            <span className="font-mono text-[8px]" style={{ color: "#2E4560" }}>CRITICAL</span>
          </div>
        </div>

        {/* Nav */}
        <nav className="relative flex-1 overflow-y-auto px-3 py-3 space-y-0.5">
          {navItems.map(({ id, label, icon: Icon }) => {
            const active   = page === id;
            const hasAlert = id === "incidents" && activeIncidents > 0;
            return (
              <button
                key={id}
                onClick={() => navigate(id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-[7px] text-sm transition-all duration-200 group relative overflow-hidden"
                style={{
                  background: active
                    ? "linear-gradient(90deg, rgba(0,245,255,0.1) 0%, rgba(0,245,255,0.02) 100%)"
                    : "transparent",
                  color: active ? "#00F5FF" : "#4A6580",
                  border: `1px solid ${active ? "rgba(0,245,255,0.2)" : "transparent"}`,
                  boxShadow: active ? "0 0 20px rgba(0,245,255,0.05), inset 0 0 12px rgba(0,245,255,0.02)" : "none",
                }}
                onMouseEnter={e => {
                  if (!active) {
                    e.currentTarget.style.color = "#94B4CC";
                    e.currentTarget.style.background = "rgba(255,255,255,0.03)";
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                  }
                }}
                onMouseLeave={e => {
                  if (!active) {
                    e.currentTarget.style.color = "#4A6580";
                    e.currentTarget.style.background = "transparent";
                    e.currentTarget.style.borderColor = "transparent";
                  }
                }}
              >
                {/* Active left accent */}
                {active && (
                  <span
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-6 rounded-r"
                    style={{ background: "linear-gradient(180deg, #00F5FF, #3B82F6)", boxShadow: "0 0 12px rgba(0,245,255,0.9), 0 0 4px rgba(0,245,255,0.5)" }}
                  />
                )}
                <Icon
                  size={15}
                  strokeWidth={active ? 2 : 1.5}
                  style={{
                    color: active ? "#00F5FF" : undefined,
                    filter: active ? "drop-shadow(0 0 5px rgba(0,245,255,0.7))" : undefined,
                    transition: "filter 0.2s",
                  }}
                />
                <span className="flex-1 text-left font-medium text-[13px]">{label}</span>
                {hasAlert && (
                  <span
                    className="relative font-mono text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{
                      background: "rgba(255,45,45,0.15)",
                      color: "#FF2D2D",
                      border: "1px solid rgba(255,45,45,0.4)",
                      boxShadow: "0 0 10px rgba(255,45,45,0.35)",
                    }}
                  >
                    <span className="absolute inset-0 rounded-full animate-ping" style={{ background: "rgba(255,45,45,0.3)", animationDuration: "2s" }} />
                    <span className="relative">{activeIncidents}</span>
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Live stat pills */}
        <div className="relative px-4 py-3" style={{ borderTop: "1px solid #152030", borderBottom: "1px solid #152030" }}>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "INCIDENTS", val: activeIncidents, color: activeIncidents > 0 ? "#FF2D2D" : "#00FF88" },
              { label: "EVIDENCE",  val: evidenceCount,   color: "#22D3EE" },
            ].map(s => (
              <div key={s.label} className="rounded-[6px] px-2.5 py-2 text-center" style={{ background: "#0A1520", border: "1px solid #152030" }}>
                <AnimatedNumber value={s.val} className="font-mono text-lg font-bold block" style={{ color: s.color, textShadow: `0 0 10px ${s.color}60`, lineHeight: 1 }} />
                <span className="font-mono text-[8px] tracking-widest" style={{ color: "#2E4560" }}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* System status footer */}
        <div className="relative px-4 py-4">
          <div className="font-mono text-[9px] tracking-widest uppercase mb-2.5" style={{ color: "#2E4560" }}>System Status</div>
          <div className="space-y-2">
            {[
              { label: "AI Engine",  val: "99.2%",   ok: true  },
              { label: "Database",   val: state.realtimeStatus === "connected" ? "Healthy" : "Checking", ok: state.realtimeStatus === "connected" },
              { label: "WebSocket",  val: state.realtimeStatus === "connected" ? "12ms" : "—", ok: state.realtimeStatus === "connected" },
              { label: "Cameras",    val: state.cameras.length > 0 ? `${activeCameras}/${state.cameras.length}` : `0/—`, ok: activeCameras > 0 },
            ].map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-[11px]" style={{ color: "#4A6580" }}>{s.label}</span>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px]" style={{ color: s.ok ? "#00FF88" : "#FFB800" }}>{s.val}</span>
                  <span className="w-1 h-1 rounded-full animate-pulse-dot" style={{ background: s.ok ? "#00FF88" : "#FFB800", boxShadow: `0 0 5px ${s.ok ? "#00FF88" : "#FFB800"}` }} />
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-3 flex items-center justify-between px-3 py-2 rounded-[6px]"
            style={{ background: "#0A1520", border: "1px solid #152030", boxShadow: "inset 0 1px 0 rgba(0,245,255,0.03)" }}
          >
            <span className="font-mono text-[9px] tracking-widest" style={{ color: "#2E4560" }}>UTC</span>
            <span className="font-mono text-sm font-bold tracking-widest" style={{ color: "#00F5FF", textShadow: "0 0 14px rgba(0,245,255,0.6)" }}>
              {time.toLocaleTimeString("en-GB", { hour12: false })}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex flex-col flex-1 min-w-0 h-full overflow-hidden">

        {/* Ticker tape */}
        <div
          className="flex-shrink-0 flex items-center"
          style={{ height: 26, background: "#04090F", borderBottom: "1px solid #0E1A24", overflow: "hidden" }}
        >
          <div
            className="flex-shrink-0 flex items-center gap-2 px-3"
            style={{ background: "rgba(0,245,255,0.06)", borderRight: "1px solid #0E1A24", height: "100%" }}
          >
            <div className="w-1.5 h-1.5 rounded-full animate-pulse-dot" style={{ background: "#00F5FF", boxShadow: "0 0 6px #00F5FF" }} />
            <span className="font-mono text-[9px] font-bold tracking-widest" style={{ color: "#00F5FF" }}>LIVE</span>
          </div>
          <div className="ticker-wrap flex-1">
            <div className="ticker-inner">
              {[...tickerEvents, ...tickerEvents].map((e, i) => (
                <span key={i} className="inline-flex items-center gap-4 px-6">
                  <span className="font-mono text-[10px]" style={{ color: "#4A6580" }}>{e}</span>
                  <span style={{ color: "#152030" }}>◆</span>
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Header */}
        <header
          className="flex items-center gap-4 px-6 flex-shrink-0 relative"
          style={{
            height: 52,
            background: "linear-gradient(180deg, #080E15 0%, #060D14 100%)",
            borderBottom: "1px solid #0E1A24",
          }}
        >
          {/* Bottom border glow */}
          <div className="absolute bottom-0 left-0 right-0 h-px" style={{ background: "linear-gradient(90deg, transparent, rgba(0,245,255,0.15), transparent)" }} />

          <div className="flex-1 min-w-0 flex items-center gap-3">
            <span className="font-display font-bold text-sm tracking-widest uppercase" style={{ color: "#E8F4FD", letterSpacing: "0.08em" }}>
              {navItems.find(n => n.id === page)?.label}
            </span>
            <div className="w-px h-4" style={{ background: "#1E2D3D" }} />
            <div className="flex items-center gap-1.5">
              <div
                className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                style={{ background: activeIncidents > 0 ? "#FF2D2D" : "#00FF88", boxShadow: activeIncidents > 0 ? "0 0 6px #FF2D2D" : "0 0 6px #00FF88" }}
              />
              <span className="font-mono text-[10px]" style={{ color: activeIncidents > 0 ? "#FF2D2D" : "#00FF88" }}>
                {activeIncidents > 0 ? `${activeIncidents} ACTIVE` : "ALL CLEAR"}
              </span>
            </div>
            <div className="hidden sm:flex items-center gap-1.5">
              <div className="w-1 h-1 rounded-full" style={{ background: state.realtimeStatus === "connected" ? "#00F5FF" : "#FFB800" }} />
              <span className="font-mono text-[10px]" style={{ color: state.realtimeStatus === "connected" ? "#00F5FF" : "#FFB800" }}>
                {state.realtimeStatus === "connected" ? "REALTIME ON" : "CONNECTING"}
              </span>
            </div>
          </div>

          {/* Search */}
          <div
            className="flex items-center gap-2 px-3 py-1.5 rounded-[6px] transition-all duration-200"
            style={{
              background: "#0A1520",
              border: `1px solid ${searchFocused ? "rgba(0,245,255,0.4)" : "#1E2D3D"}`,
              boxShadow: searchFocused ? "0 0 18px rgba(0,245,255,0.12), inset 0 0 8px rgba(0,245,255,0.03)" : "none",
              minWidth: 200,
              transition: "border-color 0.2s, box-shadow 0.2s",
            }}
          >
            <SearchIcon size={12} style={{ color: searchFocused ? "#00F5FF" : "#4A6580", transition: "color 0.2s" }} />
            <input
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search..."
              className="bg-transparent outline-none text-xs w-full"
              style={{ color: "#94B4CC" }}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
            />
            <span className="font-mono text-[9px] px-1 rounded" style={{ color: "#2E4560", background: "#131F2E" }}>⌘K</span>
          </div>

          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setNotifOpen(o => !o); setUnread(0); }}
              className="relative flex items-center justify-center rounded-[6px] transition-all duration-200"
              style={{
                width: 34, height: 34,
                background: notifOpen ? "rgba(0,245,255,0.08)" : "transparent",
                border: `1px solid ${notifOpen ? "rgba(0,245,255,0.25)" : "transparent"}`,
                boxShadow: notifOpen ? "0 0 12px rgba(0,245,255,0.1)" : "none",
              }}
            >
              <BellIcon size={15} style={{ color: notifOpen ? "#00F5FF" : "#4A6580" }} />
              {unread > 0 && (
                <span
                  className="absolute top-0.5 right-0.5 flex items-center justify-center font-mono text-[8px] font-bold rounded-full"
                  style={{ width: 14, height: 14, background: "#FF2D2D", boxShadow: "0 0 10px rgba(255,45,45,0.8)", color: "#fff" }}
                >
                  {unread}
                </span>
              )}
            </button>

            {notifOpen && (
              <div
                className="absolute right-0 top-full mt-2 rounded-[12px] z-50 animate-fade-in overflow-hidden"
                style={{ width: 340, background: "#0A1520", border: "1px solid #1E2D3D", boxShadow: "0 24px 64px rgba(0,0,0,0.8), 0 0 0 1px rgba(0,245,255,0.05)" }}
              >
                <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #152030" }}>
                  <div className="flex items-center gap-2">
                    <span className="font-display font-bold text-sm tracking-widest uppercase" style={{ color: "#E8F4FD" }}>Alerts</span>
                    {notifications.filter(n => !n.read).length > 0 && (
                      <span className="font-mono text-[9px] px-1.5 py-0.5 rounded-full" style={{ background: "rgba(255,45,45,0.15)", color: "#FF2D2D", border: "1px solid rgba(255,45,45,0.3)" }}>
                        {notifications.filter(n => !n.read).length} NEW
                      </span>
                    )}
                  </div>
                  <button className="font-mono text-[10px]" style={{ color: "#4A6580" }} onClick={() => setNotifOpen(false)}>✕</button>
                </div>
                <div className="overflow-y-auto" style={{ maxHeight: 360 }}>
                  {notifications.map(n => (
                    <div
                      key={n.id}
                      className="flex gap-3 px-4 py-3 transition-colors cursor-pointer"
                      style={{ borderBottom: "1px solid #0E1A24", background: n.read ? "transparent" : notifBg[n.type] }}
                      onMouseEnter={e => { e.currentTarget.style.background = "rgba(255,255,255,0.02)"; }}
                      onMouseLeave={e => { e.currentTarget.style.background = n.read ? "transparent" : notifBg[n.type]; }}
                    >
                      <span className="text-base mt-0.5 flex-shrink-0">{notifIcon[n.type]}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium mb-0.5 capitalize" style={{ color: notifColor[n.type] }}>{n.msg}</div>
                        <div className="text-[11px] truncate" style={{ color: "#4A6580" }}>{n.sub}</div>
                      </div>
                      <div className="font-mono text-[9px] flex-shrink-0 mt-0.5 whitespace-nowrap" style={{ color: "#2E4560" }}>{n.ago}</div>
                    </div>
                  ))}
                </div>
                <div className="px-4 py-2.5 text-center" style={{ borderTop: "1px solid #152030" }}>
                  <button
                    className="font-mono text-[10px] transition-colors"
                    style={{ color: "#22D3EE" }}
                    onClick={() => { setNotifOpen(false); navigate("incidents"); }}
                  >
                    View all incidents →
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Avatar */}
          <div className="flex items-center gap-2 cursor-pointer group">
            <div
              className="flex items-center justify-center rounded-full font-mono text-[11px] font-bold transition-all duration-200"
              style={{
                width: 30, height: 30,
                background: "linear-gradient(135deg, rgba(0,245,255,0.15), rgba(59,130,246,0.15))",
                border: "1px solid rgba(0,245,255,0.3)",
                color: "#00F5FF",
                boxShadow: "0 0 12px rgba(0,245,255,0.08)",
              }}
            >
              SO
            </div>
            <ChevronDownIcon size={11} style={{ color: "#2E4560" }} />
          </div>
        </header>

        {/* Page content with transition */}
        <main className="flex-1 overflow-hidden" key={pageKey}>
          <React.Suspense fallback={
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <div className="flex gap-2 justify-center mb-4">
                  {[0,1,2].map(i => (
                    <div
                      key={i}
                      className="w-2 h-2 rounded-full animate-pulse-dot"
                      style={{ background: "#00F5FF", boxShadow: "0 0 8px #00F5FF", animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <div className="font-mono text-[10px] tracking-widest uppercase" style={{ color: "#4A6580" }}>Loading module</div>
              </div>
            </div>
          }>
            <div className="h-full page-enter">
              {page === "overview"   && <LazyOverview   onNavigate={(p) => navigate(p as Page)} />}
              {page === "monitoring" && <LazyMonitoring />}
              {page === "incidents"  && <LazyIncidents  />}
              {page === "zones"      && <LazyZones      />}
              {page === "people"     && <LazyPeople     />}
              {page === "analytics"  && <LazyAnalytics  />}
              {page === "evidence"   && <LazyEvidence   />}
              {page === "settings"   && <LazySettings   />}
            </div>
          </React.Suspense>
        </main>
      </div>

      {notifOpen && <div className="fixed inset-0 z-40" onClick={() => setNotifOpen(false)} />}
    </div>
  );
}

export default function App() {
  if (isCameraSender) {
    return (
      <React.Suspense fallback={<div style={{ background: "#040709", height: "100vh" }} />}>
        <LazyCameraSender />
      </React.Suspense>
    );
  }
  return (
    <StoreProvider>
      <AppInner />
    </StoreProvider>
  );
}

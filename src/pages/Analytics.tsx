import React, { useMemo } from "react";
import { useStore } from "../lib/store";
import { TrendingUpIcon, ActivityIcon, TargetIcon } from "../icons";
import type { Severity } from "../lib/types";
import AnimatedNumber from "../components/AnimatedNumber";

const SEVERITY_COLORS: Record<Severity, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#38BDF8",
};

// Simple bar chart using SVG
function BarChart({
  data,
  keyMap,
  height = 120,
}: {
  data: { day: string; total: number; critical: number; high: number; medium: number; low: number }[];
  keyMap: { key: string; color: string; label: string }[];
  height?: number;
}) {
  const maxVal = Math.max(...data.map(d => d.total));

  return (
    <div className="space-y-2">
      <svg width="100%" height={height} viewBox={`0 0 ${data.length * 44} ${height}`} preserveAspectRatio="none">
        {data.map((d, i) => {
          let y = height;
          return (
            <g key={d.day}>
              {keyMap.map(({ key, color }) => {
                const val = (d as any)[key] as number;
                const h = (val / maxVal) * (height - 20);
                y -= h;
                return (
                  <rect key={key} x={i * 44 + 4} y={y} width={36} height={h} fill={color} rx={2} opacity={0.85} />
                );
              })}
            </g>
          );
        })}
      </svg>
      <div className="flex">
        {data.map(d => (
          <div key={d.day} className="flex-1 text-center font-mono text-[9px]" style={{ color: "#475569" }}>{d.day}</div>
        ))}
      </div>
    </div>
  );
}

function HorizontalBar({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] truncate" style={{ color: "#CBD5E1" }}>{label}</span>
        <span className="font-mono text-[10px] ml-2 flex-shrink-0" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "#17212C" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${(value / max) * 100}%`, background: color }} />
      </div>
    </div>
  );
}

function StatCard({ label, value, sub, icon: Icon, color }: {
  label: string; value: string; sub: string; icon: React.FC<any>; color: string;
}) {
  return (
    <div className="card-hover rounded-[10px] p-4 flex flex-col gap-3" style={{ background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)", border: "1px solid #1E2D3D" }}>
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#475569" }}>{label}</span>
        <Icon size={14} style={{ color }} />
      </div>
      <div className="font-mono text-2xl font-bold" style={{ color: "#F8FAFC" }}>
        {isNaN(Number(value)) ? value : <AnimatedNumber value={Number(value)} />}
      </div>
      <div className="text-[11px]" style={{ color: "#64748B" }}>{sub}</div>
    </div>
  );
}

function SeverityDonut({ counts, total }: { counts: Record<Severity, number>; total: number }) {
  const segments = (["CRITICAL","HIGH","MEDIUM","LOW"] as Severity[]).map(s => ({
    label: s,
    count: counts[s],
    color: SEVERITY_COLORS[s],
    pct: total > 0 ? Math.round((counts[s] / total) * 100) : 0,
  }));

  const cx = 60, cy = 60, r = 48, inner = 30;
  const toRad = (deg: number) => (deg - 90) * (Math.PI / 180);
  let cumulative = 0;
  const arcs = segments.map(s => {
    const startAngle = cumulative * 3.6;
    const endAngle = startAngle + s.pct * 3.6;
    cumulative += s.pct;
    const x1 = cx + r * Math.cos(toRad(startAngle));
    const y1 = cy + r * Math.sin(toRad(startAngle));
    const x2 = cx + r * Math.cos(toRad(endAngle));
    const y2 = cy + r * Math.sin(toRad(endAngle));
    const x3 = cx + inner * Math.cos(toRad(endAngle));
    const y3 = cy + inner * Math.sin(toRad(endAngle));
    const x4 = cx + inner * Math.cos(toRad(startAngle));
    const y4 = cy + inner * Math.sin(toRad(startAngle));
    const largeArc = s.pct > 50 ? 1 : 0;
    return {
      ...s,
      d: `M ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} L ${x3} ${y3} A ${inner} ${inner} 0 ${largeArc} 0 ${x4} ${y4} Z`,
    };
  });

  if (total === 0) {
    return (
      <div className="flex items-center gap-6">
        <svg width={120} height={120} viewBox="0 0 120 120">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#24303D" strokeWidth={18} />
          <text x={cx} y={cy + 4} textAnchor="middle" fill="#475569" fontSize={9} fontFamily="JetBrains Mono">NO DATA</text>
        </svg>
        <div className="space-y-2">
          {segments.map(s => (
            <div key={s.label} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
              <span className="text-xs" style={{ color: "#CBD5E1" }}>{s.label}</span>
              <span className="font-mono text-xs ml-auto" style={{ color: s.color }}>0</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-6">
      <svg width={120} height={120} viewBox="0 0 120 120">
        {arcs.map(arc => <path key={arc.label} d={arc.d} fill={arc.color} opacity={0.9} />)}
        <text x={cx} y={cy - 4} textAnchor="middle" fill="#F8FAFC" fontSize={14} fontFamily="JetBrains Mono" fontWeight="bold">{total}</text>
        <text x={cx} y={cy + 10} textAnchor="middle" fill="#64748B" fontSize={8} fontFamily="JetBrains Mono">TOTAL</text>
      </svg>
      <div className="space-y-2">
        {segments.map(s => (
          <div key={s.label} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: s.color }} />
            <span className="text-xs" style={{ color: "#CBD5E1" }}>{s.label}</span>
            <span className="font-mono text-xs ml-auto" style={{ color: s.color }}>{s.count}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Analytics() {
  const { state, activeIncidents, highRiskEvents, evidenceCount } = useStore();

  const stats = useMemo(() => {
    const incidents = state.incidents;
    const evidence = state.evidence;

    const severityCounts: Record<Severity, number> = { CRITICAL: 0, HIGH: 0, MEDIUM: 0, LOW: 0 };
    for (const inc of incidents) severityCounts[inc.severity] = (severityCounts[inc.severity] ?? 0) + 1;

    const camMap = new Map<string, number>();
    for (const inc of incidents) camMap.set(inc.cameraId, (camMap.get(inc.cameraId) ?? 0) + 1);
    const cameraActivity = Array.from(camMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([cam, count]) => ({ cam, count }));

    const zoneMap = new Map<string, number>();
    for (const inc of incidents) zoneMap.set(inc.zoneName || "Unknown Zone", (zoneMap.get(inc.zoneName || "Unknown Zone") ?? 0) + 1);
    const zoneActivity = Array.from(zoneMap.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([zone, count]) => ({ zone, count }));

    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i));
      return d.toLocaleDateString("en-US", { weekday: "short" });
    });
    const dayMap = new Map(days.map(d => [d, { total: 0, critical: 0, high: 0, medium: 0, low: 0 }]));
    for (const inc of incidents) {
      const day = new Date(inc.detectedAt).toLocaleDateString("en-US", { weekday: "short" });
      const entry = dayMap.get(day);
      if (entry) {
        entry.total++;
        if (inc.severity === "CRITICAL") entry.critical++;
        else if (inc.severity === "HIGH") entry.high++;
        else if (inc.severity === "MEDIUM") entry.medium++;
        else entry.low++;
      }
    }
    const chartData = days.map(day => ({ day, ...(dayMap.get(day) ?? { total: 0, critical: 0, high: 0, medium: 0, low: 0 }) }));

    const topCam = cameraActivity[0] ?? { cam: "—", count: 0 };
    const topZone = zoneActivity[0] ?? { zone: "—", count: 0 };
    const uniquePeople = new Set(evidence.map(e => e.personId)).size;
    const resolved = incidents.filter(i => i.status === "RESOLVED").length;

    const riskBuckets = { cr: 0, hi: 0, mod: 0, lo: 0, min: 0 };
    for (const inc of incidents) {
      if (inc.riskScore >= 80) riskBuckets.cr++;
      else if (inc.riskScore >= 60) riskBuckets.hi++;
      else if (inc.riskScore >= 40) riskBuckets.mod++;
      else if (inc.riskScore >= 20) riskBuckets.lo++;
      else riskBuckets.min++;
    }

    return { total: incidents.length, severityCounts, cameraActivity, zoneActivity, chartData, topCam, topZone, uniquePeople, resolved, riskBuckets };
  }, [state.incidents, state.evidence]);

  const maxCam = Math.max(...stats.cameraActivity.map(d => d.count), 1);
  const maxZone = Math.max(...stats.zoneActivity.map(d => d.count), 1);
  const barKeyMap = [
    { key: "critical", color: "#EF4444", label: "Critical" },
    { key: "high",     color: "#F97316", label: "High" },
    { key: "medium",   color: "#F59E0B", label: "Medium" },
    { key: "low",      color: "#38BDF8", label: "Low" },
  ];

  return (
    <div className="h-full overflow-y-auto px-6 py-5 space-y-5">
      <div>
        <h1 className="font-semibold text-lg" style={{ color: "#F8FAFC" }}>Security Intelligence</h1>
        <div className="font-mono text-[10px]" style={{ color: "#64748B" }}>Analytics · Live Data</div>
      </div>

      <div className="grid grid-cols-5 gap-4">
        <StatCard label="Total Incidents" value={stats.total.toString()} sub="All time" icon={ActivityIcon} color="#22D3EE" />
        <StatCard label="Active Incidents" value={activeIncidents.toString()} sub="Unresolved" icon={ActivityIcon} color="#EF4444" />
        <StatCard label="High Risk Events" value={highRiskEvents.toString()} sub="Critical + High severity" icon={TrendingUpIcon} color="#F97316" />
        <StatCard label="Top Camera" value={stats.topCam.cam} sub={`${stats.topCam.count} incident${stats.topCam.count !== 1 ? "s" : ""}`} icon={TargetIcon} color="#F59E0B" />
        <StatCard label="Evidence Clips" value={evidenceCount.toString()} sub="Recorded evidence" icon={ActivityIcon} color="#3B82F6" />
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 300px" }}>
        <div className="card-hover rounded-[10px] p-5" style={{ background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)", border: "1px solid #1E2D3D" }}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>Incidents Over Time</h2>
              <div className="font-mono text-[10px]" style={{ color: "#64748B" }}>Last 7 days by severity</div>
            </div>
            <div className="flex items-center gap-3">
              {barKeyMap.map(k => (
                <div key={k.key} className="flex items-center gap-1">
                  <div className="w-2 h-2 rounded-sm" style={{ background: k.color }} />
                  <span className="font-mono text-[10px]" style={{ color: "#64748B" }}>{k.label}</span>
                </div>
              ))}
            </div>
          </div>
          {stats.total === 0 ? (
            <div className="flex items-center justify-center h-28" style={{ color: "#2D3A47" }}>
              <span className="font-mono text-[11px]">No incident data yet</span>
            </div>
          ) : (
            <BarChart data={stats.chartData} keyMap={barKeyMap} height={140} />
          )}
        </div>

        <div className="card-hover rounded-[10px] p-5" style={{ background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)", border: "1px solid #1E2D3D" }}>
          <h2 className="font-semibold text-sm mb-1" style={{ color: "#F8FAFC" }}>Incidents by Severity</h2>
          <div className="font-mono text-[10px] mb-5" style={{ color: "#64748B" }}>Distribution</div>
          <SeverityDonut counts={stats.severityCounts} total={stats.total} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="card-hover rounded-[10px] p-5" style={{ background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)", border: "1px solid #1E2D3D" }}>
          <h2 className="font-semibold text-sm mb-1" style={{ color: "#F8FAFC" }}>Camera Activity</h2>
          <div className="font-mono text-[10px] mb-4" style={{ color: "#64748B" }}>Incidents per camera</div>
          {stats.cameraActivity.length === 0 ? (
            <div className="font-mono text-[11px] py-4 text-center" style={{ color: "#2D3A47" }}>No data yet</div>
          ) : (
            <div className="space-y-3">
              {stats.cameraActivity.map(c => (
                <HorizontalBar key={c.cam} label={c.cam} value={c.count} max={maxCam} color="#22D3EE" />
              ))}
            </div>
          )}
        </div>

        <div className="card-hover rounded-[10px] p-5" style={{ background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)", border: "1px solid #1E2D3D" }}>
          <h2 className="font-semibold text-sm mb-1" style={{ color: "#F8FAFC" }}>Zone Activity</h2>
          <div className="font-mono text-[10px] mb-4" style={{ color: "#64748B" }}>Incidents per zone</div>
          {stats.zoneActivity.length === 0 ? (
            <div className="font-mono text-[11px] py-4 text-center" style={{ color: "#2D3A47" }}>No data yet</div>
          ) : (
            <div className="space-y-3">
              {stats.zoneActivity.map(z => (
                <HorizontalBar key={z.zone} label={z.zone} value={z.count} max={maxZone} color="#F59E0B" />
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {([
          { label: "People Detected", value: stats.uniquePeople.toString(), color: "#22D3EE" },
          { label: "Resolved", value: stats.resolved.toString(), color: "#22C55E" },
          { label: "Critical Events", value: stats.severityCounts.CRITICAL.toString(), color: "#EF4444" },
          { label: "High Events", value: stats.severityCounts.HIGH.toString(), color: "#F97316" },
        ] as { label: string; value: string; color: string }[]).map(s => (
          <div key={s.label} className="card-hover rounded-[10px] p-4 text-center stat-rise" style={{ background: "linear-gradient(135deg, #0D1520 0%, #0A1218 100%)", border: "1px solid #1E2D3D" }}>
            <div className="font-mono text-2xl font-bold mb-1" style={{ color: s.color }}><AnimatedNumber value={Number(s.value)} /></div>
            <div className="text-[11px]" style={{ color: "#64748B" }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

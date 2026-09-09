import React, { useState, useEffect, useCallback } from "react";
import { SearchIcon, XIcon, UsersIcon } from "../icons";
import AnimatedNumber from "../components/AnimatedNumber";
import { fetchPeople } from "../lib/api";
import { useStore } from "../lib/store";
import type { Person } from "../lib/types";

function timeSince(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function riskFromStatus(status: Person["status"]): number {
  return status === "ACTIVE" ? 72 : status === "UNKNOWN" ? 45 : 15;
}

function PersonPanel({ person, onClose }: { person: Person; onClose: () => void }) {
  const risk = riskFromStatus(person.status);
  const riskColor = risk >= 70 ? "#EF4444" : risk >= 50 ? "#F97316" : risk >= 30 ? "#F59E0B" : "#22C55E";

  return (
    <div
      className="fixed inset-y-0 right-0 z-50 flex flex-col animate-slide-in"
      style={{ width: 360, background: "#0B1017", borderLeft: "1px solid #24303D", boxShadow: "-20px 0 60px rgba(0,0,0,0.5)" }}
    >
      <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
        <div>
          <div className="font-mono font-bold text-2xl mb-1" style={{ color: "#22D3EE" }}>{person.displayId}</div>
          <span
            className="font-mono text-[10px] px-1.5 py-0.5 rounded"
            style={{
              background: person.status === "ACTIVE" ? "#EF444415" : person.status === "CLEARED" ? "#22C55E15" : "#F59E0B15",
              color: person.status === "ACTIVE" ? "#EF4444" : person.status === "CLEARED" ? "#22C55E" : "#F59E0B",
            }}
          >
            {person.status}
          </span>
        </div>
        <button onClick={onClose} className="text-[#475569] hover:text-[#F8FAFC]"><XIcon size={15} /></button>
      </div>

      <div className="mx-6 mt-4 rounded-[10px] flex items-center justify-center camera-feed" style={{ height: 180, background: "#070A0F", border: "1px solid #24303D" }}>
        <div className="relative">
          <svg width="60" height="100" viewBox="0 0 60 100" fill="none">
            <circle cx="30" cy="14" r="10" stroke="#22D3EE" strokeWidth="1.5" />
            <path d="M10 40 C10 28 20 24 30 24 C40 24 50 28 50 40 L52 70 H38 L36 55 H24 L22 70 H8 L10 40Z" stroke="#22D3EE" strokeWidth="1.5" fill="none" />
            <path d="M22 70 L18 95 M38 70 L42 95" stroke="#22D3EE" strokeWidth="1.5" />
          </svg>
          <div className="absolute inset-0 -m-4" style={{ border: `1.5px solid ${riskColor}`, borderRadius: 4 }} />
          <div className="absolute -top-8 left-0 right-0 text-center font-mono text-[9px]" style={{ color: riskColor }}>
            {person.displayId} · {person.status}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {[
          { label: "Person ID", value: person.displayId, color: "#22D3EE" },
          { label: "Internal ID", value: person.id },
          { label: "Camera", value: person.cameraId, color: "#22D3EE" },
          { label: "Status", value: person.status, color: person.status === "ACTIVE" ? "#EF4444" : person.status === "CLEARED" ? "#22C55E" : "#F59E0B" },
          { label: "First Detected", value: new Date(person.firstDetectedAt).toLocaleString() },
          { label: "Last Seen", value: timeSince(person.lastDetectedAt) },
        ].map(f => (
          <div key={f.label} className="flex items-center justify-between py-2" style={{ borderBottom: "1px solid #1A242F" }}>
            <span className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#475569" }}>{f.label}</span>
            <span className="text-xs font-mono" style={{ color: f.color ?? "#CBD5E1" }}>{f.value}</span>
          </div>
        ))}

        <div>
          <div className="font-mono text-[10px] uppercase tracking-wider mb-2" style={{ color: "#475569" }}>Risk Score</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2 rounded-full" style={{ background: "#17212C" }}>
              <div className="h-full rounded-full" style={{ width: `${risk}%`, background: riskColor }} />
            </div>
            <span className="font-mono text-xl font-semibold w-8 text-right" style={{ color: riskColor }}>{risk}</span>
          </div>
        </div>
      </div>

      <div className="px-6 py-4" style={{ borderTop: "1px solid #1A242F" }}>
        <button onClick={onClose} className="w-full py-2 rounded-[8px] text-xs" style={{ color: "#475569" }}>Close</button>
      </div>
    </div>
  );
}

export default function People() {
  const { state } = useStore();
  const [backendPeople, setBackendPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<Person["status"] | "ALL">("ALL");
  const [selected, setSelected] = useState<Person | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchPeople();
      setBackendPeople(data);
    } catch (e) {
      console.error("fetchPeople error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Merge: backend people + any unique personIds from evidence not yet in backend list
  const evidencePersonIds = new Set(state.evidence.map(e => e.personId));
  const backendIds = new Set(backendPeople.map(p => p.id));
  const syntheticPeople: Person[] = state.evidence
    .filter(e => !backendIds.has(e.personId))
    .reduce((acc, e) => {
      if (acc.some(p => p.id === e.personId)) return acc;
      acc.push({
        id: e.personId,
        displayId: e.personId.startsWith("person-") ? `P-${e.personId.slice(-3)}` : e.personId,
        cameraId: e.cameraId,
        firstDetectedAt: e.detectedAt,
        lastDetectedAt: e.detectedAt,
        status: "ACTIVE",
      });
      return acc;
    }, [] as Person[]);

  const allPeople = [...backendPeople, ...syntheticPeople];

  const filtered = allPeople
    .filter(p => statusFilter === "ALL" || p.status === statusFilter)
    .filter(p =>
      !search ||
      p.displayId.toLowerCase().includes(search.toLowerCase()) ||
      p.cameraId.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase())
    );

  const statusColor = (status: Person["status"]) =>
    status === "ACTIVE" ? "#EF4444" : status === "CLEARED" ? "#22C55E" : "#F59E0B";

  return (
    <div className="h-full flex flex-col overflow-hidden">
      <div className="flex items-center gap-3 px-6 py-3 flex-shrink-0" style={{ borderBottom: "1px solid #1A242F", background: "#0B1017" }}>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[6px]" style={{ background: "#111821", border: "1px solid #24303D", minWidth: 220 }}>
          <SearchIcon size={12} className="text-[#475569]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by ID, camera..."
            className="bg-transparent outline-none text-xs flex-1"
            style={{ color: "#CBD5E1" }}
          />
          {search && <button onClick={() => setSearch("")}><XIcon size={11} className="text-[#475569]" /></button>}
        </div>

        <div className="flex items-center gap-1">
          {(["ALL", "ACTIVE", "CLEARED", "UNKNOWN"] as const).map(a => (
            <button
              key={a}
              onClick={() => setStatusFilter(a)}
              className="font-mono text-[10px] px-2.5 py-1 rounded transition-colors"
              style={{
                background: statusFilter === a ? "#17212C" : "transparent",
                color: statusFilter === a ? "#22D3EE" : "#475569",
                border: `1px solid ${statusFilter === a ? "#24303D" : "transparent"}`,
              }}
            >
              {a}
            </button>
          ))}
        </div>

        <div className="ml-auto font-mono text-[10px]" style={{ color: "#475569" }}>
          {loading ? "Loading..." : `${filtered.length} ${filtered.length === 1 ? "person" : "people"} tracked`}
        </div>

        <button
          onClick={load}
          className="font-mono text-[10px] px-2.5 py-1 rounded"
          style={{ background: "#111821", color: "#475569", border: "1px solid #24303D" }}
        >
          ↺ Refresh
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <span className="font-mono text-[11px]" style={{ color: "#475569" }}>Loading personnel data...</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 gap-3">
            <UsersIcon size={40} style={{ color: "#1A242F" }} />
            <div className="font-mono text-[11px] uppercase tracking-widest" style={{ color: "#64748B" }}>
              {allPeople.length === 0 ? "No people detected yet" : "No matches for current filters"}
            </div>
            {allPeople.length === 0 && (
              <div className="text-xs text-center max-w-xs" style={{ color: "#2D3A47" }}>
                People are detected automatically when the AI detection system identifies individuals in camera feeds.
              </div>
            )}
          </div>
        ) : (
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {filtered.map(p => {
              const risk = riskFromStatus(p.status);
              const color = statusColor(p.status);
              return (
                <button
                  key={p.id}
                  onClick={() => setSelected(p)}
                  className="card-hover text-left rounded-[10px] p-4 transition-all"
                  style={{
                    background: "#111821",
                    border: `1px solid ${p.status === "ACTIVE" ? "#EF444440" : "#24303D"}`,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "#22D3EE40")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = p.status === "ACTIVE" ? "#EF444440" : "#24303D")}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="font-mono text-xl font-bold" style={{ color: "#22D3EE", textShadow: "0 0 12px rgba(34,211,238,0.4)" }}>{p.displayId}</div>
                      <span
                        className="font-mono text-[9px] px-1.5 py-0.5 rounded mt-1 inline-block"
                        style={{ background: color + "15", color, border: `1px solid ${color}30` }}
                      >
                        {p.status}
                      </span>
                    </div>
                    <div className="w-2 h-2 rounded-full mt-1" style={{ background: p.status === "ACTIVE" ? color : "#24303D" }} />
                  </div>

                  <div className="space-y-1.5 mb-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase" style={{ color: "#475569" }}>Camera</span>
                      <span className="font-mono text-[11px]" style={{ color: "#CBD5E1" }}>{p.cameraId}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase" style={{ color: "#475569" }}>First Seen</span>
                      <span className="font-mono text-[11px]" style={{ color: "#64748B" }}>{timeSince(p.firstDetectedAt)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] uppercase" style={{ color: "#475569" }}>Last Seen</span>
                      <span className="font-mono text-[11px]" style={{ color: "#64748B" }}>{timeSince(p.lastDetectedAt)}</span>
                    </div>
                  </div>

                  <div className="h-px mb-3" style={{ background: "#1A242F" }} />

                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 rounded-full" style={{ background: "#17212C" }}>
                      <div className="h-full rounded-full" style={{ width: `${risk}%`, background: color }} />
                    </div>
                    <span className="font-mono text-[10px]" style={{ color }}>RISK {risk}</span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <>
          <div className="fixed inset-0 z-40" style={{ background: "rgba(7,10,15,0.4)" }} onClick={() => setSelected(null)} />
          <PersonPanel person={selected} onClose={() => setSelected(null)} />
        </>
      )}
    </div>
  );
}

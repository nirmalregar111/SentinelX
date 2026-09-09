import React, { useState, useEffect, useCallback } from "react";
import { Badge } from "../components/Badge";
import { PlusIcon, EditIcon, TrashIcon, XIcon, CheckIcon, MapPinIcon } from "../icons";
import { fetchZones, saveZone } from "../lib/api";
import type { Zone, Severity, ZoneType } from "../lib/types";

const severityColor: Record<Severity, string> = {
  CRITICAL: "#EF4444",
  HIGH: "#F97316",
  MEDIUM: "#F59E0B",
  LOW: "#38BDF8",
};

const typeColor: Record<ZoneType, string> = {
  RESTRICTED: "#EF4444",
  MONITORED: "#F59E0B",
  PUBLIC: "#22C55E",
};

function ZoneMap({ zone }: { zone: Zone }) {
  const color = zone.enabled ? severityColor[zone.severity] : "#475569";
  const bgColor = zone.enabled && zone.severity === "CRITICAL" ? "#180c08" : zone.enabled && zone.severity === "HIGH" ? "#150e06" : "#0a1420";

  return (
    <div
      className="relative rounded-[10px] overflow-hidden camera-feed"
      style={{ aspectRatio: "16/9", background: bgColor }}
    >
      <div className="absolute inset-0" style={{
        backgroundImage: `linear-gradient(${color}08 1px, transparent 1px), linear-gradient(90deg, ${color}08 1px, transparent 1px)`,
        backgroundSize: "40px 40px",
      }} />
      <div
        className="absolute"
        style={{
          bottom: "10%", left: "15%", right: "15%", height: "45%",
          border: `1.5px dashed ${color}70`,
          background: `${color}08`,
          borderRadius: 4,
        }}
      >
        <div className="absolute top-2 left-3 font-mono text-[9px] flex items-center gap-1" style={{ color }}>
          <span className={`w-1.5 h-1.5 rounded-full ${zone.enabled ? "animate-pulse-dot" : ""}`} style={{ background: color }} />
          {zone.name.toUpperCase()}
        </div>
      </div>
      {["tl","tr","bl","br"].map(c => (
        <div key={c} className="absolute" style={{
          top: c.startsWith("t") ? 8 : undefined, bottom: c.startsWith("b") ? 8 : undefined,
          left: c.endsWith("l") ? 8 : undefined, right: c.endsWith("r") ? 8 : undefined,
          width: 12, height: 12,
          borderTop: c.startsWith("t") ? `1.5px solid ${color}50` : undefined,
          borderBottom: c.startsWith("b") ? `1.5px solid ${color}50` : undefined,
          borderLeft: c.endsWith("l") ? `1.5px solid ${color}50` : undefined,
          borderRight: c.endsWith("r") ? `1.5px solid ${color}50` : undefined,
        }} />
      ))}
      <div className="absolute inset-0 scanline" />
      <div className="absolute top-2 right-2">
        <span
          className="font-mono text-[9px] px-1.5 py-0.5 rounded"
          style={{ background: typeColor[zone.type] + "20", color: typeColor[zone.type], border: `1px solid ${typeColor[zone.type]}40` }}
        >
          {zone.type}
        </span>
      </div>
    </div>
  );
}

function CreateZoneModal({ onClose, onCreated }: { onClose: () => void; onCreated: (z: Zone) => void }) {
  const [form, setForm] = useState({
    name: "",
    cameraId: "CAM-01",
    type: "RESTRICTED" as ZoneType,
    severity: "HIGH" as Severity,
    enabled: true,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Zone name is required";
    return e;
  };

  const handleSubmit = async () => {
    const e = validate();
    if (Object.keys(e).length > 0) { setErrors(e); return; }
    setSaving(true);
    try {
      const zone = await saveZone({
        name: form.name.trim(),
        cameraId: form.cameraId,
        type: form.type,
        severity: form.severity,
        enabled: form.enabled,
        environmentId: "env-default",
        polygon: null,
      });
      onCreated(zone);
      onClose();
    } catch (err) {
      console.error("saveZone error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-6"
      style={{ background: "rgba(7,10,15,0.8)", backdropFilter: "blur(4px)" }}
    >
      <div className="w-full max-w-md rounded-[14px] overflow-hidden animate-fade-in" style={{ background: "#111821", border: "1px solid #24303D" }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: "1px solid #1A242F" }}>
          <div>
            <h2 className="font-semibold text-sm">Create Security Zone</h2>
            <div className="font-mono text-[10px]" style={{ color: "#64748B" }}>Configure restricted area monitoring</div>
          </div>
          <button onClick={onClose} className="text-[#475569] hover:text-[#F8FAFC]"><XIcon size={15} /></button>
        </div>

        <div className="px-6 py-4 space-y-4">
          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#475569" }}>Zone Name *</label>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Restricted Equipment Bay"
              className="w-full px-3 py-2 rounded-[6px] text-xs outline-none"
              style={{ background: "#17212C", color: "#F8FAFC", border: `1px solid ${errors.name ? "#EF4444" : "#24303D"}` }}
            />
            {errors.name && <div className="font-mono text-[10px] mt-1" style={{ color: "#EF4444" }}>{errors.name}</div>}
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#475569" }}>Camera</label>
            <select
              value={form.cameraId}
              onChange={e => setForm(f => ({ ...f, cameraId: e.target.value }))}
              className="w-full px-3 py-2 rounded-[6px] text-xs outline-none"
              style={{ background: "#17212C", color: "#F8FAFC", border: "1px solid #24303D" }}
            >
              {["CAM-01","CAM-02","CAM-03","CAM-04","CAM-05","CAM-06","CAM-07","CAM-08"].map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#475569" }}>Zone Type</label>
            <div className="grid grid-cols-3 gap-2">
              {(["RESTRICTED","MONITORED","PUBLIC"] as ZoneType[]).map(t => (
                <button
                  key={t}
                  onClick={() => setForm(f => ({ ...f, type: t }))}
                  className="py-1.5 rounded-[6px] font-mono text-[10px] font-medium transition-colors"
                  style={{
                    background: form.type === t ? typeColor[t] + "20" : "#17212C",
                    color: form.type === t ? typeColor[t] : "#64748B",
                    border: `1px solid ${form.type === t ? typeColor[t] + "60" : "#24303D"}`,
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block font-mono text-[10px] tracking-wider uppercase mb-1.5" style={{ color: "#475569" }}>Security Level</label>
            <div className="grid grid-cols-4 gap-2">
              {(["LOW","MEDIUM","HIGH","CRITICAL"] as Severity[]).map(l => (
                <button
                  key={l}
                  onClick={() => setForm(f => ({ ...f, severity: l }))}
                  className="py-1.5 rounded-[6px] font-mono text-[10px] font-medium transition-colors"
                  style={{
                    background: form.severity === l ? severityColor[l] + "20" : "#17212C",
                    color: form.severity === l ? severityColor[l] : "#64748B",
                    border: `1px solid ${form.severity === l ? severityColor[l] + "60" : "#24303D"}`,
                  }}
                >
                  {l}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: "#CBD5E1" }}>Zone Status</span>
            <button onClick={() => setForm(f => ({ ...f, enabled: !f.enabled }))}>
              <div className="flex items-center gap-2">
                <div className="relative rounded-full" style={{ width: 36, height: 20, background: form.enabled ? "#22D3EE" : "#24303D" }}>
                  <div className="absolute top-1 rounded-full transition-all" style={{ width: 12, height: 12, background: "#fff", left: form.enabled ? 20 : 4 }} />
                </div>
                <span className="font-mono text-[10px]" style={{ color: form.enabled ? "#22D3EE" : "#64748B" }}>
                  {form.enabled ? "ACTIVE" : "INACTIVE"}
                </span>
              </div>
            </button>
          </div>
        </div>

        <div className="flex gap-3 px-6 py-4" style={{ borderTop: "1px solid #1A242F" }}>
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-[8px] text-sm font-medium"
            style={{ background: "#17212C", color: "#64748B", border: "1px solid #24303D" }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1 py-2 rounded-[8px] text-sm font-medium"
            style={{ background: "#22D3EE20", color: "#22D3EE", border: "1px solid #22D3EE40", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Saving..." : "Save Zone"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Zones() {
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Zone | null>(null);
  const [creating, setCreating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchZones();
      setZones(data);
      if (data.length > 0 && !selected) setSelected(data[0]);
    } catch (e) {
      console.error("fetchZones error:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreated = (z: Zone) => {
    setZones(prev => [z, ...prev]);
    setSelected(z);
  };

  const handleDelete = async (zone: Zone) => {
    if (!confirm(`Delete zone "${zone.name}"?`)) return;
    const { fetchZones: _f, saveZone: _s, ...apiModule } = await import("../lib/api");
    // delete via KV
    const { supabase } = await import("../lib/supabase");
    await supabase.from("kv_store_3d5271d2").delete().eq("key", `zone:${zone.id}`);
    const remaining = zones.filter(z => z.id !== zone.id);
    const ids = remaining.map(z => z.id);
    await supabase.from("kv_store_3d5271d2").upsert({ key: "zone_index", value: ids });
    setZones(remaining);
    setSelected(remaining[0] ?? null);
  };

  const activeZone = selected;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Zone list */}
      <div className="flex flex-col flex-shrink-0 h-full" style={{ width: 280, borderRight: "1px solid #1A242F", background: "#0B1017" }}>
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: "1px solid #1A242F" }}>
          <div>
            <div className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>Security Zones</div>
            <div className="font-mono text-[10px]" style={{ color: "#64748B" }}>
              {loading ? "Loading..." : `${zones.length} configured`}
            </div>
          </div>
          <button
            onClick={() => setCreating(true)}
            className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded"
            style={{ background: "#22D3EE15", color: "#22D3EE", border: "1px solid #22D3EE30" }}
          >
            <PlusIcon size={10} /> NEW
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center h-24">
              <span className="font-mono text-[10px]" style={{ color: "#475569" }}>Loading zones...</span>
            </div>
          )}
          {!loading && zones.length === 0 && (
            <div className="flex flex-col items-center justify-center h-40 gap-2 px-4 text-center">
              <MapPinIcon size={24} style={{ color: "#24303D" }} />
              <div className="font-mono text-[10px]" style={{ color: "#475569" }}>No zones configured</div>
              <div className="text-[10px]" style={{ color: "#2D3A47" }}>Click NEW to create your first security zone</div>
            </div>
          )}
          {zones.map(z => (
            <button
              key={z.id}
              onClick={() => setSelected(z)}
              className="w-full text-left px-4 py-3 flex items-center gap-3 transition-colors"
              style={{
                borderBottom: "1px solid #1A242F",
                background: activeZone?.id === z.id ? "#111821" : "transparent",
                borderLeft: activeZone?.id === z.id ? "2px solid #22D3EE" : "2px solid transparent",
              }}
            >
              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: z.enabled ? severityColor[z.severity] : "#475569" }} />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium truncate" style={{ color: "#F8FAFC" }}>{z.name}</div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[10px]" style={{ color: "#64748B" }}>{z.cameraId}</span>
                  <span className="font-mono text-[9px] px-1 rounded" style={{ color: severityColor[z.severity], background: severityColor[z.severity] + "15" }}>
                    {z.severity}
                  </span>
                </div>
              </div>
              {z.enabled && (
                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0 animate-pulse-dot" style={{ background: severityColor[z.severity] }} />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Zone detail */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">
        {!activeZone ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <MapPinIcon size={40} style={{ color: "#1A242F" }} />
            <div className="font-mono text-sm" style={{ color: "#475569" }}>Select a zone to view details</div>
            <button
              onClick={() => setCreating(true)}
              className="px-4 py-2 rounded-[8px] text-xs font-mono"
              style={{ background: "#22D3EE20", color: "#22D3EE", border: "1px solid #22D3EE40" }}
            >
              + Create First Zone
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-1">
                  <h1 className="font-semibold text-lg" style={{ color: "#F8FAFC" }}>{activeZone.name}</h1>
                  <span
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                    style={{ background: typeColor[activeZone.type] + "20", color: typeColor[activeZone.type], border: `1px solid ${typeColor[activeZone.type]}40` }}
                  >
                    {activeZone.type}
                  </span>
                  <span
                    className="font-mono text-[9px] px-1.5 py-0.5 rounded"
                    style={{ background: activeZone.enabled ? "#22C55E20" : "#47556920", color: activeZone.enabled ? "#22C55E" : "#64748B", border: `1px solid ${activeZone.enabled ? "#22C55E40" : "#24303D"}` }}
                  >
                    {activeZone.enabled ? "ACTIVE" : "INACTIVE"}
                  </span>
                </div>
                <div className="font-mono text-xs" style={{ color: "#64748B" }}>
                  {activeZone.id} · {activeZone.cameraId} · Created {new Date(activeZone.createdAt).toLocaleDateString()}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleDelete(activeZone)}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-[6px]"
                  style={{ background: "#200808", color: "#EF4444", border: "1px solid #EF444430" }}
                >
                  <TrashIcon size={11} /> Delete
                </button>
              </div>
            </div>

            <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #24303D" }}>
              <ZoneMap zone={activeZone} />
            </div>

            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Zone ID", value: activeZone.id, mono: true },
                { label: "Camera", value: activeZone.cameraId, mono: true, color: "#22D3EE" },
                { label: "Zone Type", value: activeZone.type, mono: true, color: typeColor[activeZone.type] },
                { label: "Security Level", value: activeZone.severity, mono: true, color: severityColor[activeZone.severity] },
                { label: "Status", value: activeZone.enabled ? "ACTIVE" : "INACTIVE", mono: true, color: activeZone.enabled ? "#22C55E" : "#64748B" },
                { label: "Created", value: new Date(activeZone.createdAt).toLocaleDateString(), mono: true },
              ].map(f => (
                <div key={f.label} className="card-hover rounded-[8px] p-4" style={{ background: "#111821", border: "1px solid #24303D" }}>
                  <div className="text-[10px] font-mono tracking-wider uppercase mb-2" style={{ color: "#475569" }}>{f.label}</div>
                  <div className="text-sm font-medium font-mono" style={{ color: f.color ?? "#CBD5E1" }}>{f.value}</div>
                </div>
              ))}
            </div>

            <div className="rounded-[10px] p-4" style={{ background: "#111821", border: "1px solid #24303D" }}>
              <div className="text-[10px] font-mono tracking-wider uppercase mb-4" style={{ color: "#475569" }}>Security Level Progression</div>
              <div className="flex items-center gap-0">
                {(["LOW","MEDIUM","HIGH","CRITICAL"] as Severity[]).map((s, i) => {
                  const levels: Severity[] = ["LOW","MEDIUM","HIGH","CRITICAL"];
                  const currentIdx = levels.indexOf(activeZone.severity);
                  const active = i === currentIdx;
                  const past = i < currentIdx;
                  const color = severityColor[s];
                  return (
                    <React.Fragment key={s}>
                      <div className="flex flex-col items-center gap-2">
                        <div
                          className="flex items-center justify-center rounded-full"
                          style={{ width: 32, height: 32, background: active || past ? color + "20" : "#17212C", border: `1.5px solid ${active || past ? color : "#24303D"}` }}
                        >
                          {past ? <CheckIcon size={12} style={{ color }} /> : (
                            <div className={`w-2 h-2 rounded-full ${active ? "animate-pulse-dot" : ""}`} style={{ background: active ? color : "#24303D" }} />
                          )}
                        </div>
                        <span className="font-mono text-[10px] text-center" style={{ color: active ? color : "#475569" }}>{s}</span>
                      </div>
                      {i < 3 && (
                        <div className="flex-1 h-px mb-5" style={{ background: past ? severityColor[levels[i]] : "#24303D" }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {creating && <CreateZoneModal onClose={() => setCreating(false)} onCreated={handleCreated} />}
    </div>
  );
}

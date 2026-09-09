import React from "react";
import type { Severity, IncidentStatus, CameraStatus, ZoneLevel, ZoneState, PersonAuth } from "../data";

type BadgeVariant =
  | "LIVE" | "ONLINE" | "OFFLINE"
  | "SAFE" | "WARNING" | "HIGH" | "CRITICAL" | "LOW" | "MEDIUM"
  | "AUTHORIZED" | "UNAUTHORIZED" | "UNKNOWN"
  | "NEW" | "ACKNOWLEDGED" | "INVESTIGATING" | "RESOLVED"
  | "APPROACHING" | "INTRUSION"
  | "DEMO";

const styles: Record<string, string> = {
  LIVE: "bg-[#0d2a1a] text-[#22C55E] border border-[#22C55E]/30",
  ONLINE: "bg-[#0d2a1a] text-[#22C55E] border border-[#22C55E]/30",
  OFFLINE: "bg-[#1c1008] text-[#64748B] border border-[#64748B]/30",
  SAFE: "bg-[#0d2a1a] text-[#22C55E] border border-[#22C55E]/30",
  APPROACHING: "bg-[#1e1a08] text-[#F59E0B] border border-[#F59E0B]/30",
  WARNING: "bg-[#1e1a08] text-[#F59E0B] border border-[#F59E0B]/30",
  HIGH: "bg-[#201208] text-[#F97316] border border-[#F97316]/30",
  CRITICAL: "bg-[#200808] text-[#EF4444] border border-[#EF4444]/30",
  INTRUSION: "bg-[#200808] text-[#EF4444] border border-[#EF4444]/30",
  LOW: "bg-[#0d1a2a] text-[#38BDF8] border border-[#38BDF8]/30",
  MEDIUM: "bg-[#1e1a08] text-[#F59E0B] border border-[#F59E0B]/30",
  AUTHORIZED: "bg-[#0d2a1a] text-[#22C55E] border border-[#22C55E]/30",
  UNAUTHORIZED: "bg-[#200808] text-[#EF4444] border border-[#EF4444]/30",
  UNKNOWN: "bg-[#111821] text-[#64748B] border border-[#64748B]/30",
  NEW: "bg-[#200808] text-[#EF4444] border border-[#EF4444]/30",
  ACKNOWLEDGED: "bg-[#1e1a08] text-[#F59E0B] border border-[#F59E0B]/30",
  INVESTIGATING: "bg-[#0d1a2e] text-[#3B82F6] border border-[#3B82F6]/30",
  RESOLVED: "bg-[#0d2a1a] text-[#22C55E] border border-[#22C55E]/30",
  DEMO: "bg-[#0d1a2e] text-[#22D3EE] border border-[#22D3EE]/30",
};

interface BadgeProps {
  variant: BadgeVariant | Severity | IncidentStatus | CameraStatus | ZoneLevel | ZoneState | PersonAuth;
  label?: string;
  dot?: boolean;
  className?: string;
}

export function Badge({ variant, label, dot = false, className = "" }: BadgeProps) {
  const v = variant as BadgeVariant;
  const style = styles[v] ?? "bg-[#111821] text-[#CBD5E1] border border-[#24303D]";
  const isLive = v === "LIVE" || v === "ONLINE";

  return (
    <span
      className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] font-medium tracking-wider uppercase ${style} ${className}`}
    >
      {(dot || isLive) && (
        <span
          className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${isLive ? "bg-[#22C55E] animate-pulse-dot" : ""}`}
          style={!isLive ? { background: "currentColor", opacity: 0.8 } : undefined}
        />
      )}
      {label ?? v}
    </span>
  );
}

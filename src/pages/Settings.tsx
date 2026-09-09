import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "../lib/supabase";

const KV_TABLE = "kv_store_3d5271d2";
const SETTINGS_KEY = "app_settings";

async function loadSettings(): Promise<Record<string, any> | null> {
  try {
    const { data } = await supabase.from(KV_TABLE).select("value").eq("key", SETTINGS_KEY).maybeSingle();
    return data?.value ?? null;
  } catch { return null; }
}

async function persistSettings(settings: Record<string, any>): Promise<void> {
  try {
    await supabase.from(KV_TABLE).upsert({ key: SETTINGS_KEY, value: settings });
  } catch (e) { console.error("persistSettings error:", e); }
}
import {
  GlobeIcon, CameraIcon, MapPinIcon, UsersIcon, BellIcon,
  LockIcon, ServerIcon, DatabaseIcon, ShieldIcon
} from "../icons";
import {
  getEmailConfig, saveEmailConfig, isValidEmail, isEmailjsConfigured, sendTestEmail,
  type EmailAlertConfig,
} from "../lib/emailAlerts";

type Section =
  | "environment" | "monitoring" | "cameras" | "zones"
  | "roles" | "notifications" | "security" | "system";

const sections: { id: Section; label: string; icon: React.FC<any>; desc: string }[] = [
  { id: "environment", label: "Environment", icon: GlobeIcon, desc: "Deployment context and facility type" },
  { id: "monitoring", label: "Monitoring", icon: ShieldIcon, desc: "AI detection parameters and thresholds" },
  { id: "cameras", label: "Cameras", icon: CameraIcon, desc: "Camera configuration and recording" },
  { id: "zones", label: "Zones", icon: MapPinIcon, desc: "Zone defaults and alerting behavior" },
  { id: "roles", label: "Roles & Permissions", icon: UsersIcon, desc: "Access control and permission matrix" },
  { id: "notifications", label: "Notifications", icon: BellIcon, desc: "Alert channels and escalation rules" },
  { id: "security", label: "Security", icon: LockIcon, desc: "Authentication and audit logging" },
  { id: "system", label: "System", icon: ServerIcon, desc: "Infrastructure, storage, and integrations" },
];

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className="relative flex-shrink-0"
      style={{ width: 36, height: 20 }}
    >
      <div
        className="absolute inset-0 rounded-full transition-colors"
        style={{ background: value ? "#22D3EE" : "#24303D" }}
      />
      <div
        className="absolute top-1 rounded-full transition-all"
        style={{ width: 12, height: 12, background: "#fff", left: value ? 20 : 4 }}
      />
    </button>
  );
}

function SettingRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between py-3.5" style={{ borderBottom: "1px solid #1A242F" }}>
      <div className="flex-1 min-w-0 mr-4">
        <div className="text-sm" style={{ color: "#F8FAFC" }}>{label}</div>
        {desc && <div className="text-xs mt-0.5" style={{ color: "#64748B" }}>{desc}</div>}
      </div>
      {children}
    </div>
  );
}

function SelectInput({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="px-3 py-1.5 rounded-[6px] text-xs outline-none"
      style={{ background: "#17212C", color: "#CBD5E1", border: "1px solid #24303D", minWidth: 160 }}
    >
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  );
}

function NumberInput({ value, onChange, min, max }: { value: number; onChange: (v: number) => void; min?: number; max?: number }) {
  return (
    <input
      type="number"
      value={value}
      onChange={e => onChange(Number(e.target.value))}
      min={min}
      max={max}
      className="px-3 py-1.5 rounded-[6px] text-xs outline-none text-right font-mono"
      style={{ background: "#17212C", color: "#CBD5E1", border: "1px solid #24303D", width: 80 }}
    />
  );
}

function PermissionMatrix() {
  const roles = ["Administrator", "Security Officer", "Operator", "Viewer"];
  const perms = [
    "View live cameras",
    "Manage incidents",
    "Create zones",
    "Access analytics",
    "Manage cameras",
    "User management",
    "System settings",
    "Export data",
  ];

  const defaults: Record<string, Record<string, boolean>> = {
    "Administrator": Object.fromEntries(perms.map(p => [p, true])),
    "Security Officer": Object.fromEntries(perms.map((p, i) => [p, i < 5])),
    "Operator": Object.fromEntries(perms.map((p, i) => [p, i < 3])),
    "Viewer": Object.fromEntries(perms.map((p, i) => [p, i < 1])),
  };

  const [matrix, setMatrix] = useState(defaults);

  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr style={{ borderBottom: "1px solid #1A242F" }}>
            <th className="text-left py-2 pr-4 font-mono text-[10px] uppercase tracking-wider" style={{ color: "#475569" }}>Permission</th>
            {roles.map(r => (
              <th key={r} className="text-center py-2 px-3 font-mono text-[10px] uppercase tracking-wider" style={{ color: "#475569" }}>{r}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {perms.map(p => (
            <tr key={p} style={{ borderBottom: "1px solid #1A242F" }}>
              <td className="py-2.5 pr-4 text-xs" style={{ color: "#CBD5E1" }}>{p}</td>
              {roles.map(r => (
                <td key={r} className="py-2.5 px-3 text-center">
                  <button
                    onClick={() => setMatrix(m => ({
                      ...m,
                      [r]: { ...m[r], [p]: !m[r][p] },
                    }))}
                    className="mx-auto flex items-center justify-center rounded"
                    style={{ width: 18, height: 18, background: matrix[r][p] ? "#22C55E20" : "#17212C", border: `1px solid ${matrix[r][p] ? "#22C55E60" : "#24303D"}` }}
                  >
                    {matrix[r][p] && <div className="w-2 h-2 rounded-sm" style={{ background: "#22C55E" }} />}
                  </button>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function Settings() {
  const [section, setSection] = useState<Section>("environment");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  const [env, setEnv] = useState({
    type: "Factory",
    name: "SentinelX Primary Facility",
    timezone: "UTC+0",
    retention: 90,
  });

  const [monitoring, setMonitoring] = useState({
    aiDetection: true,
    boundaryAlerts: true,
    predictiveWarning: true,
    loiteringDetection: true,
    confidenceThreshold: 80,
    riskThreshold: 50,
    fps: 30,
    resolution: "1920×1080",
  });

  const [notifs, setNotifs] = useState({
    emailAlerts: true,
    pushAlerts: true,
    slackAlerts: false,
    criticalOnly: false,
    quietHoursStart: "23:00",
    quietHoursEnd: "07:00",
  });

  const [emailCfg, setEmailCfg] = useState<EmailAlertConfig>(() => getEmailConfig());
  const [emailInput, setEmailInput] = useState(emailCfg.ownerEmail);
  const [testEmailStatus, setTestEmailStatus] = useState<"idle" | "sending" | "sent" | "failed">("idle");
  const [testEmailError, setTestEmailError] = useState("");

  useEffect(() => {
    loadSettings().then(s => {
      if (!s) return;
      if (s.env) setEnv(s.env);
      if (s.monitoring) setMonitoring(s.monitoring);
      if (s.notifs) setNotifs(s.notifs);
    });
  }, []);

  const handleSave = useCallback(async () => {
    setSaveStatus("saving");
    await persistSettings({ env, monitoring, notifs });
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 2500);
  }, [env, monitoring, notifs]);

  function handleEmailCfgChange(patch: Partial<EmailAlertConfig>) {
    const next = { ...emailCfg, ...patch };
    setEmailCfg(next);
    saveEmailConfig(next);
  }

  function handleEmailInputBlur() {
    if (emailInput !== emailCfg.ownerEmail) {
      handleEmailCfgChange({ ownerEmail: emailInput });
    }
  }

  async function handleSendTestEmail() {
    const cfg = { ...emailCfg, ownerEmail: emailInput };
    if (!isValidEmail(cfg.ownerEmail)) return;
    setTestEmailStatus("sending");
    setTestEmailError("");
    const result = await sendTestEmail(cfg);
    if (result.ok) {
      setTestEmailStatus("sent");
      setTimeout(() => setTestEmailStatus("idle"), 6000);
    } else {
      setTestEmailStatus("failed");
      setTestEmailError(result.error ?? "Send failed");
      setTimeout(() => setTestEmailStatus("idle"), 8000);
    }
  }

  const [security, setSecurity] = useState({
    mfa: true,
    sessionTimeout: 30,
    auditLogging: true,
    ipWhitelist: false,
    ssoEnabled: false,
  });

  const renderSection = () => {
    switch (section) {
      case "environment":
        return (
          <div>
            <div className="mb-5">
              <h2 className="font-semibold text-sm mb-1" style={{ color: "#F8FAFC" }}>Environment Configuration</h2>
              <p className="text-xs" style={{ color: "#64748B" }}>Configure the deployment context for SentinelX.</p>
            </div>

            {/* Environment type selector */}
            <div className="mb-5">
              <div className="font-mono text-[10px] uppercase tracking-wider mb-3" style={{ color: "#475569" }}>Facility Type</div>
              <div className="grid grid-cols-3 gap-2">
                {["University","Factory","Warehouse","Office","Hospital","Campus","Transport Hub","Stadium","Custom"].map(t => (
                  <button
                    key={t}
                    onClick={() => setEnv(e => ({ ...e, type: t }))}
                    className="px-3 py-2.5 rounded-[8px] text-xs font-medium text-left transition-colors"
                    style={{
                      background: env.type === t ? "#17212C" : "#111821",
                      color: env.type === t ? "#22D3EE" : "#64748B",
                      border: `1px solid ${env.type === t ? "#22D3EE40" : "#1A242F"}`,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-0" style={{ border: "1px solid #1A242F", borderRadius: 10, overflow: "hidden" }}>
              <div className="px-5">
                <SettingRow label="Facility Name" desc="Display name for this deployment">
                  <input
                    value={env.name}
                    onChange={e => setEnv(v => ({ ...v, name: e.target.value }))}
                    className="px-3 py-1.5 rounded-[6px] text-xs outline-none"
                    style={{ background: "#17212C", color: "#CBD5E1", border: "1px solid #24303D", minWidth: 240 }}
                  />
                </SettingRow>
                <SettingRow label="Timezone" desc="Used for timestamps and scheduling">
                  <SelectInput value={env.timezone} onChange={v => setEnv(e => ({ ...e, timezone: v }))} options={["UTC-8","UTC-5","UTC+0","UTC+1","UTC+2","UTC+5:30","UTC+9"]} />
                </SettingRow>
                <SettingRow label="Data Retention" desc="Days to retain incident and video data">
                  <div className="flex items-center gap-2">
                    <NumberInput value={env.retention} onChange={v => setEnv(e => ({ ...e, retention: v }))} min={7} max={365} />
                    <span className="text-xs" style={{ color: "#64748B" }}>days</span>
                  </div>
                </SettingRow>
              </div>
            </div>
          </div>
        );

      case "monitoring":
        return (
          <div>
            <div className="mb-5">
              <h2 className="font-semibold text-sm mb-1" style={{ color: "#F8FAFC" }}>AI Monitoring Settings</h2>
              <p className="text-xs" style={{ color: "#64748B" }}>Configure detection parameters and alert thresholds.</p>
            </div>
            <div className="space-y-0" style={{ border: "1px solid #1A242F", borderRadius: 10, overflow: "hidden" }}>
              <div className="px-5">
                <SettingRow label="AI Person Detection" desc="Real-time person detection using computer vision">
                  <Toggle value={monitoring.aiDetection} onChange={v => setMonitoring(m => ({ ...m, aiDetection: v }))} />
                </SettingRow>
                <SettingRow label="Zone Boundary Alerts" desc="Alert when persons approach restricted boundaries">
                  <Toggle value={monitoring.boundaryAlerts} onChange={v => setMonitoring(m => ({ ...m, boundaryAlerts: v }))} />
                </SettingRow>
                <SettingRow label="Predictive Warning" desc="AI-predicted boundary crossing before it occurs">
                  <Toggle value={monitoring.predictiveWarning} onChange={v => setMonitoring(m => ({ ...m, predictiveWarning: v }))} />
                </SettingRow>
                <SettingRow label="Loitering Detection" desc="Alert on extended dwell time in sensitive areas">
                  <Toggle value={monitoring.loiteringDetection} onChange={v => setMonitoring(m => ({ ...m, loiteringDetection: v }))} />
                </SettingRow>
                <SettingRow label="Confidence Threshold" desc="Minimum AI confidence to trigger alerts (%)">
                  <div className="flex items-center gap-2">
                    <NumberInput value={monitoring.confidenceThreshold} onChange={v => setMonitoring(m => ({ ...m, confidenceThreshold: v }))} min={50} max={99} />
                    <span className="font-mono text-xs" style={{ color: "#64748B" }}>%</span>
                  </div>
                </SettingRow>
                <SettingRow label="Risk Score Threshold" desc="Minimum risk score to escalate to incident">
                  <NumberInput value={monitoring.riskThreshold} onChange={v => setMonitoring(m => ({ ...m, riskThreshold: v }))} min={0} max={100} />
                </SettingRow>
                <SettingRow label="Target FPS" desc="Target frame rate for analysis">
                  <SelectInput value={monitoring.fps.toString()} onChange={v => setMonitoring(m => ({ ...m, fps: Number(v) }))} options={["15","24","30","60"]} />
                </SettingRow>
              </div>
            </div>
          </div>
        );

      case "roles":
        return (
          <div>
            <div className="mb-5">
              <h2 className="font-semibold text-sm mb-1" style={{ color: "#F8FAFC" }}>Roles & Permission Matrix</h2>
              <p className="text-xs" style={{ color: "#64748B" }}>Configure what each role can access within SentinelX.</p>
            </div>
            <div className="rounded-[10px] p-5" style={{ background: "#111821", border: "1px solid #24303D" }}>
              <PermissionMatrix />
            </div>
          </div>
        );

      case "notifications":
        return (
          <div className="space-y-6">
            <div>
              <div className="mb-5">
                <h2 className="font-semibold text-sm mb-1" style={{ color: "#F8FAFC" }}>Notification Settings</h2>
                <p className="text-xs" style={{ color: "#64748B" }}>Configure alert delivery channels and escalation behavior.</p>
              </div>
              <div style={{ border: "1px solid #1A242F", borderRadius: 10, overflow: "hidden" }}>
                <div className="px-5">
                  <SettingRow label="Email Alerts" desc="Send incident alerts to configured email addresses">
                    <Toggle value={notifs.emailAlerts} onChange={v => setNotifs(n => ({ ...n, emailAlerts: v }))} />
                  </SettingRow>
                  <SettingRow label="Push Notifications" desc="Browser and mobile push notifications">
                    <Toggle value={notifs.pushAlerts} onChange={v => setNotifs(n => ({ ...n, pushAlerts: v }))} />
                  </SettingRow>
                  <SettingRow label="Slack Integration" desc="Send alerts to a Slack webhook">
                    <Toggle value={notifs.slackAlerts} onChange={v => setNotifs(n => ({ ...n, slackAlerts: v }))} />
                  </SettingRow>
                  <SettingRow label="Critical Incidents Only" desc="Only send alerts for Critical and High severity">
                    <Toggle value={notifs.criticalOnly} onChange={v => setNotifs(n => ({ ...n, criticalOnly: v }))} />
                  </SettingRow>
                  <SettingRow label="Quiet Hours" desc="Suppress non-critical notifications during these hours">
                    <div className="flex items-center gap-2">
                      <input
                        type="time"
                        value={notifs.quietHoursStart}
                        onChange={e => setNotifs(n => ({ ...n, quietHoursStart: e.target.value }))}
                        className="px-2 py-1 rounded text-xs font-mono outline-none"
                        style={{ background: "#17212C", color: "#CBD5E1", border: "1px solid #24303D" }}
                      />
                      <span style={{ color: "#475569" }}>→</span>
                      <input
                        type="time"
                        value={notifs.quietHoursEnd}
                        onChange={e => setNotifs(n => ({ ...n, quietHoursEnd: e.target.value }))}
                        className="px-2 py-1 rounded text-xs font-mono outline-none"
                        style={{ background: "#17212C", color: "#CBD5E1", border: "1px solid #24303D" }}
                      />
                    </div>
                  </SettingRow>
                </div>
              </div>
            </div>

            {/* ── SECURITY ALERTS ─────────────────────────────────────── */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider mb-3" style={{ color: "#475569" }}>Security Alerts</div>
              <div style={{ border: "1px solid #1A242F", borderRadius: 10, overflow: "hidden" }}>
                <div className="px-5">
                  <SettingRow label="Owner Email" desc="Recipient for automatic security alert emails">
                    <div className="flex flex-col items-end gap-1">
                      <input
                        type="email"
                        value={emailInput}
                        onChange={e => setEmailInput(e.target.value)}
                        onBlur={handleEmailInputBlur}
                        placeholder="owner@example.com"
                        className="px-3 py-1.5 rounded-[6px] text-xs outline-none"
                        style={{ background: "#17212C", color: "#CBD5E1", border: `1px solid ${emailInput && !isValidEmail(emailInput) ? "#EF4444" : "#24303D"}`, minWidth: 220 }}
                      />
                      {emailInput && !isValidEmail(emailInput) && (
                        <span className="text-[10px]" style={{ color: "#EF4444" }}>Enter a valid email address.</span>
                      )}
                      {emailInput && isValidEmail(emailInput) && (
                        <span className="text-[10px]" style={{ color: "#22C55E" }}>✓ Valid email</span>
                      )}
                    </div>
                  </SettingRow>
                  <SettingRow label="Email Alerts" desc="Send automatic email when a security event is confirmed">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full" style={{ background: emailCfg.enabled ? "#22C55E" : "#475569" }} />
                      <span className="font-mono text-[11px]" style={{ color: emailCfg.enabled ? "#22C55E" : "#475569" }}>
                        {emailCfg.enabled ? "ENABLED" : "DISABLED"}
                      </span>
                      <Toggle value={emailCfg.enabled} onChange={v => handleEmailCfgChange({ enabled: v })} />
                    </div>
                  </SettingRow>
                </div>

                {/* Send email when checkboxes */}
                <div className="px-5 py-4" style={{ borderTop: "1px solid #1A242F" }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider mb-3" style={{ color: "#475569" }}>Send email when:</div>
                  <div className="space-y-2.5">
                    {([
                      { key: "restrictedAreaIntrusion" as const, label: "Restricted area intrusion", recommended: true },
                      { key: "highRiskIncident"        as const, label: "High-risk incident" },
                      { key: "criticalIncident"        as const, label: "Critical incident" },
                    ]).map(({ key, label, recommended }) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer select-none">
                        <div
                          onClick={() => handleEmailCfgChange({ triggers: { ...emailCfg.triggers, [key]: !emailCfg.triggers[key] } })}
                          className="flex items-center justify-center rounded flex-shrink-0"
                          style={{ width: 16, height: 16, background: emailCfg.triggers[key] ? "#22D3EE20" : "#17212C", border: `1.5px solid ${emailCfg.triggers[key] ? "#22D3EE" : "#24303D"}` }}
                        >
                          {emailCfg.triggers[key] && <div className="w-2 h-2 rounded-sm" style={{ background: "#22D3EE" }} />}
                        </div>
                        <span className="text-xs" style={{ color: "#CBD5E1" }}>{label}</span>
                        {recommended && <span className="font-mono text-[9px] px-1.5 py-0.5 rounded" style={{ background: "#22D3EE15", color: "#22D3EE", border: "1px solid #22D3EE30" }}>DEFAULT</span>}
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* ── EMAIL CONFIGURATION ─────────────────────────────────── */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider mb-3" style={{ color: "#475569" }}>Email Alerts</div>
              <div className="rounded-[10px] p-5 space-y-4" style={{ background: "#111821", border: "1px solid #24303D" }}>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: "#475569" }}>Recipient</div>
                    <div className="text-xs" style={{ color: emailCfg.ownerEmail ? "#CBD5E1" : "#475569" }}>
                      {emailCfg.ownerEmail || "Not configured"}
                    </div>
                  </div>
                  <div>
                    <div className="font-mono text-[10px] uppercase tracking-wider mb-1" style={{ color: "#475569" }}>Status</div>
                    {emailCfg.ownerEmail && isValidEmail(emailCfg.ownerEmail) && isEmailjsConfigured(emailCfg) ? (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#22C55E" }} />
                        <span className="font-mono text-[11px]" style={{ color: "#22C55E" }}>CONFIGURED</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#F59E0B" }} />
                        <span className="font-mono text-[11px]" style={{ color: "#F59E0B" }}>NOT CONFIGURED</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* EmailJS credentials */}
                <div className="pt-1 space-y-3" style={{ borderTop: "1px solid #1A242F" }}>
                  <div className="font-mono text-[10px] uppercase tracking-wider pt-1" style={{ color: "#475569" }}>EmailJS Credentials</div>
                  {[
                    { key: "emailjsServiceId"  as const, label: "Service ID",   placeholder: "service_abc123" },
                    { key: "emailjsTemplateId" as const, label: "Template ID",  placeholder: "template_xyz789" },
                    { key: "emailjsPublicKey"  as const, label: "Public Key",   placeholder: "user_AbCdEfGhIj" },
                  ].map(({ key, label, placeholder }) => (
                    <div key={key} className="flex items-center justify-between gap-4">
                      <div className="text-xs flex-shrink-0" style={{ color: "#94A3B8", minWidth: 100 }}>{label}</div>
                      <input
                        type="text"
                        value={emailCfg[key]}
                        onChange={e => handleEmailCfgChange({ [key]: e.target.value })}
                        placeholder={placeholder}
                        className="flex-1 px-3 py-1.5 rounded-[6px] text-xs font-mono outline-none"
                        style={{ background: "#17212C", color: "#CBD5E1", border: "1px solid #24303D" }}
                      />
                    </div>
                  ))}
                </div>

                {(!isValidEmail(emailInput) || !isEmailjsConfigured(emailCfg)) && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-[6px]" style={{ background: "#1a120a", border: "1px solid #F59E0B30" }}>
                    <span style={{ color: "#F59E0B" }}>⚠</span>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "#F59E0B" }}>EMAIL NOT CONFIGURED</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>
                        {!isValidEmail(emailInput) ? "Set a valid owner email." : "Add your EmailJS Service ID, Template ID, and Public Key above."}
                      </div>
                    </div>
                  </div>
                )}

                <button
                  onClick={handleSendTestEmail}
                  disabled={!isValidEmail(emailInput) || !isEmailjsConfigured(emailCfg) || testEmailStatus === "sending"}
                  className="px-4 py-2 rounded-[7px] font-mono text-xs font-semibold transition-all disabled:opacity-40"
                  style={{ background: "#0d2a38", color: "#22D3EE", border: "1px solid #22D3EE30" }}
                >
                  {testEmailStatus === "sending" ? "SENDING…" : "SEND TEST EMAIL"}
                </button>

                {testEmailStatus === "sent" && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-[6px]" style={{ background: "#081a10", border: "1px solid #22C55E30" }}>
                    <span style={{ color: "#22C55E" }}>✓</span>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "#22C55E" }}>TEST EMAIL SENT</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>A test security alert was sent successfully to {emailInput}.</div>
                    </div>
                  </div>
                )}
                {testEmailStatus === "failed" && (
                  <div className="flex items-start gap-2 px-3 py-2.5 rounded-[6px]" style={{ background: "#1a0808", border: "1px solid #EF444430" }}>
                    <span style={{ color: "#EF4444" }}>⚠</span>
                    <div>
                      <div className="text-xs font-semibold" style={{ color: "#EF4444" }}>SEND FAILED</div>
                      <div className="text-[11px] mt-0.5" style={{ color: "#64748B" }}>{testEmailError}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── EMAIL PREVIEW ───────────────────────────────────────── */}
            <div>
              <div className="font-mono text-[10px] uppercase tracking-wider mb-3" style={{ color: "#475569" }}>Email Preview</div>
              <div className="rounded-[10px] overflow-hidden" style={{ border: "1px solid #24303D" }}>
                {/* Preview header */}
                <div className="px-5 py-3 space-y-1" style={{ background: "#0D1520", borderBottom: "1px solid #1A242F" }}>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono" style={{ color: "#475569" }}>To:</span>
                    <span style={{ color: "#CBD5E1" }}>{emailCfg.ownerEmail || "owner@example.com"}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-mono" style={{ color: "#475569" }}>Subject:</span>
                    <span style={{ color: "#F8FAFC" }}>🚨 SentinelX — Restricted Area Intrusion Detected</span>
                  </div>
                </div>
                {/* Email body preview */}
                <div className="px-5 py-4 space-y-4" style={{ background: "#111821" }}>
                  <div className="text-[10px] font-mono uppercase tracking-wider" style={{ color: "#475569" }}>
                    — This is only a preview. No email is sent here. —
                  </div>
                  <div>
                    <div className="font-mono text-[11px] uppercase tracking-wider font-bold mb-1" style={{ color: "#22D3EE" }}>SENTINELX SECURITY ALERT</div>
                    <div className="text-sm font-semibold" style={{ color: "#EF4444" }}>🚨 Restricted area intrusion detected.</div>
                  </div>
                  <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                    {[
                      { label: "Incident",   value: "INC-1042" },
                      { label: "Camera",     value: "CAM-03" },
                      { label: "Zone",       value: "Restricted Equipment Area" },
                      { label: "Detection",  value: "10:42:18" },
                      { label: "Severity",   value: "HIGH", color: "#EF4444" },
                      { label: "Confidence", value: "96%", color: "#22D3EE" },
                      { label: "Risk Score", value: "87%", color: "#F97316" },
                      { label: "Evidence",   value: "Available", color: "#22C55E" },
                    ].map(({ label, value, color }) => (
                      <div key={label}>
                        <div className="font-mono text-[10px] uppercase tracking-wider" style={{ color: "#475569" }}>{label}</div>
                        <div className="text-xs font-medium mt-0.5" style={{ color: color ?? "#CBD5E1" }}>{value}</div>
                      </div>
                    ))}
                  </div>
                  <div className="pt-1" style={{ borderTop: "1px solid #1A242F" }}>
                    <div className="inline-block px-4 py-2 rounded-[6px] font-mono text-xs font-semibold" style={{ background: "#0d2a38", color: "#22D3EE", border: "1px solid #22D3EE30" }}>
                      VIEW INCIDENT
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case "security":
        return (
          <div>
            <div className="mb-5">
              <h2 className="font-semibold text-sm mb-1" style={{ color: "#F8FAFC" }}>Security Settings</h2>
              <p className="text-xs" style={{ color: "#64748B" }}>Authentication, access control, and audit configuration.</p>
            </div>
            <div style={{ border: "1px solid #1A242F", borderRadius: 10, overflow: "hidden" }}>
              <div className="px-5">
                <SettingRow label="Multi-Factor Authentication" desc="Require MFA for all operator logins">
                  <Toggle value={security.mfa} onChange={v => setSecurity(s => ({ ...s, mfa: v }))} />
                </SettingRow>
                <SettingRow label="Session Timeout" desc="Auto-logout after inactivity (minutes)">
                  <div className="flex items-center gap-2">
                    <NumberInput value={security.sessionTimeout} onChange={v => setSecurity(s => ({ ...s, sessionTimeout: v }))} min={5} max={480} />
                    <span className="text-xs" style={{ color: "#64748B" }}>min</span>
                  </div>
                </SettingRow>
                <SettingRow label="Audit Logging" desc="Log all user actions and system events">
                  <Toggle value={security.auditLogging} onChange={v => setSecurity(s => ({ ...s, auditLogging: v }))} />
                </SettingRow>
                <SettingRow label="IP Whitelist" desc="Restrict access to specific IP ranges">
                  <Toggle value={security.ipWhitelist} onChange={v => setSecurity(s => ({ ...s, ipWhitelist: v }))} />
                </SettingRow>
                <SettingRow label="SSO / SAML" desc="Single sign-on via SAML 2.0">
                  <Toggle value={security.ssoEnabled} onChange={v => setSecurity(s => ({ ...s, ssoEnabled: v }))} />
                </SettingRow>
              </div>
            </div>
          </div>
        );

      case "system":
        return (
          <div>
            <div className="mb-5">
              <h2 className="font-semibold text-sm mb-1" style={{ color: "#F8FAFC" }}>System Status</h2>
              <p className="text-xs" style={{ color: "#64748B" }}>Infrastructure health and integration status.</p>
            </div>
            <div className="space-y-3">
              {[
                { name: "AI Engine", status: "Operational", version: "v4.2.1", color: "#22C55E" },
                { name: "Database", status: "Operational", version: "PostgreSQL 16", color: "#22C55E" },
                { name: "WebSocket Server", status: "Connected", version: "v2.1.0", color: "#22C55E" },
                { name: "REST API", status: "Operational", version: "v3.5.2", color: "#22C55E" },
                { name: "Video Storage", status: "87% used", version: "2.4 TB / 2.8 TB", color: "#F59E0B" },
                { name: "CDN / Edge", status: "Operational", version: "Cloudflare", color: "#22C55E" },
                { name: "Camera Feeds", status: "11/12 Online", version: "1 offline — CAM-08", color: "#F59E0B" },
              ].map(s => (
                <div
                  key={s.name}
                  className="flex items-center justify-between px-4 py-3 rounded-[8px]"
                  style={{ background: "#111821", border: "1px solid #24303D" }}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full" style={{ background: s.color }} />
                    <span className="text-sm" style={{ color: "#CBD5E1" }}>{s.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-[11px]" style={{ color: "#475569" }}>{s.version}</span>
                    <span className="font-mono text-[11px]" style={{ color: s.color }}>{s.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      default:
        return (
          <div className="flex items-center justify-center h-48">
            <span className="text-xs" style={{ color: "#475569" }}>Section under construction</span>
          </div>
        );
    }
  };

  return (
    <div className="h-full flex overflow-hidden">
      {/* Settings nav */}
      <div
        className="flex flex-col flex-shrink-0 h-full overflow-y-auto"
        style={{ width: 240, borderRight: "1px solid #1A242F", background: "#0B1017" }}
      >
        <div className="px-4 py-3" style={{ borderBottom: "1px solid #1A242F" }}>
          <div className="font-semibold text-sm" style={{ color: "#F8FAFC" }}>Settings</div>
          <div className="font-mono text-[10px]" style={{ color: "#64748B" }}>Platform configuration</div>
        </div>
        <nav className="py-2">
          {sections.map(s => {
            const active = section === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSection(s.id)}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                style={{
                  background: active ? "#111821" : "transparent",
                  color: active ? "#22D3EE" : "#64748B",
                  borderLeft: `2px solid ${active ? "#22D3EE" : "transparent"}`,
                }}
              >
                <s.icon size={13} strokeWidth={active ? 2 : 1.5} />
                <span className="text-xs font-medium">{s.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Settings content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto p-6">
          {renderSection()}
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-3 flex-shrink-0" style={{ borderTop: "1px solid #1A242F", background: "#0B1017" }}>
          {saveStatus === "saved" && (
            <span className="font-mono text-[10px]" style={{ color: "#22C55E" }}>✓ Settings saved</span>
          )}
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className="px-4 py-2 rounded-[8px] text-xs font-medium transition-colors"
            style={{ background: "#22D3EE20", color: "#22D3EE", border: "1px solid #22D3EE40", opacity: saveStatus === "saving" ? 0.6 : 1 }}
          >
            {saveStatus === "saving" ? "Saving..." : "Save Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}

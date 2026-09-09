/**
 * Lightweight event bus so DetectionCamera can push incidents/evidence
 * into the store without prop-drilling or circular imports.
 */
import type { Incident, Evidence } from "./types";

type IncidentHandler = (inc: Incident) => void;
type EvidenceHandler = (evd: Evidence) => void;

const incidentHandlers = new Set<IncidentHandler>();
const evidenceHandlers = new Set<EvidenceHandler>();

export function onDetectedIncident(fn: IncidentHandler) {
  incidentHandlers.add(fn);
  return () => incidentHandlers.delete(fn);
}

export function onDetectedEvidence(fn: EvidenceHandler) {
  evidenceHandlers.add(fn);
  return () => evidenceHandlers.delete(fn);
}

export function emitIncident(inc: Incident) {
  incidentHandlers.forEach(fn => fn(inc));
}

export function emitEvidence(evd: Evidence) {
  evidenceHandlers.forEach(fn => fn(evd));
}

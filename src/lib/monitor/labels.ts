// Human-readable labels for the monitor pipeline's internal codes — shared by
// the agent dashboard and the admin monitor panel so the same state never shows
// two different names. Plain objects only (safe to import from client code).

export const STAGE_LABEL: Record<string, string> = {
  discovered: "Discovered (parked)",
  verified: "Verified",
  drafted: "Draft queued",
  sent: "Emailed",
  outreach_phone: "Phone queue (no email)",
  suppressed: "Suppressed (unsubscribed)",
  disqualified: "Disqualified",
  "(unprocessed)": "Not yet processed",
};

export const ELIGIBILITY_LABEL: Record<string, string> = {
  eligible_now: "Eligible now (past 180d)",
  approaching: "Approaching 180d",
  too_new: "Too new (parked)",
  aged_out: "Aged out (>1 yr)",
  awaiting_authority: "Awaiting authority",
  authority_inactive: "Authority inactive",
  continuity_broken: "Uninsured right now",
  not_in_fmcsa: "Not in FMCSA data",
  "(unassessed)": "Not yet assessed",
  "(pending)": "Pending",
};

export const INSURANCE_LABEL: Record<string, string> = {
  green: "Clean history",
  amber: "Minor gaps",
  red: "Lapse history",
  unknown: "No history yet (normal)",
  "(pending)": "Not checked yet",
};

export const SAFETY_LABEL: Record<string, string> = {
  pass: "Pass",
  review: "Needs review",
  fail: "Fail",
  "(pending)": "Not checked yet",
};

export const DISQUALIFY_LABEL: Record<string, string> = {
  broker_only: "Broker-only authority",
  authority_inactive: "Authority inactive",
  safety_fail: "Failed safety gate",
};

// Label lookup with a readable fallback for keys the maps don't know.
export function labelFor(map: Record<string, string>, key: string | null | undefined): string {
  if (!key) return "—";
  return map[key] ?? key.replace(/_/g, " ").replace(/\(|\)/g, "");
}

// Safety audit — FMCSA out-of-service rates, crashes, and safety rating.
//
// HARD-disqualifies a carrier when vehicle OR driver out-of-service > 30%, or
// the safety rating is Unsatisfactory. Conditional rating or excessive crashes
// drop it to "review" (visible, not auto-contacted). Everything else passes —
// importantly, brand-new carriers with zero inspections have no OOS history, so
// they pass clean (no violations is good). A modest score penalty scales with
// OOS above the national average plus crash count.

export type SafetyStatus = "pass" | "review" | "fail";

export type SafetyInput = {
  driverInsp: number;
  driverOosRate: number;
  vehicleInsp: number;
  vehicleOosRate: number;
  crashTotal: number;
  safetyRating: string | null; // "S" | "C" | "U" | null
};

export type SafetyResult = {
  status: SafetyStatus;
  reasons: string[];
  penalty: number; // points to subtract from the acquisition score (0..40)
};

const MAX_OOS = 30; // hard cap, both vehicle and driver
const DRIVER_NAT_AVG = 5.51; // FMCSA national average driver OOS %
const VEHICLE_NAT_AVG = 20.72; // FMCSA national average vehicle OOS %
const MAX_CRASHES = 3; // 24-month window

export function rateSafety(c: SafetyInput): SafetyResult {
  const dInsp = Number(c.driverInsp) || 0;
  const vInsp = Number(c.vehicleInsp) || 0;
  const dOos = Number(c.driverOosRate) || 0;
  const vOos = Number(c.vehicleOosRate) || 0;
  const crashes = Number(c.crashTotal) || 0;
  const rating = c.safetyRating;

  // --- Hard fails (auto-disqualify). ---
  const fails: string[] = [];
  if (rating === "U") fails.push("Unsatisfactory safety rating");
  if (dInsp > 0 && dOos > MAX_OOS) fails.push(`driver OOS ${dOos.toFixed(1)}% > ${MAX_OOS}%`);
  if (vInsp > 0 && vOos > MAX_OOS) fails.push(`vehicle OOS ${vOos.toFixed(1)}% > ${MAX_OOS}%`);
  if (fails.length > 0) return { status: "fail", reasons: fails, penalty: 40 };

  // --- Review flags (kept visible, excluded from auto-contact). ---
  const flags: string[] = [];
  if (rating === "C") flags.push("Conditional safety rating");
  if (crashes > MAX_CRASHES) flags.push(`${crashes} crashes in 24mo`);

  // --- Score penalty (applies to pass + review). ---
  let penalty = 0;
  if (dInsp > 0) penalty += Math.max(0, dOos - DRIVER_NAT_AVG) * 0.5;
  if (vInsp > 0) penalty += Math.max(0, vOos - VEHICLE_NAT_AVG) * 0.3;
  penalty += crashes * 3;
  if (flags.length > 0) penalty += 10;
  penalty = Math.min(40, Math.round(penalty));

  if (flags.length > 0) return { status: "review", reasons: flags, penalty };

  const note =
    dInsp === 0 && vInsp === 0
      ? "no FMCSA inspection history yet (new carrier)"
      : "OOS within norms, no adverse rating";
  return { status: "pass", reasons: [note], penalty };
}

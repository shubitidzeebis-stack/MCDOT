// Feature flag scaffolding. Defaults are baked into the code so the
// site keeps working even if no Edge Config is wired up. Once you
// provision Edge Config (Vercel → your project → Storage → Create
// Edge Config) and connect it to the project, the runtime values
// override the defaults — no redeploy needed to flip a flag.
//
// Add a flag:
//   1. Add a key + default to FLAGS_DEFAULTS below.
//   2. Read it via `await getFlag('myFlag')` in a server component
//      or route handler.
//   3. Set the runtime value in your Edge Config dashboard.
//
// Flags are *read-mostly* config, not user-personalization. For
// per-user A/B tests use a real experimentation tool (PostHog,
// GrowthBook).

import { get } from "@vercel/edge-config";

export type FlagKey =
  | "exitIntentEnabled"
  | "preFormQualifierEnabled"
  | "tickerEnabled"
  | "testimonialsEnabled"
  | "chatWidgetEnabled"
  // Outbound monitoring agent — all default OFF so the feature is inert in
  // prod until explicitly switched on in Edge Config.
  | "monitorEnabled" // master kill switch for the whole discovery/verify sweep
  | "discoveryEnabled" // gate JUST the discover pass (pause new findings, keep verify/enrich/draft)
  | "outreachDraftEnabled" // allow LLM draft generation
  | "outreachSendEnabled" // master kill switch for actually SENDING approved mail
  | "autoSendEnabled" // skip the human approval gate (per validated persona)
  | "smsOutreachEnabled"; // allow Twilio phone/SMS fallback

const FLAGS_DEFAULTS: Record<FlagKey, boolean> = {
  exitIntentEnabled: true,
  preFormQualifierEnabled: true,
  tickerEnabled: true,
  testimonialsEnabled: true,
  // Customer chat widget — default OFF. Flip to true in Edge Config to
  // launch. Both the widget client and the /api/chat route check this.
  chatWidgetEnabled: false,
  monitorEnabled: false,
  // Default OFF (fail-safe paused): discovery only runs when explicitly set true
  // in Edge Config. Lets us work the standing backlog without adding new rows,
  // and resume later by flipping this — no redeploy. verify/enrich/draft are
  // unaffected (they run whenever monitorEnabled is on).
  discoveryEnabled: false,
  outreachDraftEnabled: false,
  outreachSendEnabled: false,
  autoSendEnabled: false,
  smsOutreachEnabled: false,
};

export async function getFlag(key: FlagKey): Promise<boolean> {
  // No Edge Config connection string → fall back to defaults so dev
  // and preview environments don't fail.
  if (!process.env.EDGE_CONFIG) return FLAGS_DEFAULTS[key];
  try {
    const value = await get<boolean>(key);
    if (typeof value === "boolean") return value;
    return FLAGS_DEFAULTS[key];
  } catch {
    return FLAGS_DEFAULTS[key];
  }
}

// Non-boolean runtime config (Edge Config supports any JSON value). Used for
// tunables that aren't simple on/off switches.
export type ConfigKey =
  | "monitorDays" // CSV of UTC weekday numbers the sweep runs (0=Sun .. 6=Sat)
  | "autoSendPersonas" // CSV allowlist of persona keys cleared for auto-send
  | "outreachDailyCap"; // max cold emails per rolling 24h — the warm-up throttle

const CONFIG_DEFAULTS: Record<ConfigKey, string> = {
  monitorDays: "0,1,2,3,4,5,6", // every day (cron itself fires once daily)
  autoSendPersonas: "",
  // Warm-up ramp: bump in Edge Config weekly (20 → 40 → 70 → 100 → 150), no
  // redeploy. The sender also spreads sends across hourly cron runs.
  outreachDailyCap: "20",
};

export async function getConfigValue(key: ConfigKey): Promise<string> {
  if (!process.env.EDGE_CONFIG) return CONFIG_DEFAULTS[key];
  try {
    const value = await get<string>(key);
    if (typeof value === "string") return value;
    return CONFIG_DEFAULTS[key];
  } catch {
    return CONFIG_DEFAULTS[key];
  }
}

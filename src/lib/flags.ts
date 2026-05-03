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
  | "testimonialsEnabled";

const FLAGS_DEFAULTS: Record<FlagKey, boolean> = {
  exitIntentEnabled: true,
  preFormQualifierEnabled: true,
  tickerEnabled: true,
  testimonialsEnabled: true,
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

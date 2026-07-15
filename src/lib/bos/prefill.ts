// Hand-off between the admin leads table and the Bill of Sale generator.
// The lead's details ride in sessionStorage (same tab only) instead of URL
// query params so names/addresses never land in server logs or history.

export const BOS_PREFILL_KEY = "bos-prefill";

export type BosPrefill = {
  companyName?: string;
  companyDba?: string;
  sellerName?: string;
  mcNumber?: string;
  usdotNumber?: string;
  companyAddress?: string;
  companyPhone?: string;
};

export function stashBosPrefill(prefill: BosPrefill): void {
  try {
    sessionStorage.setItem(BOS_PREFILL_KEY, JSON.stringify(prefill));
  } catch {
    // storage unavailable — generator just opens blank
  }
}

export function takeBosPrefill(): BosPrefill | null {
  try {
    const raw = sessionStorage.getItem(BOS_PREFILL_KEY);
    if (!raw) return null;
    sessionStorage.removeItem(BOS_PREFILL_KEY);
    const parsed = JSON.parse(raw) as BosPrefill;
    return typeof parsed === "object" && parsed !== null ? parsed : null;
  } catch {
    return null;
  }
}

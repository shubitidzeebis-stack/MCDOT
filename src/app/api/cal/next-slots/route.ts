import { NextResponse } from "next/server";

// Public endpoint: returns the next ~3 available booking slots for the
// Veritor 15-minute call. Used on the wizard reveal screen so the
// seller sees concrete next-available times before they even click
// into the embedded calendar.
//
// Cal.com v2 slots API:
//   GET https://api.cal.eu/v2/slots?eventTypeId=...&start=...&end=...
// Auth: Bearer token via Authorization header.

export const dynamic = "force-dynamic";

const EVENT_TYPE_ID = 284956; // lukaveritor / 15min on cal.eu
const CAL_API_BASE = "https://api.cal.eu";

type SlotsResponse = {
  data?: Record<string, Array<{ start: string }>>;
};

export async function GET() {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, slots: [] });
  }

  // Look 7 days ahead — usually enough to find at least 3 slots even
  // for a busy week.
  const now = new Date();
  const start = now.toISOString().slice(0, 10);
  const endDate = new Date(now);
  endDate.setUTCDate(endDate.getUTCDate() + 7);
  const end = endDate.toISOString().slice(0, 10);

  try {
    const url = `${CAL_API_BASE}/v2/slots?eventTypeId=${EVENT_TYPE_ID}&start=${start}&end=${end}`;
    const res = await fetch(url, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "cal-api-version": "2024-09-04",
      },
      // Slots are time-sensitive — don't cache aggressively.
      next: { revalidate: 60 },
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) {
      return NextResponse.json({ ok: false, slots: [] });
    }
    const data = (await res.json()) as SlotsResponse;

    // Flatten + collect first 3 future slots that are at least 30 min
    // away (so we don't show "12:34 PM" for a 12:30 slot they can't book).
    const flat: string[] = [];
    if (data.data) {
      for (const day of Object.keys(data.data).sort()) {
        for (const slot of data.data[day] ?? []) {
          flat.push(slot.start);
        }
      }
    }
    const earliest = Date.now() + 30 * 60 * 1000;
    const upcoming = flat
      .filter((iso) => new Date(iso).getTime() >= earliest)
      .slice(0, 3);

    return NextResponse.json({ ok: true, slots: upcoming });
  } catch (err) {
    console.error("[cal/next-slots] error", err);
    return NextResponse.json({ ok: false, slots: [] });
  }
}

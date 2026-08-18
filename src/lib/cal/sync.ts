// Pull upcoming bookings from cal.eu into the cal_meetings mirror.
//
// Why polling instead of a Cal webhook: the reminder cron already runs every
// 5 minutes, one GET /v2/bookings returns the ENTIRE upcoming window in one
// deterministic snapshot — new bookings, reschedules and cancellations all
// reconcile on every tick, with nothing to miss and no webhook signature
// scheme to maintain. The admin page additionally calls syncIfStale() so the
// widget is current the moment someone actually looks at it.
//
// Auth + versioning mirror the proven call in app/api/cal/next-slots/route.ts:
// Bearer CAL_API_KEY, cal-api-version pinned. Bookings use Cal's 2024-08-13
// contract (verified live 2026-08-18: {status, data: [...], pagination}).
//
// Lead matching happens here, at sync time, so a booking arrives on the admin
// page already carrying its company — same philosophy as the Quo webhook's
// findLocalByContact() at ingest. Sellers book through the wizard embed with
// their email pre-filled, so the email nearly always matches a valuation.

import { findLocalByContact } from "@/lib/db/contact-search";
import { last10 } from "@/lib/db/calls";
import {
  cancelMissingUpcoming,
  getSyncedAt,
  markSynced,
  upsertMeeting,
} from "@/lib/db/meetings";

const CAL_API_BASE = "https://api.cal.eu";

type CalAttendee = {
  name?: string;
  email?: string;
  phoneNumber?: string;
  timeZone?: string;
};

type CalBooking = {
  id?: number;
  uid?: string;
  title?: string;
  status?: string;
  start?: string;
  end?: string;
  meetingUrl?: string;
  location?: string;
  attendees?: CalAttendee[];
};

type CalBookingsResponse = {
  data?: CalBooking[];
  pagination?: { totalItems?: number };
};

function str(v: unknown): string | null {
  return typeof v === "string" && v.length > 0 ? v : null;
}

/** Resolve a booking's attendee to a lead. Never throws — an unmatched
 * meeting is still worth showing. Prefers an inbound lead over a cold
 * monitor row, exactly like the calls pipeline. */
async function matchLead(
  email: string | null,
  phone: string | null,
): Promise<{ valuationId: number | null; matchSource: string | null }> {
  try {
    for (const [kind, value] of [
      ["email", email?.trim() || null],
      ["phone", phone ? last10(phone) : null],
    ] as const) {
      if (!value) continue;
      const matches = await findLocalByContact(kind, value);
      if (matches.length === 0) continue;
      const lead = matches.find((m) => m.source === "lead");
      const best = lead ?? matches[0];
      return { valuationId: best.valuationId, matchSource: best.source };
    }
  } catch (err) {
    console.error("[cal/sync] lead match failed", err);
  }
  return { valuationId: null, matchSource: null };
}

export type SyncResult = {
  ok: boolean;
  synced: number;
  cancelled: number;
  error?: string;
};

export async function syncCalMeetings(): Promise<SyncResult> {
  const apiKey = process.env.CAL_API_KEY;
  if (!apiKey) {
    return { ok: false, synced: 0, cancelled: 0, error: "CAL_API_KEY not set" };
  }

  let body: CalBookingsResponse;
  try {
    const res = await fetch(
      `${CAL_API_BASE}/v2/bookings?status=upcoming&take=100`,
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "cal-api-version": "2024-08-13",
        },
        cache: "no-store",
        signal: AbortSignal.timeout(10_000),
      },
    );
    if (!res.ok) {
      return { ok: false, synced: 0, cancelled: 0, error: `Cal ${res.status}` };
    }
    body = (await res.json()) as CalBookingsResponse;
  } catch (err) {
    const msg = err instanceof Error ? err.message : "fetch failed";
    return { ok: false, synced: 0, cancelled: 0, error: msg };
  }

  const bookings = Array.isArray(body.data) ? body.data : [];
  const total = body.pagination?.totalItems;
  if (typeof total === "number" && total > bookings.length) {
    // No silent caps: >100 upcoming bookings would leave the tail unsynced.
    console.error(
      `[cal/sync] upcoming window truncated: ${bookings.length} of ${total}`,
    );
  }

  const uids: string[] = [];
  for (const b of bookings) {
    const uid = str(b.uid);
    const startsAt = str(b.start);
    if (!uid || !startsAt) continue;
    const attendee = b.attendees?.[0] ?? {};
    const email = str(attendee.email);
    const phone = str(attendee.phoneNumber);
    const { valuationId, matchSource } = await matchLead(email, phone);
    await upsertMeeting({
      uid,
      calId: typeof b.id === "number" ? b.id : null,
      title: str(b.title),
      status: str(b.status) ?? "accepted",
      startsAt,
      endsAt: str(b.end),
      attendeeName: str(attendee.name),
      attendeeEmail: email,
      attendeePhone: phone,
      attendeeTz: str(attendee.timeZone),
      joinUrl: str(b.meetingUrl) ?? str(b.location),
      valuationId,
      matchSource,
    });
    uids.push(uid);
  }

  const cancelled = await cancelMissingUpcoming(uids);
  await markSynced();
  return { ok: true, synced: uids.length, cancelled };
}

/**
 * Refresh the mirror unless it was synced within the last `maxAgeMs`.
 * Swallows errors: the admin page must render (with slightly stale rows)
 * even when cal.eu is down — the 5-minute cron is the recovery path.
 */
export async function syncIfStale(maxAgeMs = 2 * 60_000): Promise<void> {
  try {
    const at = await getSyncedAt();
    if (at && Date.now() - at.getTime() < maxAgeMs) return;
    const result = await syncCalMeetings();
    if (!result.ok) console.error("[cal/sync] refresh failed:", result.error);
  } catch (err) {
    console.error("[cal/sync] refresh crashed", err);
  }
}

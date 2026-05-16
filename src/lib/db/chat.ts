// Chat session + message persistence for the customer chat widget.
// Schema per docs/chat-widget-spec.md §2 (in the Veritor-Jarvis repo).
//
// Why this matters: the route handler reconstructs conversation history
// from chat_messages keyed by sessionId — the client never sends prior
// assistant turns. That's the anti-fabrication defense (without it a
// malicious client could inject "of course, $200K for any MC" as a fake
// prior assistant turn). See route handler comments.
//
// Pattern matches src/lib/db/leads.ts: lazy neon() handle, idempotent
// ensureTable() with additive ALTER for forward-compat, no-op when
// DATABASE_URL is missing (so local dev without DB still works).

import { createHash } from "node:crypto";
import { neon } from "@neondatabase/serverless";
import type { Locale } from "@/lib/i18n";

let initialized = false;

type Sql = ReturnType<typeof neon>;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureTable(sql: Sql) {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS chat_sessions (
      session_id      UUID PRIMARY KEY,
      created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      turn_count      INT NOT NULL DEFAULT 0,
      ip_hash         TEXT,
      user_agent      TEXT,
      locale          TEXT NOT NULL,
      captured_email  TEXT,
      captured_mc     TEXT,
      handed_off      BOOLEAN NOT NULL DEFAULT FALSE,
      flagged_abuse   BOOLEAN NOT NULL DEFAULT FALSE
    )
  `;
  await sql`
    CREATE TABLE IF NOT EXISTS chat_messages (
      id          BIGSERIAL PRIMARY KEY,
      session_id  UUID NOT NULL REFERENCES chat_sessions(session_id) ON DELETE CASCADE,
      ts          TIMESTAMPTZ NOT NULL DEFAULT now(),
      role        TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
      content     TEXT NOT NULL CHECK (length(content) < 8000),
      tokens_in   INT,
      tokens_out  INT
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS chat_sessions_created_at_idx
      ON chat_sessions (created_at DESC)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS chat_sessions_handed_off_idx
      ON chat_sessions (handed_off) WHERE handed_off = TRUE
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS chat_messages_session_id_idx
      ON chat_messages (session_id, ts)
  `;
  initialized = true;
}

// SHA256(ip + IP_HASH_SECRET). Rotating IP_HASH_SECRET severs historical
// correlation — that's the intended privacy trade-off (per spec §2).
// If the secret is missing, returns a placeholder so callers don't get
// untyped failures; this is logged once per cold start so misconfig
// surfaces in Vercel logs.
let warnedNoSecret = false;
export function hashIp(ip: string): string {
  const secret = process.env.IP_HASH_SECRET;
  if (!secret) {
    if (!warnedNoSecret) {
      console.warn("[chat/db] IP_HASH_SECRET not set — using insecure placeholder");
      warnedNoSecret = true;
    }
    return createHash("sha256").update(ip + "no-secret").digest("hex");
  }
  return createHash("sha256").update(ip + secret).digest("hex");
}

export type ChatRole = "user" | "assistant";

export type ChatSession = {
  session_id: string;
  turn_count: number;
  locale: Locale;
  captured_email: string | null;
  captured_mc: string | null;
  handed_off: boolean;
  flagged_abuse: boolean;
};

export type ChatMessage = {
  role: ChatRole;
  content: string;
};

// Returns the session row if it exists. Used to short-circuit cases where
// the client posts a sessionId the server doesn't know about (rare —
// usually means localStorage drift or a fabricated id).
export async function getSession(sessionId: string): Promise<ChatSession | null> {
  const sql = getSql();
  if (!sql) return null;
  await ensureTable(sql);
  const rows = (await sql`
    SELECT session_id, turn_count, locale, captured_email, captured_mc,
           handed_off, flagged_abuse
    FROM chat_sessions
    WHERE session_id = ${sessionId}
  `) as ChatSession[];
  return rows[0] ?? null;
}

// Idempotent: safe to call on every request. Uses INSERT ... ON CONFLICT
// DO NOTHING so a race between two concurrent first-message requests
// doesn't error out — both end up with the same row.
export async function ensureSession(args: {
  sessionId: string;
  locale: Locale;
  ipHash: string;
  userAgent: string;
}): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTable(sql);
  await sql`
    INSERT INTO chat_sessions (session_id, ip_hash, user_agent, locale)
    VALUES (${args.sessionId}, ${args.ipHash}, ${args.userAgent}, ${args.locale})
    ON CONFLICT (session_id) DO NOTHING
  `;
}

// Defensive cap at 30 turns — spec §1 enforces a 15-turn handoff
// upstream, this is a belt-and-suspenders limit on bytes sent to Claude
// in case the upstream cap is ever bypassed.
export async function getHistory(
  sessionId: string,
  limit = 30,
): Promise<ChatMessage[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureTable(sql);
  const rows = (await sql`
    SELECT role, content
    FROM chat_messages
    WHERE session_id = ${sessionId}
    ORDER BY ts ASC
    LIMIT ${limit}
  `) as ChatMessage[];
  return rows;
}

export async function appendMessage(args: {
  sessionId: string;
  role: ChatRole;
  content: string;
  tokensIn?: number;
  tokensOut?: number;
}): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTable(sql);
  await sql`
    INSERT INTO chat_messages (session_id, role, content, tokens_in, tokens_out)
    VALUES (
      ${args.sessionId},
      ${args.role},
      ${args.content},
      ${args.tokensIn ?? null},
      ${args.tokensOut ?? null}
    )
  `;
  // turn_count tracks USER turns only (the spec's 15-turn cap is in
  // user-turn units — see spec §7 / handoff.ts TURN_CAP). Incrementing
  // on assistant inserts too would trip the cap at ~7.5 user messages.
  await sql`
    UPDATE chat_sessions
       SET last_message_at = now(),
           turn_count = turn_count + CASE WHEN ${args.role} = 'user' THEN 1 ELSE 0 END
     WHERE session_id = ${args.sessionId}
  `;
}

// Captured fields are gated upstream — caller must only invoke this
// after a handoff prompt has fired (per spec §8). Either field may be
// updated independently; passing null keeps the existing value.
export async function updateCaptured(args: {
  sessionId: string;
  email?: string | null;
  mc?: string | null;
}): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTable(sql);
  await sql`
    UPDATE chat_sessions
       SET captured_email = COALESCE(${args.email ?? null}, captured_email),
           captured_mc    = COALESCE(${args.mc ?? null}, captured_mc)
     WHERE session_id = ${args.sessionId}
  `;
}

export async function markHandedOff(sessionId: string): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureTable(sql);
  await sql`
    UPDATE chat_sessions
       SET handed_off = TRUE
     WHERE session_id = ${sessionId}
  `;
}

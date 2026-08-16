// To-do items extracted from call transcripts (lib/quo/insights.ts) — "send
// the BoS", "call back Tuesday", "seller sends insurance docs". One row per
// commitment, linked to the lead and to the call it came from, surfaced as a
// checklist on /admin. Same no-migration convention as calls.ts.

import { neon } from "@neondatabase/serverless";
import type { CallActionItem } from "@/lib/quo/insights";

type Sql = ReturnType<typeof neon>;

let initialized = false;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureSchema(sql: Sql): Promise<void> {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS lead_action_items (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      valuation_id INT NOT NULL,
      call_id TEXT,
      -- 'lukas' | 'donnie' | 'seller' | 'other'
      owner TEXT NOT NULL,
      text TEXT NOT NULL,
      -- Verbatim time reference from the call ("Tuesday 3pm"), or null.
      due_hint TEXT,
      done_at TIMESTAMPTZ,
      done_by TEXT
    )
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS lead_action_items_open_idx
      ON lead_action_items (created_at DESC)
      WHERE done_at IS NULL
  `;
  await sql`CREATE INDEX IF NOT EXISTS lead_action_items_valuation_idx ON lead_action_items (valuation_id)`;
  initialized = true;
}

export async function addActionItems(
  valuationId: number,
  callId: string | null,
  items: CallActionItem[],
): Promise<void> {
  if (items.length === 0) return;
  const sql = getSql();
  if (!sql) return;
  await ensureSchema(sql);
  for (const item of items) {
    const text = item.text.trim().slice(0, 500);
    if (!text) continue;
    await sql`
      INSERT INTO lead_action_items (valuation_id, call_id, owner, text, due_hint)
      VALUES (
        ${valuationId}, ${callId}, ${item.owner}, ${text},
        ${item.due.trim() || null}
      )
    `;
  }
}

export type ActionItemRow = {
  id: number;
  created_at: string;
  valuation_id: number;
  call_id: string | null;
  owner: string;
  text: string;
  due_hint: string | null;
  legal_name: string | null;
  contact_name: string | null;
};

export async function listOpenActionItems(limit = 30): Promise<ActionItemRow[]> {
  const sql = getSql();
  if (!sql) return [];
  try {
    await ensureSchema(sql);
    return (await sql`
      SELECT a.id, a.created_at::text AS created_at, a.valuation_id, a.call_id,
             a.owner, a.text, a.due_hint, v.legal_name, v.contact_name
        FROM lead_action_items a
        LEFT JOIN valuations v ON v.id = a.valuation_id
       WHERE a.done_at IS NULL
       ORDER BY a.created_at DESC
       LIMIT ${limit}
    `) as ActionItemRow[];
  } catch (err) {
    console.error("[listOpenActionItems] read failed", err);
    return [];
  }
}

export async function markActionItemDone(
  id: number,
  actor: string,
  done: boolean,
): Promise<void> {
  const sql = getSql();
  if (!sql) return;
  await ensureSchema(sql);
  if (done) {
    await sql`
      UPDATE lead_action_items
         SET done_at = now(), done_by = ${actor}
       WHERE id = ${id}
    `;
  } else {
    await sql`
      UPDATE lead_action_items
         SET done_at = NULL, done_by = NULL
       WHERE id = ${id}
    `;
  }
}

import { neon } from "@neondatabase/serverless";

// Logs every email sent via the admin panel so the team can see history
// per valuation in the detail drawer.

type Sql = ReturnType<typeof neon>;

let initialized = false;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

async function ensureTable(sql: Sql) {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_email_log (
      id SERIAL PRIMARY KEY,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      valuation_id INTEGER,
      sent_by_user_id INTEGER,
      sent_by_email TEXT,
      sent_by_name TEXT,
      to_email TEXT NOT NULL,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      resend_id TEXT
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS admin_email_log_valuation_idx ON admin_email_log (valuation_id)`;
  await sql`CREATE INDEX IF NOT EXISTS admin_email_log_created_at_idx ON admin_email_log (created_at DESC)`;
  initialized = true;
}

export type EmailLogEntry = {
  id: number;
  created_at: string;
  valuation_id: number | null;
  sent_by_email: string | null;
  sent_by_name: string | null;
  to_email: string;
  subject: string;
  body: string;
  resend_id: string | null;
};

export async function logSentEmail(entry: {
  valuationId: number | null;
  sentByUserId: number | null;
  sentByEmail: string | null;
  sentByName: string | null;
  toEmail: string;
  subject: string;
  body: string;
  resendId: string | null;
}): Promise<{ ok: boolean }> {
  const sql = getSql();
  if (!sql) return { ok: false };
  try {
    await ensureTable(sql);
    await sql`
      INSERT INTO admin_email_log (
        valuation_id, sent_by_user_id, sent_by_email, sent_by_name,
        to_email, subject, body, resend_id
      ) VALUES (
        ${entry.valuationId},
        ${entry.sentByUserId},
        ${entry.sentByEmail},
        ${entry.sentByName},
        ${entry.toEmail},
        ${entry.subject},
        ${entry.body},
        ${entry.resendId}
      )
    `;
    return { ok: true };
  } catch (err) {
    console.error("[email-history.logSentEmail] error", err);
    return { ok: false };
  }
}

export async function listEmailsForValuation(
  valuationId: number,
): Promise<EmailLogEntry[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureTable(sql);
  const rows = (await sql`
    SELECT id, created_at::text AS created_at, valuation_id,
           sent_by_email, sent_by_name, to_email, subject, body, resend_id
      FROM admin_email_log
     WHERE valuation_id = ${valuationId}
     ORDER BY created_at DESC
     LIMIT 50
  `) as EmailLogEntry[];
  return rows;
}

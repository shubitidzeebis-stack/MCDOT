import { neon } from "@neondatabase/serverless";
import { hashPassword, verifyPassword } from "@/lib/auth/passwords";

// Admin user accounts. Auto-seeds 4 default users on first DB init
// (Luka, Lisa, Keira, Giorgi) using the current ADMIN_KEY env var as
// their initial shared password. Each user is expected to log in once
// and then change their password from the admin UI.

type Sql = ReturnType<typeof neon>;

let initialized = false;

function getSql(): Sql | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return neon(url);
}

export type AdminUser = {
  id: number;
  email: string;
  name: string | null;
  role: string;
  created_at: string;
  last_login_at: string | null;
};

const DEFAULT_USERS = [
  { email: "luka@groupveritor.com", name: "Luka S." },
  { email: "lisa@groupveritor.com", name: "Lisa K." },
  { email: "keira@groupveritor.com", name: "Keira T." },
  { email: "giorgi@groupveritor.com", name: "Giorgi S." },
];

async function ensureTable(sql: Sql) {
  if (initialized) return;
  await sql`
    CREATE TABLE IF NOT EXISTS admin_users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT,
      role TEXT NOT NULL DEFAULT 'admin',
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      last_login_at TIMESTAMPTZ
    )
  `;
  await sql`CREATE INDEX IF NOT EXISTS admin_users_email_idx ON admin_users (email)`;
  initialized = true;

  // Auto-seed if empty. Use ADMIN_KEY as the shared initial password so
  // existing access patterns continue to work for the team.
  const count = (await sql`SELECT COUNT(*) AS c FROM admin_users`) as Array<{
    c: string;
  }>;
  if (Number(count[0]?.c ?? 0) === 0) {
    const initialPassword = process.env.ADMIN_KEY ?? "ChangeMe1234!";
    if (initialPassword.length >= 8) {
      const hash = await hashPassword(initialPassword);
      for (const u of DEFAULT_USERS) {
        await sql`
          INSERT INTO admin_users (email, password_hash, name, role)
          VALUES (${u.email}, ${hash}, ${u.name}, 'admin')
          ON CONFLICT (email) DO NOTHING
        `;
      }
      console.log(
        "[admin-users] seeded 4 default users with shared initial password",
      );
    } else {
      console.warn(
        "[admin-users] ADMIN_KEY too short to seed default users — skip",
      );
    }
  }
}

export async function findUserByEmail(email: string): Promise<
  | (AdminUser & { password_hash: string })
  | null
> {
  const sql = getSql();
  if (!sql) return null;
  await ensureTable(sql);
  const rows = (await sql`
    SELECT id, email, password_hash, name, role,
           created_at::text AS created_at,
           last_login_at::text AS last_login_at
      FROM admin_users
     WHERE email = ${email.toLowerCase()}
     LIMIT 1
  `) as Array<AdminUser & { password_hash: string }>;
  return rows[0] ?? null;
}

export async function attemptLogin(
  email: string,
  password: string,
): Promise<AdminUser | null> {
  const user = await findUserByEmail(email);
  if (!user) return null;
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) return null;

  // Touch last_login_at — best-effort.
  try {
    const sql = getSql();
    if (sql) {
      await sql`
        UPDATE admin_users SET last_login_at = now() WHERE id = ${user.id}
      `;
    }
  } catch {
    // ignore
  }

  // Strip password_hash before returning.
  const { password_hash, ...rest } = user;
  void password_hash;
  return rest as AdminUser;
}

export async function listUsers(): Promise<AdminUser[]> {
  const sql = getSql();
  if (!sql) return [];
  await ensureTable(sql);
  const rows = (await sql`
    SELECT id, email, name, role,
           created_at::text AS created_at,
           last_login_at::text AS last_login_at
      FROM admin_users
     ORDER BY id ASC
  `) as AdminUser[];
  return rows;
}

export async function changePassword(
  userId: number,
  newPassword: string,
): Promise<{ ok: boolean; reason?: string }> {
  if (newPassword.length < 8) {
    return { ok: false, reason: "Password must be at least 8 characters." };
  }
  const sql = getSql();
  if (!sql) return { ok: false, reason: "DB unavailable" };
  const hash = await hashPassword(newPassword);
  await sql`
    UPDATE admin_users
       SET password_hash = ${hash}, updated_at = now()
     WHERE id = ${userId}
  `;
  return { ok: true };
}

export async function createUser(
  email: string,
  password: string,
  name: string | null,
): Promise<{ ok: boolean; reason?: string; user?: AdminUser }> {
  if (password.length < 8) {
    return { ok: false, reason: "Password must be at least 8 characters." };
  }
  const trimmedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { ok: false, reason: "Email is not valid." };
  }
  const sql = getSql();
  if (!sql) return { ok: false, reason: "DB unavailable" };
  await ensureTable(sql);
  const hash = await hashPassword(password);
  try {
    const rows = (await sql`
      INSERT INTO admin_users (email, password_hash, name, role)
      VALUES (${trimmedEmail}, ${hash}, ${name}, 'admin')
      RETURNING id, email, name, role,
                created_at::text AS created_at,
                last_login_at::text AS last_login_at
    `) as AdminUser[];
    return { ok: true, user: rows[0] };
  } catch (err) {
    if (err && (err as { code?: string }).code === "23505") {
      return { ok: false, reason: "A user with that email already exists." };
    }
    console.error("[admin-users.createUser] error", err);
    return { ok: false, reason: "Could not create user." };
  }
}

export async function deleteUser(
  userId: number,
): Promise<{ ok: boolean; reason?: string }> {
  const sql = getSql();
  if (!sql) return { ok: false, reason: "DB unavailable" };
  await ensureTable(sql);
  // Don't allow deleting the very last admin — guard against locking
  // everyone out.
  const count = (await sql`SELECT COUNT(*) AS c FROM admin_users`) as Array<{
    c: string;
  }>;
  if (Number(count[0]?.c ?? 0) <= 1) {
    return { ok: false, reason: "Can't remove the last admin." };
  }
  await sql`DELETE FROM admin_users WHERE id = ${userId}`;
  return { ok: true };
}

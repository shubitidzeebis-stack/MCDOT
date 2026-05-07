import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";

// Password hashing using Node's built-in scrypt — no external deps.
//
// Storage format:  scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>
// We store the parameters with the hash so they can be tuned later
// without breaking existing hashes.

// Manual promise wrapper so we can pass scrypt options. The util.promisify
// overload doesn't type-check the options argument cleanly.
function scryptAsync(
  password: string | Buffer,
  salt: string | Buffer,
  keylen: number,
  options: { N: number; r: number; p: number },
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scryptCallback(password, salt, keylen, options, (err, derived) => {
      if (err) reject(err);
      else resolve(derived);
    });
  });
}

const N = 16384;
const r = 8;
const p = 1;
const KEYLEN = 64;

export async function hashPassword(password: string): Promise<string> {
  if (typeof password !== "string" || password.length < 8) {
    throw new Error("Password must be at least 8 characters.");
  }
  const salt = randomBytes(16);
  const hash = await scryptAsync(password.normalize("NFKC"), salt, KEYLEN, {
    N,
    r,
    p,
  });
  return `scrypt$${N}$${r}$${p}$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  if (!stored || typeof stored !== "string") return false;
  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== "scrypt") return false;
  const [, ns, rs, ps, saltHex, hashHex] = parts;
  const sN = Number(ns);
  const sR = Number(rs);
  const sP = Number(ps);
  if (!Number.isFinite(sN) || !Number.isFinite(sR) || !Number.isFinite(sP)) return false;

  let salt: Buffer;
  let expected: Buffer;
  try {
    salt = Buffer.from(saltHex, "hex");
    expected = Buffer.from(hashHex, "hex");
  } catch {
    return false;
  }

  const candidate = await scryptAsync(
    password.normalize("NFKC"),
    salt,
    expected.length,
    { N: sN, r: sR, p: sP },
  );

  if (candidate.length !== expected.length) return false;
  return timingSafeEqual(candidate, expected);
}

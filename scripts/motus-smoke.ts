// Live smoke test for src/lib/motus.ts against known canary carriers.
// Run: npx --yes tsx scripts/motus-smoke.ts
// (No secrets needed — the Motus API is public.)
import {
  motusLookupByDot,
  motusResolveDocketToDot,
  motusToLegacyRows,
} from "../src/lib/motus";

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function main() {
// 1. Motus-era carrier (registered 2026-05-18, granted 08-03, insured).
const hw = await motusLookupByDot("8806636");
if (!hw) fail("8806636 not found in Motus");
console.log("8806636:", {
  legalName: hw.legalName,
  hasActiveAuthority: hw.hasActiveAuthority,
  dockets: hw.dockets,
  insuranceActive: hw.insuranceActive,
  maxCov: hw.insuranceMaxCoverage,
  powerUnits: hw.powerUnits,
  drivers: hw.drivers,
  address: hw.address,
  phone: hw.phone,
  mcs150Date: hw.mcs150Date,
});
if (!hw.hasActiveAuthority) fail("8806636 should have active authority");
if (!hw.insuranceActive) fail("8806636 should be insured");
if (!hw.dockets.includes("54058086")) fail("8806636 should carry docket 54058086");

// 2. Established carrier (suspended 07-01, reinstated with replacement policy).
const t924 = await motusLookupByDot("1374494");
if (!t924) fail("1374494 not found in Motus");
console.log("1374494:", {
  legalName: t924.legalName,
  hasActiveAuthority: t924.hasActiveAuthority,
  dockets: t924.dockets,
  insuranceActive: t924.insuranceActive,
  maxCov: t924.insuranceMaxCoverage,
});
const legacy = motusToLegacyRows(t924);
console.log("1374494 legacy-shaped:", JSON.stringify(legacy, null, 1));
if (legacy.carrierRows.length === 0) fail("1374494 should synthesize carrier rows");

// 3. New-format docket resolution.
const dot = await motusResolveDocketToDot("54058086");
console.log("MC54058086 →", dot);
if (dot !== "8806636") fail(`docket resolve expected 8806636, got ${dot}`);

// 4. Unknown carrier → null, not a throw.
const nothing = await motusLookupByDot("99999999");
console.log("99999999 →", nothing);
if (nothing !== null) fail("nonexistent DOT should be null");

console.log("\nALL SMOKE CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

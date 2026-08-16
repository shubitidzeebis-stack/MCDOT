// End-to-end smoke of lookupCarrier's source chain. From a non-US network
// QCMobile/SAFER 403 (geo-block), which exercises the exact fallback path the
// wizard needs when QCMobile is empty or down: Motus lookup → docket re-entry
// attempt → synthesis. Run: npx --yes tsx scripts/lookup-smoke.ts
import { readFileSync } from "node:fs";
import { lookupCarrier } from "../src/lib/fmcsa";

for (const line of readFileSync(".env.local", "utf8").split("\n")) {
  const m = line.match(/^(FMCSA_API_KEY|FMCSA_SOCRATA_TOKEN)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

function fail(msg: string): never {
  console.error(`FAIL: ${msg}`);
  process.exit(1);
}

async function main() {
  // Motus-era carrier — must resolve via Motus regardless of QCMobile state.
  const hw = await lookupCarrier("8806636", "dot");
  if (!hw.ok) fail(`8806636 lookup failed: ${hw.message}`);
  console.log("8806636:", {
    legalName: hw.carrier.legalName,
    authority: hw.carrier.commonAuthorityStatus,
    allowed: hw.carrier.allowedToOperate,
    bipd: hw.carrier.bipdInsuranceOnFile,
    mcNumbers: hw.mcNumbers,
    source: hw.carrier._motus?.carrierSource,
    overrides: hw.carrier._motus?.overrides,
    address: hw.carrier.phyCity,
  });
  if (hw.carrier.commonAuthorityStatus !== "A") fail("8806636 should be Active");
  if (Number(hw.carrier.bipdInsuranceOnFile) <= 0) fail("8806636 should be insured");
  if (!hw.mcNumbers.includes("54058086")) fail("8806636 should list docket 54058086");
  if (!hw.carrier._motus?.found) fail("8806636 _motus.found should be true");

  // New-format MC input — the wizard's mc path for a Motus-era docket.
  const byMc = await lookupCarrier("MC54058086", "mc");
  if (!byMc.ok) fail(`MC54058086 lookup failed: ${byMc.message}`);
  if (String(byMc.carrier.dotNumber) !== "8806636")
    fail(`MC54058086 should resolve to 8806636, got ${byMc.carrier.dotNumber}`);
  console.log("MC54058086 → DOT", byMc.carrier.dotNumber, "OK");

  // Established carrier — via Motus when QCMobile can't answer.
  const t924 = await lookupCarrier("1374494", "dot");
  if (!t924.ok) fail(`1374494 lookup failed: ${t924.message}`);
  console.log("1374494:", {
    legalName: t924.carrier.legalName,
    authority: t924.carrier.commonAuthorityStatus,
    bipd: t924.carrier.bipdInsuranceOnFile,
    source: t924.carrier._motus?.carrierSource,
  });

  // Nonexistent — must be a clean miss or honest api_error, never a crash.
  const nope = await lookupCarrier("99999999", "dot");
  console.log("99999999:", nope.ok ? "UNEXPECTED OK" : `${nope.reason}`);
  if (nope.ok) fail("99999999 should not resolve");

  console.log("\nALL LOOKUP SMOKE CHECKS PASSED");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

// Agent operations dashboard at /admin/agent — live view of the FMCSA
// monitoring pipeline (funnel, eligibility, insurance quality, hot prospects,
// activity feed, sweep runs, and a readiness checklist). Auth mirrors /admin.

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { ADMIN_COOKIE, verifySession } from "@/lib/auth/sessions";
import { getConfigValue, getFlag } from "@/lib/flags";
import {
  getEligibilityCounts,
  getInsuranceRatingCounts,
  getMonitorStageCounts,
  getOutreachControl,
  getOutreachHealth,
  getOutreachStageCounts,
  getRecentAgentActions,
  getSafetyStatusCounts,
  listAllCursors,
  listHotProspects,
  listOutreachSentRows,
} from "@/lib/db/monitor";
import { AgentDashboard } from "@/components/AgentDashboard";

export const metadata: Metadata = {
  title: "Agent",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AgentPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>;
}) {
  const expected = process.env.ADMIN_KEY ?? "";
  const { key } = await searchParams;

  const cookieStore = await cookies();
  const session = verifySession(cookieStore.get(ADMIN_COOKIE)?.value);
  const okSession = !!session;
  const okLegacyKey = expected.length > 0 && key === expected;
  const okInDev = expected.length === 0 && process.env.NODE_ENV !== "production";
  if (!okSession && !okLegacyKey && !okInDev) {
    redirect("/admin/login");
  }

  const [
    stageCounts,
    eligibilityCounts,
    insuranceCounts,
    safetyCounts,
    outreachCounts,
    actions,
    cursors,
    hot,
    sentEmails,
    outreachControl,
    healthToday,
    health7d,
    monitorEnabled,
    discoveryEnabled,
    outreachDraftEnabled,
    outreachSendEnabled,
    autoSendEnabled,
    smsOutreachEnabled,
    monitorDays,
    autoSendPersonas,
    outreachDailyCap,
  ] = await Promise.all([
    getMonitorStageCounts(),
    getEligibilityCounts(),
    getInsuranceRatingCounts(),
    getSafetyStatusCounts(),
    getOutreachStageCounts(),
    getRecentAgentActions(40),
    listAllCursors(),
    listHotProspects(10),
    listOutreachSentRows(50),
    getOutreachControl(),
    getOutreachHealth(1),
    getOutreachHealth(7),
    getFlag("monitorEnabled"),
    getFlag("discoveryEnabled"),
    getFlag("outreachDraftEnabled"),
    getFlag("outreachSendEnabled"),
    getFlag("autoSendEnabled"),
    getFlag("smsOutreachEnabled"),
    getConfigValue("monitorDays"),
    getConfigValue("autoSendPersonas"),
    getConfigValue("outreachDailyCap"),
  ]);

  const data = {
    stageCounts,
    eligibilityCounts,
    insuranceCounts,
    safetyCounts,
    outreachCounts,
    actions,
    cursors,
    hot,
    sentEmails,
    outreachControl,
    healthToday,
    health7d,
    flags: {
      monitorEnabled,
      discoveryEnabled,
      outreachDraftEnabled,
      outreachSendEnabled,
      autoSendEnabled,
      smsOutreachEnabled,
      monitorDays,
      autoSendPersonas,
      outreachDailyCap,
    },
    readiness: {
      database: !!process.env.DATABASE_URL,
      fmcsaSocrataToken: !!process.env.FMCSA_SOCRATA_TOKEN,
      fmcsaApiKey: !!process.env.FMCSA_API_KEY,
      cronSecret: !!process.env.CRON_SECRET,
      outreachSender:
        !!process.env.OUTREACH_EMAIL_FROM &&
        !!(process.env.RESEND_OUTREACH_API_KEY ?? process.env.RESEND_OUTREACH_API_Key),
      webhookSecret: !!process.env.RESEND_WEBHOOK_SECRET,
      anthropicOutreach: !!process.env.ANTHROPIC_API_KEY_OUTREACH,
    },
    // Legacy ?key= access: forwarded so the drill-down API calls stay authed.
    adminKey: okLegacyKey ? (key ?? null) : null,
    generatedAt: new Date().toISOString(),
  };

  return (
    <main className="min-h-screen bg-[#0a0a0b] p-6 text-white md:p-10">
      <div className="mb-6">
        <a
          href={okSession ? "/admin" : `/admin?key=${key ?? ""}`}
          className="text-[13px] text-white/55 hover:text-white"
        >
          ← Back to admin
        </a>
      </div>
      <AgentDashboard data={data} />
    </main>
  );
}

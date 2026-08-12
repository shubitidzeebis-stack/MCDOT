"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  buildBillOfSale,
  BOS_TEMPLATES,
  CLAUSE_LIBRARY,
  DELIVERABLE_CATALOG,
  deliverableLine,
  INSURANCE_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  type BillOfSaleData,
  type BosTemplateId,
  type DeliverableId,
  type ExtraClause,
  type InsuranceClauseId,
  type PaymentTermsId,
} from "@/lib/bos/bill-of-sale-pdf";
import { takeBosPrefill } from "@/lib/bos/prefill";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#ff8a1a]/50";
const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45";
const selectClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#ff8a1a]/50";
const optionClass = "bg-[#0a0a0b]";

type FormState = {
  template: BosTemplateId; // which of the three document designs to draw
  effectiveDate: string; // yyyy-mm-dd from <input type="date">
  sellerName: string;
  sellerAddress: string;
  coSellerName: string;
  buyerName: string;
  buyerAddress: string;
  companyName: string;
  companyDba: string;
  purchasePrice: string;
  companyAddress: string;
  companyPhone: string;
  companyEmail: string;
  mcNumber: string;
  usdotNumber: string;
  interestTransferred: string;

  // Payment
  paymentTerms: PaymentTermsId;
  stagedFirstAmount: string;
  stagedSecondAmount: string;

  // Insurance
  insuranceClause: InsuranceClauseId;
  insuranceAmount: string;
  insuranceMethod: string;
  insuranceDeadline: string;

  // Deliverables: which of the nine standard lines are on, plus the concrete
  // email/phone those two lines name, plus any extra lines typed by hand.
  deliverablesOn: Record<DeliverableId, boolean>;
  deliverableEmail: string;
  deliverablePhone: string;
  extraDeliverables: string; // one per line

  // Extra numbered sections (clause library picks + custom).
  extraClauses: ExtraClause[];

  wireBankName: string;
  wireAccountName: string;
  wireRoutingNumber: string;
  wireAccountNumber: string;
  fillableBuyerFields: boolean;
};

const ALL_DELIVERABLES_ON = Object.fromEntries(
  DELIVERABLE_CATALOG.map((item) => [item.id, item.defaultOn]),
) as Record<DeliverableId, boolean>;

// Saved-buyer directory (GET /api/admin/buyers). Full-admin only server-side:
// a non-admin session gets 403 and the whole buyer UI stays unmounted.
//
// Only `name` and `address` are ever written into the PDF — the rest is the
// owner's own contact scratchpad. Nothing resembling government-ID data is
// modelled here on purpose; see src/lib/db/buyers.ts.
type Buyer = {
  id: number;
  name: string;
  address: string | null;
  email: string | null;
  phone: string | null;
  notes: string | null;
};

// `id: null` = the "add a new buyer" draft; a number = editing that row.
type BuyerDraft = {
  id: number | null;
  name: string;
  address: string;
  email: string;
  phone: string;
  notes: string;
};

const EMPTY_BUYER_DRAFT: BuyerDraft = {
  id: null,
  name: "",
  address: "",
  email: "",
  phone: "",
  notes: "",
};

const EMPTY: FormState = {
  template: "masthead",
  effectiveDate: "",
  sellerName: "",
  sellerAddress: "",
  coSellerName: "",
  buyerName: "",
  buyerAddress: "",
  companyName: "",
  companyDba: "",
  purchasePrice: "",
  companyAddress: "",
  companyPhone: "",
  companyEmail: "",
  mcNumber: "",
  usdotNumber: "",
  interestTransferred: "100% Membership Interest",
  paymentTerms: "on_transfer",
  stagedFirstAmount: "",
  stagedSecondAmount: "",
  insuranceClause: "none",
  insuranceAmount: "",
  insuranceMethod: "Zelle",
  insuranceDeadline: "",
  deliverablesOn: ALL_DELIVERABLES_ON,
  deliverableEmail: "",
  deliverablePhone: "",
  extraDeliverables: "",
  extraClauses: [],
  wireBankName: "",
  wireAccountName: "",
  wireRoutingNumber: "",
  wireAccountNumber: "",
  fillableBuyerFields: true,
};

// yyyy-mm-dd for the date input's "Today" shortcut, in local time — toISOString
// would roll to the previous day for anyone west of UTC.
function todayIso(): string {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 10);
}

// "2026-06-19" → "19th day of June 2026" (contract-style wording)
function contractDate(iso: string): string | null {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return null;
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  const suffix =
    d % 100 >= 11 && d % 100 <= 13 ? "th" : ["th", "st", "nd", "rd"][d % 10] ?? "th";
  return `${d}${suffix} day of ${months[m - 1]} ${y}`;
}

// "14000" / "14,000" → "$14,000.00"; anything else passes through as typed.
function normalizePrice(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  const numeric = t.replace(/[$,\s]/g, "");
  if (/^\d+(\.\d{1,2})?$/.test(numeric)) {
    return Number(numeric).toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
    });
  }
  return t;
}

export function BillOfSalePanel() {
  const [form, setForm] = useState<FormState>(EMPTY);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [prefilledFrom, setPrefilledFrom] = useState<string | null>(null);
  const prevUrl = useRef<string | null>(null);

  // FMCSA lookup bar: MC/DOT → auto-fill the Company fieldset.
  const [lookupKind, setLookupKind] = useState<"mc" | "dot">("mc");
  const [lookupNumber, setLookupNumber] = useState("");
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  // Seller name recovered from a matching inbound lead, or null when this
  // carrier never came through the wizard. Drives the hint under the bar so
  // an empty Seller field reads as "we have no record" rather than a bug.
  const [sellerFromLead, setSellerFromLead] = useState<string | null>(null);
  const [sellerLookupRan, setSellerLookupRan] = useState(false);
  // Co-seller input is revealed on demand; most deals have a single seller.
  const [showCoSeller, setShowCoSeller] = useState(false);

  async function lookup() {
    if (!lookupNumber.trim() || lookupBusy) return;
    setLookupBusy(true);
    setLookupError(null);
    // Clear the previous carrier's result so a failed or slow lookup can
    // never leave the last carrier's seller hint on screen.
    setSellerLookupRan(false);
    setSellerFromLead(null);
    try {
      const res = await fetch("/api/admin/bos/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: lookupNumber, kind: lookupKind }),
      });
      const data = await res.json();
      if (!res.ok) {
        setLookupError(data.error ?? "Lookup failed.");
        return;
      }
      const c = data.company as {
        legalName: string;
        dbaName: string | null;
        dotNumber: string;
        mcNumbers: string[];
        address: string | null;
        telephone: string | null;
      };
      // FMCSA carries no person's name. This is filled only when the carrier
      // already came through our own valuation wizard, so it is often null —
      // that is expected, not a failure.
      const seller = (data.seller ?? null) as { name: string } | null;
      const mc = c.mcNumbers[0];
      setForm((f) => ({
        ...f,
        companyName: c.legalName || f.companyName,
        companyDba: c.dbaName ?? f.companyDba,
        usdotNumber: c.dotNumber || f.usdotNumber,
        mcNumber: mc
          ? mc.toUpperCase().startsWith("MC")
            ? mc
            : `MC-${mc}`
          : f.mcNumber,
        companyAddress: c.address ?? f.companyAddress,
        companyPhone: c.telephone ?? f.companyPhone,
        // Deliberately overwrite (not merge), for the same reason applyBuyer
        // does: a lookup switches the document to a different carrier, and
        // carrying the previous carrier's seller onto it would put the wrong
        // person's name on a document that transfers a company.
        sellerName: seller?.name ?? "",
      }));
      setSellerFromLead(seller ? seller.name : null);
      setSellerLookupRan(true);
      if (c.legalName) setPrefilledFrom(c.legalName);
    } catch {
      setLookupError("Lookup failed.");
    } finally {
      setLookupBusy(false);
    }
  }

  // ── Saved buyer directory ────────────────────────────────────────────
  // The ONLY server round-trip this page makes. Deal details (price, wire
  // info, seller, company) stay in the browser — the PDF is built client-side
  // — so nothing sensitive about a deal is ever posted back.
  //
  // `buyersEnabled` flips true only on a successful GET. A 403 (agent-role
  // session) therefore renders no dropdown and no management UI at all,
  // rather than dead controls.
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [buyersEnabled, setBuyersEnabled] = useState(false);
  const [selectedBuyerId, setSelectedBuyerId] = useState("");
  const [manageOpen, setManageOpen] = useState(false);
  const [buyerDraft, setBuyerDraft] = useState<BuyerDraft>(EMPTY_BUYER_DRAFT);
  const [buyerBusy, setBuyerBusy] = useState(false);
  const [buyerError, setBuyerError] = useState<string | null>(null);

  const loadBuyers = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/buyers");
      if (!res.ok) {
        // 403 = not a full admin; 401/5xx = no session or backend trouble.
        // Either way there is nothing useful to show, so hide the feature.
        setBuyersEnabled(false);
        setBuyers([]);
        return;
      }
      const data = (await res.json()) as { buyers?: Buyer[] };
      setBuyers(Array.isArray(data.buyers) ? data.buyers : []);
      setBuyersEnabled(true);
    } catch {
      setBuyersEnabled(false);
    }
  }, []);

  useEffect(() => {
    // Fired through an async wrapper so no state is set synchronously during
    // the effect — the list lands after the fetch resolves.
    void (async () => {
      await loadBuyers();
    })();
  }, [loadBuyers]);

  // Fill the two buyer fields from the directory. Both stay freely editable
  // afterwards — a one-off deal may need a variation (a different mailing
  // address, an entity name instead of a personal one).
  function applyBuyer(idValue: string) {
    setSelectedBuyerId(idValue);
    if (!idValue) return;
    const buyer = buyers.find((b) => String(b.id) === idValue);
    if (!buyer) return;
    setForm((f) => ({
      ...f,
      buyerName: buyer.name,
      // Deliberately overwrite (not merge) — carrying the previous buyer's
      // address onto a new buyer would be a serious document error.
      buyerAddress: buyer.address ?? "",
    }));
  }

  // Hand-editing either buyer field means the form no longer matches the
  // saved record, so drop the selection rather than imply it still does.
  const setParty = (key: "buyerName" | "buyerAddress") =>
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setSelectedBuyerId("");
      setForm((f) => ({ ...f, [key]: value }));
    };

  async function saveBuyer() {
    if (buyerBusy) return;
    if (!buyerDraft.name.trim()) {
      setBuyerError("Buyer name is required.");
      return;
    }
    setBuyerBusy(true);
    setBuyerError(null);
    try {
      const editing = buyerDraft.id !== null;
      const res = await fetch("/api/admin/buyers", {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(editing ? { id: buyerDraft.id } : {}),
          name: buyerDraft.name,
          address: buyerDraft.address,
          email: buyerDraft.email,
          phone: buyerDraft.phone,
          notes: buyerDraft.notes,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setBuyerError(data.error ?? "Could not save buyer.");
        return;
      }
      setBuyerDraft(EMPTY_BUYER_DRAFT);
      await loadBuyers();
    } catch {
      setBuyerError("Could not save buyer.");
    } finally {
      setBuyerBusy(false);
    }
  }

  async function removeBuyer(id: number) {
    if (buyerBusy) return;
    if (!confirm("Remove this buyer from the directory?")) return;
    setBuyerBusy(true);
    setBuyerError(null);
    try {
      const res = await fetch("/api/admin/buyers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setBuyerError(data.error ?? "Could not remove buyer.");
        return;
      }
      // Clear the dropdown selection but leave whatever is already typed in
      // the form alone — removing a directory entry must not blank a
      // document that is mid-draft.
      if (selectedBuyerId === String(id)) setSelectedBuyerId("");
      if (buyerDraft.id === id) setBuyerDraft(EMPTY_BUYER_DRAFT);
      await loadBuyers();
    } catch {
      setBuyerError("Could not remove buyer.");
    } finally {
      setBuyerBusy(false);
    }
  }

  // Arriving from a lead's "BoS" button: absorb the stashed lead details.
  useEffect(() => {
    const p = takeBosPrefill();
    if (!p) return;
    setForm((f) => ({
      ...f,
      companyName: p.companyName ?? f.companyName,
      companyDba: p.companyDba ?? f.companyDba,
      sellerName: p.sellerName ?? f.sellerName,
      mcNumber: p.mcNumber ?? f.mcNumber,
      usdotNumber: p.usdotNumber ?? f.usdotNumber,
      companyAddress: p.companyAddress ?? f.companyAddress,
      companyPhone: p.companyPhone ?? f.companyPhone,
    }));
    if (p.companyName) setPrefilledFrom(p.companyName);
  }, []);

  const set = (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));

  const pendingFields = useMemo(() => {
    const pending: string[] = [];
    if (!form.effectiveDate) pending.push("date");
    if (!form.sellerName.trim()) pending.push("seller name");
    if (!form.buyerName.trim()) pending.push("buyer name");
    if (!form.buyerAddress.trim()) pending.push("buyer address");
    if (!form.purchasePrice.trim()) pending.push("price");
    if (!form.companyAddress.trim()) pending.push("company address");
    if (!form.companyPhone.trim()) pending.push("company phone");
    if (!form.companyEmail.trim()) pending.push("company email");
    if (!form.mcNumber.trim()) pending.push("MC #");
    if (!form.usdotNumber.trim()) pending.push("USDOT #");
    if (
      !form.wireBankName.trim() ||
      !form.wireAccountName.trim() ||
      !form.wireRoutingNumber.trim() ||
      !form.wireAccountNumber.trim()
    )
      pending.push("wire info");
    return pending;
  }, [form]);

  const insuranceOption = useMemo(
    () => INSURANCE_OPTIONS.find((o) => o.id === form.insuranceClause) ?? INSURANCE_OPTIONS[0],
    [form.insuranceClause],
  );

  // Instalments that don't add up to the purchase price is the kind of error
  // that only surfaces when the buyer queries the second payment. Flag it here
  // rather than letting the document go out with contradictory figures.
  const stagedMismatch = useMemo(() => {
    if (form.paymentTerms !== "staged") return null;
    const money = (s: string) => {
      if (!s.trim()) return null;
      const n = Number(s.replace(/[$,\s]/g, ""));
      return Number.isFinite(n) ? n : null;
    };
    const first = money(form.stagedFirstAmount);
    const second = money(form.stagedSecondAmount);
    const total = money(form.purchasePrice);
    if (first == null || second == null || total == null) return null;
    if (Math.abs(first + second - total) < 0.005) return null;
    const fmt = (n: number) =>
      n.toLocaleString("en-US", { style: "currency", currency: "USD" });
    return { sum: fmt(first + second), price: fmt(total) };
  }, [form.paymentTerms, form.stagedFirstAmount, form.stagedSecondAmount, form.purchasePrice]);

  // `override` lets a control redraw with a value React hasn't committed yet —
  // the design picker switches template and rebuilds in the same click.
  const buildPdf = useCallback(
    async (override?: Partial<FormState>) => {
      const f = override ? { ...form, ...override } : form;
      setError(null);
      if (!f.companyName.trim()) {
        setError("Company legal name is required — it goes in the title and header.");
        return;
      }
      setBusy(true);
      try {
        // The nine standard lines in catalog order, minus any switched off,
        // with the email/phone entries naming the concrete address and number.
        // Hand-typed extras follow.
        const deliverables = [
          ...DELIVERABLE_CATALOG.filter((item) => f.deliverablesOn[item.id]).map((item) =>
            deliverableLine(
              item,
              item.specific === "email"
                ? f.deliverableEmail || f.companyEmail
                : item.specific === "phone"
                  ? f.deliverablePhone || f.companyPhone
                  : null,
            ),
          ),
          ...f.extraDeliverables
            .split("\n")
            .map((s) => s.trim())
            .filter(Boolean),
        ];
        const data: BillOfSaleData = {
          template: f.template,
          effectiveDate: contractDate(f.effectiveDate),
          sellerName: f.sellerName.trim() || null,
          sellerAddress: f.sellerAddress.trim() || null,
          coSellerName: f.coSellerName.trim() || null,
          buyerName: f.buyerName.trim() || null,
          buyerAddress: f.buyerAddress.trim() || null,
          companyName: f.companyName.trim(),
          companyDba: f.companyDba.trim() || null,
          purchasePrice: normalizePrice(f.purchasePrice) || null,
          companyAddress: f.companyAddress.trim() || null,
          companyPhone: f.companyPhone.trim() || null,
          companyEmail: f.companyEmail.trim() || null,
          mcNumber: f.mcNumber.trim() || null,
          usdotNumber: f.usdotNumber.trim() || null,
          interestTransferred: f.interestTransferred.trim() || null,
          paymentTerms: f.paymentTerms,
          stagedFirstAmount: normalizePrice(f.stagedFirstAmount) || null,
          stagedSecondAmount: normalizePrice(f.stagedSecondAmount) || null,
          insuranceClause: f.insuranceClause,
          insuranceAmount: normalizePrice(f.insuranceAmount) || null,
          insuranceMethod: f.insuranceMethod.trim() || null,
          insuranceDeadline: contractDate(f.insuranceDeadline) ?? f.insuranceDeadline.trim() ?? null,
          extraClauses: f.extraClauses.length ? f.extraClauses : null,
          // Always the real array, never null: an empty list means the operator
          // unticked everything on purpose and must not resurrect the defaults.
          deliverables,
          wireBankName: f.wireBankName.trim() || null,
          wireAccountName: f.wireAccountName.trim() || null,
          wireRoutingNumber: f.wireRoutingNumber.trim() || null,
          wireAccountNumber: f.wireAccountNumber.trim() || null,
          fillableBuyerFields: f.fillableBuyerFields,
        };
        const bytes = await buildBillOfSale(data);
        const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
        const url = URL.createObjectURL(blob);
        if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
        prevUrl.current = url;
        const draft = pendingFields.length > 0 ? " (DRAFT)" : "";
        setFileName(`${f.companyName.trim()} - Bill of Sale${draft}.pdf`);
        setPreviewUrl(url);
      } catch (err) {
        setError(err instanceof Error ? err.message : "PDF generation failed.");
      } finally {
        setBusy(false);
      }
    },
    [form, pendingFields],
  );

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    await buildPdf();
  }

  // Picking a design redraws an open preview immediately, so the picker and
  // the viewer never disagree about what is about to be sent.
  function chooseTemplate(template: BosTemplateId) {
    if (template === form.template) return;
    setForm((f) => ({ ...f, template }));
    if (previewUrl) void buildPdf({ template });
  }

  const chosen = BOS_TEMPLATES.find((t) => t.id === form.template) ?? BOS_TEMPLATES[0];

  return (
    <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={generate} className="space-y-8">
        <div>
          <p className={`${labelClass} mb-1.5`}>
            Look up by MC / DOT (fills the company fields, and the seller if
            they came through the wizard)
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={lookupKind}
              onChange={(e) => setLookupKind(e.target.value as "mc" | "dot")}
              className="rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#ff8a1a]/50"
            >
              <option value="mc" className="bg-[#0a0a0b]">MC</option>
              <option value="dot" className="bg-[#0a0a0b]">DOT</option>
            </select>
            <input
              value={lookupNumber}
              onChange={(e) => setLookupNumber(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  lookup();
                }
              }}
              placeholder="Enter MC or DOT number"
              className={`${inputClass} flex-1`}
            />
            <button
              type="button"
              onClick={lookup}
              disabled={lookupBusy || !lookupNumber.trim()}
              className="rounded-lg bg-white/[0.05] px-4 py-2 text-[13px] font-semibold text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08] disabled:opacity-50"
            >
              {lookupBusy ? "Looking up…" : "Look up & fill"}
            </button>
          </div>
          {lookupError && (
            <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300 ring-1 ring-red-500/20">
              {lookupError}
            </p>
          )}
          {/* FMCSA publishes no owner or officer name, so a blank Seller after
              a successful lookup is the normal outcome for a carrier that
              never filled in our wizard. Say so, rather than leaving the
              operator wondering whether the fill silently failed. */}
          {sellerLookupRan && !lookupError && (
            <p className="mt-2 text-[11px] text-white/35">
              {sellerFromLead ? (
                <>
                  Seller <b className="text-white/60">{sellerFromLead}</b> filled
                  from a matching lead in your records.
                </>
              ) : (
                <>
                  No matching lead, so Seller stays blank — FMCSA doesn&apos;t
                  publish owner names. Type it in, or open the generator from
                  the lead&apos;s BoS button.
                </>
              )}
            </p>
          )}
        </div>

        {prefilledFrom && (
          <p className="rounded-lg bg-[#1f5fa8]/15 px-3 py-2 text-[12px] text-blue-300 ring-1 ring-blue-400/20">
            Prefilled from: <b>{prefilledFrom}</b>. Review each field —
            FMCSA data can be stale — then add the deal specifics (price, date,
            buyer, wire info).
          </p>
        )}
        <fieldset>
          <legend className="mb-1 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
            Document design
          </legend>
          <p className="mb-3 text-[11px] text-white/35">
            Same wording in all three — only the presentation changes. Switch
            any time; the preview redraws.
          </p>
          <div className="grid gap-3 sm:grid-cols-3">
            {BOS_TEMPLATES.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                selected={form.template === t.id}
                onSelect={() => chooseTemplate(t.id)}
              />
            ))}
          </div>
        </fieldset>

        <Fieldset title="Deal">
          <Field label="Effective / closing date">
            <div className="flex gap-2">
              <input
                type="date"
                className={inputClass}
                value={form.effectiveDate}
                onChange={set("effectiveDate")}
              />
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, effectiveDate: todayIso() }))}
                className="shrink-0 rounded-lg bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white/75 ring-1 ring-white/10 hover:bg-white/[0.08]"
              >
                Today
              </button>
            </div>
          </Field>
          <Field label="Purchase price">
            <input
              className={inputClass}
              placeholder="$14,000.00"
              value={form.purchasePrice}
              onChange={set("purchasePrice")}
              onBlur={() =>
                setForm((f) => ({ ...f, purchasePrice: normalizePrice(f.purchasePrice) }))
              }
            />
          </Field>
          <Field label="Interest transferred">
            <input
              className={inputClass}
              value={form.interestTransferred}
              onChange={set("interestTransferred")}
            />
          </Field>

          <Field label="Payment terms" full>
            <select
              className={selectClass}
              value={form.paymentTerms}
              onChange={(e) =>
                setForm((f) => ({ ...f, paymentTerms: e.target.value as PaymentTermsId }))
              }
            >
              {PAYMENT_TERMS_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} className={optionClass}>
                  {o.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-white/35">
              {PAYMENT_TERMS_OPTIONS.find((o) => o.id === form.paymentTerms)?.hint}
            </p>
          </Field>

          {form.paymentTerms === "staged" && (
            <>
              <Field label="Initial payment">
                <input
                  className={inputClass}
                  placeholder="$3,750.00"
                  value={form.stagedFirstAmount}
                  onChange={set("stagedFirstAmount")}
                  onBlur={() =>
                    setForm((f) => ({
                      ...f,
                      stagedFirstAmount: normalizePrice(f.stagedFirstAmount),
                    }))
                  }
                />
              </Field>
              <Field label="Remaining balance">
                <input
                  className={inputClass}
                  placeholder="$3,750.00"
                  value={form.stagedSecondAmount}
                  onChange={set("stagedSecondAmount")}
                  onBlur={() =>
                    setForm((f) => ({
                      ...f,
                      stagedSecondAmount: normalizePrice(f.stagedSecondAmount),
                    }))
                  }
                />
              </Field>
              {stagedMismatch && (
                <p className="sm:col-span-2 rounded-lg bg-[#ff8a1a]/10 px-3 py-2 text-[12px] text-[#ffb371] ring-1 ring-[#ff8a1a]/20">
                  The two instalments add up to {stagedMismatch.sum}, but the purchase price is{" "}
                  {stagedMismatch.price}. Fix one of them before sending.
                </p>
              )}
            </>
          )}
        </Fieldset>

        <Fieldset title="Insurance">
          <Field label="Insurance clause" full>
            <select
              className={selectClass}
              value={form.insuranceClause}
              onChange={(e) =>
                setForm((f) => ({ ...f, insuranceClause: e.target.value as InsuranceClauseId }))
              }
            >
              {INSURANCE_OPTIONS.map((o) => (
                <option key={o.id} value={o.id} className={optionClass}>
                  {o.name}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-white/35">{insuranceOption.hint}</p>
          </Field>

          {insuranceOption.needs.includes("amount") && (
            <Field label="Amount">
              <input
                className={inputClass}
                placeholder="$3,000.00"
                value={form.insuranceAmount}
                onChange={set("insuranceAmount")}
                onBlur={() =>
                  setForm((f) => ({ ...f, insuranceAmount: normalizePrice(f.insuranceAmount) }))
                }
              />
            </Field>
          )}
          {insuranceOption.needs.includes("method") && (
            <Field label="Sent by">
              <select
                className={selectClass}
                value={form.insuranceMethod}
                onChange={(e) => setForm((f) => ({ ...f, insuranceMethod: e.target.value }))}
              >
                {["Zelle", "wire transfer", "Cash App", "Venmo", "cash"].map((m) => (
                  <option key={m} value={m} className={optionClass}>
                    {m}
                  </option>
                ))}
              </select>
            </Field>
          )}
          {insuranceOption.needs.includes("deadline") && (
            <Field label="Pay by">
              <input
                type="date"
                className={inputClass}
                value={form.insuranceDeadline}
                onChange={set("insuranceDeadline")}
              />
            </Field>
          )}
        </Fieldset>

        <Fieldset title="Company">
          <Field label="Legal name *">
            <input
              className={inputClass}
              placeholder="DUB TRUCKING LLC"
              value={form.companyName}
              onChange={set("companyName")}
              required
            />
          </Field>
          <Field label="DBA (optional)">
            <input className={inputClass} value={form.companyDba} onChange={set("companyDba")} />
          </Field>
          <Field label="Address" full>
            <input
              className={inputClass}
              value={form.companyAddress}
              onChange={set("companyAddress")}
            />
          </Field>
          <Field label="Phone">
            <input className={inputClass} value={form.companyPhone} onChange={set("companyPhone")} />
          </Field>
          <Field label="Email (transfers with the company)">
            <input
              className={inputClass}
              placeholder="dispatch@company.com"
              value={form.companyEmail}
              onChange={set("companyEmail")}
            />
          </Field>
          <Field label="MC Authority #">
            <input
              className={inputClass}
              placeholder="MC-1638115"
              value={form.mcNumber}
              onChange={set("mcNumber")}
            />
          </Field>
          <Field label="USDOT #">
            <input
              className={inputClass}
              placeholder="3979898"
              value={form.usdotNumber}
              onChange={set("usdotNumber")}
            />
          </Field>
        </Fieldset>

        <Fieldset title="Parties">
          {buyersEnabled && (
            <div className="sm:col-span-2">
              <label className={`${labelClass} mb-1.5 block`}>
                Saved buyer (fills the buyer fields)
              </label>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedBuyerId}
                  onChange={(e) => applyBuyer(e.target.value)}
                  className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#ff8a1a]/50"
                >
                  <option value="" className="bg-[#0a0a0b]">
                    {buyers.length ? "— Pick a saved buyer —" : "— No saved buyers yet —"}
                  </option>
                  {buyers.map((b) => (
                    <option key={b.id} value={String(b.id)} className="bg-[#0a0a0b]">
                      {b.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setManageOpen((o) => !o)}
                  className="rounded-lg bg-white/[0.05] px-4 py-2 text-[13px] font-semibold text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08]"
                >
                  {manageOpen ? "Hide buyers" : "Manage buyers"}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-white/35">
                Both buyer fields stay editable after picking — a one-off deal
                can use a variation without changing the saved record.
              </p>
            </div>
          )}

          <Field label="Seller name">
            <input className={inputClass} value={form.sellerName} onChange={set("sellerName")} />
          </Field>
          <Field label="Seller address">
            <input
              className={inputClass}
              value={form.sellerAddress}
              onChange={set("sellerAddress")}
            />
          </Field>

          {/* A partner on the LLC has to sign too. Adding one turns the
              signature block into three columns in every design. */}
          <div className="sm:col-span-2">
            {form.coSellerName || showCoSeller ? (
              <div>
                <label className={`${labelClass} mb-1.5 block`}>
                  Second seller (adds their own signature line)
                </label>
                <div className="flex gap-2">
                  <input
                    className={inputClass}
                    placeholder="Partner's full name"
                    value={form.coSellerName}
                    onChange={set("coSellerName")}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setForm((f) => ({ ...f, coSellerName: "" }));
                      setShowCoSeller(false);
                    }}
                    className="shrink-0 rounded-lg px-3 py-2 text-[12px] text-white/55 hover:text-white"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setShowCoSeller(true)}
                className="rounded-lg bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white/75 ring-1 ring-white/10 hover:bg-white/[0.08]"
              >
                + Add second seller
              </button>
            )}
          </div>

          <Field label="Buyer name">
            <input className={inputClass} value={form.buyerName} onChange={setParty("buyerName")} />
          </Field>
          <Field label="Buyer address" full>
            <input
              className={inputClass}
              value={form.buyerAddress}
              onChange={setParty("buyerAddress")}
            />
          </Field>

          {buyersEnabled && manageOpen && (
            <div className="sm:col-span-2 rounded-xl bg-white/[0.025] p-4 ring-1 ring-white/10">
              <p className={labelClass}>Buyer directory</p>
              <p className="mt-1.5 text-[11px] text-white/35">
                Only the name and address are printed on the Bill of Sale.
                Email, phone and notes are for your reference only — never
                store ID documents, licence numbers or dates of birth here.
              </p>

              {buyers.length > 0 && (
                <ul className="mt-3 divide-y divide-white/8 rounded-lg bg-white/[0.02] ring-1 ring-white/10">
                  {buyers.map((b) => (
                    <li
                      key={b.id}
                      className="flex items-start justify-between gap-3 px-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-medium text-white">
                          {b.name}
                        </p>
                        <p className="truncate text-[11px] text-white/45">
                          {b.address ?? "no address on file"}
                        </p>
                        {(b.email || b.phone) && (
                          <p className="truncate text-[10px] text-white/30">
                            {[b.email, b.phone].filter(Boolean).join(" · ")}
                          </p>
                        )}
                        {b.notes && (
                          <p className="truncate text-[10px] text-white/30">{b.notes}</p>
                        )}
                      </div>
                      <div className="flex shrink-0 gap-1 text-[11px]">
                        <button
                          type="button"
                          onClick={() =>
                            setBuyerDraft({
                              id: b.id,
                              name: b.name,
                              address: b.address ?? "",
                              email: b.email ?? "",
                              phone: b.phone ?? "",
                              notes: b.notes ?? "",
                            })
                          }
                          className="rounded-md px-2 py-1 text-white/60 hover:bg-white/[0.06] hover:text-white"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBuyer(b.id)}
                          disabled={buyerBusy}
                          className="rounded-md px-2 py-1 text-red-400/70 hover:bg-red-500/[0.08] hover:text-red-300 disabled:opacity-50"
                        >
                          Delete
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Plain <div>, not a nested <form> — this sits inside the
                  generator's form and nested forms are invalid HTML. Enter
                  is intercepted so it saves the buyer instead of submitting
                  the outer form and generating a PDF. */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <p className={`${labelClass} sm:col-span-2`}>
                  {buyerDraft.id === null ? "Add a buyer" : "Edit buyer"}
                </p>
                <BuyerInput
                  placeholder="Full name *"
                  value={buyerDraft.name}
                  onChange={(v) => setBuyerDraft((d) => ({ ...d, name: v }))}
                  onEnter={saveBuyer}
                />
                <BuyerInput
                  placeholder="Address"
                  value={buyerDraft.address}
                  onChange={(v) => setBuyerDraft((d) => ({ ...d, address: v }))}
                  onEnter={saveBuyer}
                />
                <BuyerInput
                  placeholder="Email (optional)"
                  value={buyerDraft.email}
                  onChange={(v) => setBuyerDraft((d) => ({ ...d, email: v }))}
                  onEnter={saveBuyer}
                />
                <BuyerInput
                  placeholder="Phone (optional)"
                  value={buyerDraft.phone}
                  onChange={(v) => setBuyerDraft((d) => ({ ...d, phone: v }))}
                  onEnter={saveBuyer}
                />
                <div className="sm:col-span-2">
                  <BuyerInput
                    placeholder="Notes (optional)"
                    value={buyerDraft.notes}
                    onChange={(v) => setBuyerDraft((d) => ({ ...d, notes: v }))}
                    onEnter={saveBuyer}
                  />
                </div>
              </div>

              {buyerError && (
                <p className="mt-2 rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300 ring-1 ring-red-500/20">
                  {buyerError}
                </p>
              )}

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={saveBuyer}
                  disabled={buyerBusy || !buyerDraft.name.trim()}
                  className="rounded-lg bg-[#ff8a1a]/15 px-4 py-2 text-[13px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25 hover:bg-[#ff8a1a]/25 disabled:opacity-50"
                >
                  {buyerBusy
                    ? "Saving…"
                    : buyerDraft.id === null
                      ? "Add buyer"
                      : "Save changes"}
                </button>
                {buyerDraft.id !== null && (
                  <button
                    type="button"
                    onClick={() => {
                      setBuyerDraft(EMPTY_BUYER_DRAFT);
                      setBuyerError(null);
                    }}
                    className="rounded-lg px-3 py-2 text-[12px] text-white/55 hover:text-white"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          )}
        </Fieldset>

        <Fieldset title="Seller's deliverables">
          <div className="sm:col-span-2">
            <p className="mb-3 text-[11px] text-white/35">
              Untick anything this seller keeps. The email and phone lines print
              the exact address and number, so the seller can see precisely what
              they are handing over.
            </p>
            <ul className="divide-y divide-white/8 rounded-xl bg-white/[0.02] ring-1 ring-white/10">
              {DELIVERABLE_CATALOG.map((item) => {
                const on = form.deliverablesOn[item.id];
                const specificValue =
                  item.specific === "email"
                    ? form.deliverableEmail || form.companyEmail
                    : item.specific === "phone"
                      ? form.deliverablePhone || form.companyPhone
                      : "";
                return (
                  <li key={item.id} className="px-3 py-2.5">
                    <label className="flex cursor-pointer items-start gap-2.5">
                      <input
                        type="checkbox"
                        checked={on}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            deliverablesOn: { ...f.deliverablesOn, [item.id]: e.target.checked },
                          }))
                        }
                        className="mt-0.5 h-4 w-4 shrink-0 accent-[#ff8a1a]"
                      />
                      <span className={`text-[12.5px] ${on ? "text-white/80" : "text-white/35 line-through"}`}>
                        {deliverableLine(item, specificValue)}
                      </span>
                    </label>
                    {on && item.specific && (
                      <div className="mt-2 pl-7">
                        <input
                          className={`${inputClass} text-[12px]`}
                          placeholder={
                            item.specific === "email"
                              ? "Exact email address being transferred"
                              : "Exact phone number being transferred"
                          }
                          value={
                            item.specific === "email"
                              ? form.deliverableEmail
                              : form.deliverablePhone
                          }
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              [item.specific === "email"
                                ? "deliverableEmail"
                                : "deliverablePhone"]: e.target.value,
                            }))
                          }
                        />
                        {!specificValue && (
                          <p className="mt-1 text-[11px] text-[#ffb371]">
                            Empty — this line will print the vague wording, which is
                            how a personal number ends up on a Bill of Sale.
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>

            <label className={`${labelClass} mb-1.5 mt-4 block`}>
              Extra deliverables (one per line)
            </label>
            <textarea
              className={`${inputClass} min-h-[70px] font-mono text-[12px] leading-5`}
              placeholder="Anything else this deal requires"
              value={form.extraDeliverables}
              onChange={set("extraDeliverables")}
            />
          </div>
        </Fieldset>

        <Fieldset title="Additional clauses">
          <div className="sm:col-span-2">
            <p className="mb-3 text-[11px] text-white/35">
              Each one becomes its own numbered section, inserted before Governing
              Law. Everything after it renumbers automatically. Read the wording in
              the preview before sending — it is a starting point, not legal advice.
            </p>
            <div className="grid gap-2 sm:grid-cols-2">
              {CLAUSE_LIBRARY.map((c) => {
                const on = form.extraClauses.some((x) => x.title === c.title);
                return (
                  <label
                    key={c.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-lg p-2.5 ring-1 transition ${
                      on
                        ? "bg-[#ff8a1a]/10 ring-[#ff8a1a]/30"
                        : "bg-white/[0.025] ring-white/10 hover:bg-white/[0.045]"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={on}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          extraClauses: e.target.checked
                            ? [...f.extraClauses, { title: c.title, body: c.body }]
                            : f.extraClauses.filter((x) => x.title !== c.title),
                        }))
                      }
                      className="mt-0.5 h-4 w-4 shrink-0 accent-[#ff8a1a]"
                    />
                    <span>
                      <span className="block text-[12.5px] font-medium text-white/85">
                        {c.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-[1.4] text-white/40">
                        {c.body.slice(0, 96)}…
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>

            {/* Custom clauses, listed so they can be edited or removed after
                adding — a one-off section usually needs a second pass. */}
            {form.extraClauses.filter((c) => !CLAUSE_LIBRARY.some((l) => l.title === c.title))
              .length > 0 && (
              <ul className="mt-3 space-y-2">
                {form.extraClauses.map((c, i) =>
                  CLAUSE_LIBRARY.some((l) => l.title === c.title) ? null : (
                    <li key={i} className="rounded-lg bg-white/[0.025] p-2.5 ring-1 ring-white/10">
                      <div className="flex items-center gap-2">
                        <input
                          className={`${inputClass} text-[12px] font-semibold`}
                          value={c.title}
                          placeholder="Clause title"
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              extraClauses: f.extraClauses.map((x, j) =>
                                j === i ? { ...x, title: e.target.value } : x,
                              ),
                            }))
                          }
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setForm((f) => ({
                              ...f,
                              extraClauses: f.extraClauses.filter((_, j) => j !== i),
                            }))
                          }
                          className="shrink-0 rounded-md px-2 py-1 text-[11px] text-red-400/70 hover:bg-red-500/[0.08] hover:text-red-300"
                        >
                          Remove
                        </button>
                      </div>
                      <textarea
                        className={`${inputClass} mt-2 min-h-[70px] text-[12px] leading-5`}
                        value={c.body}
                        placeholder="Clause text as it will appear in the document"
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            extraClauses: f.extraClauses.map((x, j) =>
                              j === i ? { ...x, body: e.target.value } : x,
                            ),
                          }))
                        }
                      />
                    </li>
                  ),
                )}
              </ul>
            )}

            <button
              type="button"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  extraClauses: [...f.extraClauses, { title: "", body: "" }],
                }))
              }
              className="mt-3 rounded-lg bg-white/[0.05] px-3 py-2 text-[12px] font-semibold text-white/75 ring-1 ring-white/10 hover:bg-white/[0.08]"
            >
              + Add custom clause
            </button>
          </div>
        </Fieldset>

        <Fieldset title="Wire transfer instructions (seller's account)">
          <Field label="Bank name">
            <input className={inputClass} value={form.wireBankName} onChange={set("wireBankName")} />
          </Field>
          <Field label="Account name">
            <input
              className={inputClass}
              value={form.wireAccountName}
              onChange={set("wireAccountName")}
            />
          </Field>
          <Field label="Routing number">
            <input
              className={inputClass}
              value={form.wireRoutingNumber}
              onChange={set("wireRoutingNumber")}
            />
          </Field>
          <Field label="Account number">
            <input
              className={inputClass}
              value={form.wireAccountNumber}
              onChange={set("wireAccountNumber")}
            />
          </Field>
        </Fieldset>

        <label className="flex items-center gap-2 text-[13px] text-white/70">
          <input
            type="checkbox"
            checked={form.fillableBuyerFields}
            onChange={(e) =>
              setForm((f) => ({ ...f, fillableBuyerFields: e.target.checked }))
            }
            className="h-4 w-4 accent-[#ff8a1a]"
          />
          Add fillable buyer signature + date fields (buyer can type-sign in any PDF reader)
        </label>

        {pendingFields.length > 0 && (
          <p className="rounded-lg bg-[#ff8a1a]/10 px-3 py-2 text-[12px] text-[#ffb371] ring-1 ring-[#ff8a1a]/20">
            Missing and will show as highlighted [PENDING] in the PDF:{" "}
            {pendingFields.join(", ")}. That&apos;s fine for a draft going out for review.
          </p>
        )}

        {error && (
          <p className="rounded-lg bg-red-500/10 px-3 py-2 text-[12px] text-red-300 ring-1 ring-red-500/20">
            {error}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={busy}
            className="rounded-lg bg-[#ff8a1a]/15 px-5 py-2.5 text-[13px] font-semibold text-[#ffb371] ring-1 ring-[#ff8a1a]/25 hover:bg-[#ff8a1a]/25 disabled:opacity-50"
          >
            {busy ? "Generating…" : `Generate ${chosen.name} PDF`}
          </button>
          {previewUrl && (
            <a
              href={previewUrl}
              download={fileName}
              className="rounded-lg bg-white/[0.05] px-5 py-2.5 text-[13px] font-semibold text-white/80 ring-1 ring-white/10 hover:bg-white/[0.08]"
            >
              Download “{fileName}”
            </a>
          )}
        </div>
      </form>

      <div className="min-h-[400px]">
        <div className="mb-3 flex items-baseline justify-between gap-3">
          <p className={labelClass}>Preview</p>
          <p className="text-[11px] text-white/40">
            Design: <span className="font-medium text-white/70">{chosen.name}</span>
          </p>
        </div>
        {previewUrl ? (
          <iframe
            title="Bill of Sale preview"
            src={previewUrl}
            className="h-[85vh] w-full rounded-xl bg-white ring-1 ring-white/10"
          />
        ) : (
          <div className="flex h-[400px] items-center justify-center rounded-xl bg-white/[0.025] text-[13px] text-white/35 ring-1 ring-white/10">
            Fill in what you have and hit Generate — the PDF renders here.
          </div>
        )}
      </div>
    </div>
  );
}

// One of the three document designs, with the notes that decide it: what the
// page reads as, when to send it, and what it costs you.
function TemplateCard({
  template,
  selected,
  onSelect,
}: {
  template: (typeof BOS_TEMPLATES)[number];
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <label className="group block cursor-pointer">
      <input
        type="radio"
        name="bosTemplate"
        value={template.id}
        checked={selected}
        onChange={onSelect}
        className="peer sr-only"
      />
      <div
        className={`h-full rounded-xl p-3.5 ring-1 transition peer-focus-visible:ring-2 peer-focus-visible:ring-[#ff8a1a] ${
          selected
            ? "bg-[#ff8a1a]/10 ring-[#ff8a1a]/40"
            : "bg-white/[0.025] ring-white/10 group-hover:bg-white/[0.045]"
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-[13px] font-semibold ${selected ? "text-white" : "text-white/75"}`}
          >
            {template.name}
          </span>
          <span
            aria-hidden
            className={`h-3.5 w-3.5 shrink-0 rounded-full ring-1 ${
              selected
                ? "bg-[#ff8a1a] ring-[#ff8a1a]"
                : "bg-transparent ring-white/25 group-hover:ring-white/40"
            }`}
          />
        </div>
        <p className="mt-1.5 text-[11px] leading-[1.45] text-white/45">{template.tagline}</p>
        <dl className="mt-3 space-y-1 border-t border-white/10 pt-2.5">
          <TemplateNote k="Reads as" v={template.readsAs} />
          <TemplateNote k="Best when" v={template.bestWhen} />
          <TemplateNote k="Watch for" v={template.watchFor} muted />
        </dl>
      </div>
    </label>
  );
}

function TemplateNote({ k, v, muted }: { k: string; v: string; muted?: boolean }) {
  return (
    <div className="flex gap-2">
      <dt className="w-[52px] shrink-0 pt-px text-[9px] font-semibold uppercase tracking-[0.12em] text-white/30">
        {k}
      </dt>
      <dd className={`text-[11px] leading-[1.4] ${muted ? "text-white/40" : "text-white/60"}`}>
        {v}
      </dd>
    </div>
  );
}

function Fieldset({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset>
      <legend className="mb-3 text-[11px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
        {title}
      </legend>
      <div className="grid gap-4 sm:grid-cols-2">{children}</div>
    </fieldset>
  );
}

// Buyer-directory text input. Lives inside the generator's <form>, so Enter
// would otherwise submit that form and generate a PDF — intercept it and
// save the buyer instead.
function BuyerInput({
  placeholder,
  value,
  onChange,
  onEnter,
}: {
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  onEnter: () => void;
}) {
  return (
    <input
      className={inputClass}
      placeholder={placeholder}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          onEnter();
        }
      }}
    />
  );
}

function Field({
  label,
  children,
  full,
}: {
  label: string;
  children: React.ReactNode;
  full?: boolean;
}) {
  return (
    <div className={full ? "sm:col-span-2" : undefined}>
      <label className={`${labelClass} mb-1.5 block`}>{label}</label>
      {children}
    </div>
  );
}

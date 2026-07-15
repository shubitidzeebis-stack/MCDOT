"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  buildBillOfSale,
  DEFAULT_DELIVERABLES,
  type BillOfSaleData,
} from "@/lib/bos/bill-of-sale-pdf";
import { takeBosPrefill } from "@/lib/bos/prefill";

const inputClass =
  "w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-[13px] text-white outline-none focus:border-[#ff8a1a]/50";
const labelClass =
  "text-[10px] font-semibold uppercase tracking-[0.2em] text-white/45";

type FormState = {
  effectiveDate: string; // yyyy-mm-dd from <input type="date">
  sellerName: string;
  buyerName: string;
  buyerAddress: string;
  companyName: string;
  companyDba: string;
  purchasePrice: string;
  companyAddress: string;
  companyPhone: string;
  mcNumber: string;
  usdotNumber: string;
  interestTransferred: string;
  deliverables: string;
  wireBankName: string;
  wireAccountName: string;
  wireRoutingNumber: string;
  wireAccountNumber: string;
  fillableBuyerFields: boolean;
};

const EMPTY: FormState = {
  effectiveDate: "",
  sellerName: "",
  buyerName: "",
  buyerAddress: "",
  companyName: "",
  companyDba: "",
  purchasePrice: "",
  companyAddress: "",
  companyPhone: "",
  mcNumber: "",
  usdotNumber: "",
  interestTransferred: "100% Membership Interest",
  deliverables: DEFAULT_DELIVERABLES.join("\n"),
  wireBankName: "",
  wireAccountName: "",
  wireRoutingNumber: "",
  wireAccountNumber: "",
  fillableBuyerFields: true,
};

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

  async function generate(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!form.companyName.trim()) {
      setError("Company legal name is required — it goes in the title and header.");
      return;
    }
    setBusy(true);
    try {
      const deliverables = form.deliverables
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
      const data: BillOfSaleData = {
        effectiveDate: contractDate(form.effectiveDate),
        sellerName: form.sellerName.trim() || null,
        buyerName: form.buyerName.trim() || null,
        buyerAddress: form.buyerAddress.trim() || null,
        companyName: form.companyName.trim(),
        companyDba: form.companyDba.trim() || null,
        purchasePrice: normalizePrice(form.purchasePrice) || null,
        companyAddress: form.companyAddress.trim() || null,
        companyPhone: form.companyPhone.trim() || null,
        mcNumber: form.mcNumber.trim() || null,
        usdotNumber: form.usdotNumber.trim() || null,
        interestTransferred: form.interestTransferred.trim() || null,
        deliverables: deliverables.length ? deliverables : null,
        wireBankName: form.wireBankName.trim() || null,
        wireAccountName: form.wireAccountName.trim() || null,
        wireRoutingNumber: form.wireRoutingNumber.trim() || null,
        wireAccountNumber: form.wireAccountNumber.trim() || null,
        fillableBuyerFields: form.fillableBuyerFields,
      };
      const bytes = await buildBillOfSale(data);
      const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      if (prevUrl.current) URL.revokeObjectURL(prevUrl.current);
      prevUrl.current = url;
      const draft = pendingFields.length > 0 ? " (DRAFT)" : "";
      setFileName(`${form.companyName.trim()} - Bill of Sale${draft}.pdf`);
      setPreviewUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF generation failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 grid gap-10 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <form onSubmit={generate} className="space-y-8">
        {prefilledFrom && (
          <p className="rounded-lg bg-[#1f5fa8]/15 px-3 py-2 text-[12px] text-blue-300 ring-1 ring-blue-400/20">
            Prefilled from lead: <b>{prefilledFrom}</b>. Review each field —
            FMCSA data can be stale — then add the deal specifics (price, date,
            buyer, wire info).
          </p>
        )}
        <Fieldset title="Deal">
          <Field label="Effective / closing date">
            <input
              type="date"
              className={inputClass}
              value={form.effectiveDate}
              onChange={set("effectiveDate")}
            />
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
          <Field label="Seller name">
            <input className={inputClass} value={form.sellerName} onChange={set("sellerName")} />
          </Field>
          <Field label="Buyer name">
            <input className={inputClass} value={form.buyerName} onChange={set("buyerName")} />
          </Field>
          <Field label="Buyer address" full>
            <input className={inputClass} value={form.buyerAddress} onChange={set("buyerAddress")} />
          </Field>
        </Fieldset>

        <Fieldset title="Seller's deliverables (one per line)">
          <div className="sm:col-span-2">
            <textarea
              className={`${inputClass} min-h-[170px] font-mono text-[12px] leading-5`}
              value={form.deliverables}
              onChange={set("deliverables")}
            />
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
            {busy ? "Generating…" : "Generate PDF"}
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
        <p className={`${labelClass} mb-3`}>Preview</p>
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

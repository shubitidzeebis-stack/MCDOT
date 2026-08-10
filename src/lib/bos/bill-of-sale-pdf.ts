// Bill of Sale (Membership Interest Purchase) PDF generator.
//
// Runs entirely in the browser via pdf-lib — deal details (names, price,
// wire/banking info) never leave the admin's machine.
//
// Three document designs share one content model; pick with `template`.
// See BOS_TEMPLATES for the picker copy shown in the admin UI.
//
//   masthead    ink band across the top, key figures in a strip beneath it
//   instrument  hairlines and whitespace only, reads as a legal instrument
//   termsheet   the whole deal in a summary card, clauses in a side-rail
//
// Any field left empty renders as a clearly flagged placeholder — e.g.
// [PRICE PENDING] — so a draft can go out for review before every figure
// is locked in.
//
// Palette and proportions follow groupveritor.com: near-black ink, the site
// orange as the single accent, Helvetica (the site sets Inter — matching it
// in the PDF would mean embedding the font with @pdf-lib/fontkit).

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";

export type BosTemplateId = "masthead" | "instrument" | "termsheet";

export type BillOfSaleData = {
  template?: BosTemplateId; // default "masthead"
  effectiveDate?: string | null; // e.g. "19th day of June 2026"
  sellerName?: string | null;
  buyerName?: string | null;
  buyerAddress?: string | null;
  companyName: string;
  companyDba?: string | null;
  purchasePrice?: string | null; // e.g. "$14,000.00"
  companyAddress?: string | null;
  companyPhone?: string | null;
  mcNumber?: string | null;
  usdotNumber?: string | null;
  interestTransferred?: string | null; // default "100% Membership Interest"
  deliverables?: string[] | null; // null = standard checklist
  wireBankName?: string | null;
  wireAccountName?: string | null;
  wireRoutingNumber?: string | null;
  wireAccountNumber?: string | null;
  fillableBuyerFields?: boolean; // add AcroForm signature/date fields for the buyer
};

// Picker copy. Lives here so the document and the UI that describes it can
// never drift apart.
export const BOS_TEMPLATES: {
  id: BosTemplateId;
  name: string;
  tagline: string;
  readsAs: string;
  bestWhen: string;
  watchFor: string;
}[] = [
  {
    id: "masthead",
    name: "Masthead",
    tagline: "Ink band across the top, then the four figures that matter.",
    readsAs: "Confident, branded, modern",
    bestWhen: "The buyer already knows you",
    watchFor: "Costs toner; faxes as a black block",
  },
  {
    id: "instrument",
    name: "Instrument",
    tagline: "Hairlines and whitespace only — no fills anywhere.",
    readsAs: "Formal, restrained, lawyerly",
    bestWhen: "A cautious buyer is wiring money",
    watchFor: "Least visual link to the website",
  },
  {
    id: "termsheet",
    name: "Term Sheet",
    tagline: "Opens with the whole deal in one summary card.",
    readsAs: "Clear, transactional, current",
    bestWhen: "Price and terms drive the decision",
    watchFor: "Narrower text column per line",
  },
];

export const DEFAULT_DELIVERABLES = [
  "MC Certificate",
  "FMCSA Portal login credentials and DOT PIN",
  "Insurance Certificate and Certificate of Insurance (COI)",
  "Company primary email address access (transferred to Buyer)",
  "Company primary phone number (transferred to Buyer)",
  "Amazon Relay account access (if applicable)",
  "Loss Runs",
  "All driver files and electronic logging device (ELD) records",
  "Such other documents as Buyer may reasonably request",
];

// --- palette -------------------------------------------------------------
// INK is the site's #0a0a0b lifted a touch so it doesn't crush on cheap
// laser printers. FLARE is the site orange and is only ever used on dark
// ground; on white it deepens to FLARE_INK, which still reads as the same
// colour family but holds contrast at 7pt and survives a grayscale copy.
const INK = rgb(0x0e / 255, 0x0f / 255, 0x11 / 255);
const SHADE = rgb(0xf4 / 255, 0xf4 / 255, 0xf2 / 255);
const RULE = rgb(0xdc / 255, 0xdb / 255, 0xd8 / 255);
const HAIR = rgb(0xeb / 255, 0xea / 255, 0xe7 / 255);
const MUTE = rgb(0x6c / 255, 0x6d / 255, 0x71 / 255);
const FLARE = rgb(0xff / 255, 0x8a / 255, 0x1a / 255);
const FLARE_INK = rgb(0xc2 / 255, 0x5e / 255, 0x00 / 255);
const FLAG_BG = rgb(0xfd / 255, 0xf3 / 255, 0xe6 / 255);
const FLAG_INK = rgb(0x92 / 255, 0x48 / 255, 0x0a / 255);
const WHITE = rgb(1, 1, 1);

// --- page ----------------------------------------------------------------
const PAGE_W = 612; // letter
const PAGE_H = 792;
const MARGIN = 0.72 * 72; // 51.84
const WIDE_MARGIN = 1.06 * 72; // 76.32 — the Instrument's narrower measure
const BOTTOM_LIMIT = 0.75 * 72; // reserved for the footer
const CONTENT_W = PAGE_W - 2 * MARGIN;

const BODY = 10;
const BODY_LEAD = 14.5;

type Seg = {
  text: string;
  bold?: boolean;
  oblique?: boolean;
  color?: RGB;
  underline?: RGB; // draws a rule under the run, in this colour
  // Butt this segment against the previous one with no space between them.
  // Needed for trailing punctuation that follows a differently-styled run —
  // without it the word-splitter would render "June 2026 , by and between".
  glue?: boolean;
};
type Fonts = { regular: PDFFont; bold: PDFFont; boldOblique: PDFFont };

function isPending(v: string | null | undefined): v is null | undefined {
  return v == null || v.trim() === "";
}

function segFont(fonts: Fonts, seg: Seg): PDFFont {
  if (seg.bold && seg.oblique) return fonts.boldOblique;
  if (seg.bold) return fonts.bold;
  return fonts.regular;
}

// Greedy word-wrap over mixed-style segments. Returns lines of segments.
function wrapSegs(fonts: Fonts, segs: Seg[], size: number, maxWidth: number): Seg[][] {
  type Word = Seg & { w: number };
  const words: Word[] = [];
  for (const seg of segs) {
    const font = segFont(fonts, seg);
    let first = true;
    for (const raw of seg.text.split(/\s+/)) {
      if (!raw) continue;
      // Only the segment's opening word glues to what precedes it; the rest
      // are ordinary space-separated words.
      words.push({ ...seg, glue: first && seg.glue, text: raw, w: font.widthOfTextAtSize(raw, size) });
      first = false;
    }
  }
  const space = fonts.regular.widthOfTextAtSize(" ", size);
  const lines: Seg[][] = [];
  let line: Word[] = [];
  let lineW = 0;
  for (const word of words) {
    const extra = (line.length && !word.glue ? space : 0) + word.w;
    if (line.length && lineW + extra > maxWidth) {
      lines.push(line);
      line = [word];
      lineW = word.w;
    } else {
      line.push(word);
      lineW += extra;
    }
  }
  if (line.length) lines.push(line);
  return lines.length ? lines : [[]];
}

class Layout {
  doc: PDFDocument;
  fonts: Fonts;
  page!: PDFPage;
  y = 0; // cursor measured from the TOP of the page
  margin = MARGIN;

  constructor(doc: PDFDocument, fonts: Fonts) {
    this.doc = doc;
    this.fonts = fonts;
    this.newPage(0);
  }

  get contentW() {
    return PAGE_W - 2 * this.margin;
  }

  newPage(topMargin = this.margin) {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = topMargin;
  }

  ensure(height: number) {
    if (this.y + height > PAGE_H - BOTTOM_LIMIT) this.newPage();
  }

  gap(h: number) {
    this.y += h;
  }

  // --- text -----------------------------------------------------------

  measureParagraph(segs: Seg[], size: number, leading: number, maxWidth: number): number {
    return wrapSegs(this.fonts, segs, size, maxWidth).length * leading;
  }

  // Draws at the given top y and returns the height used.
  drawParagraphAt(
    x: number,
    top: number,
    segs: Seg[],
    size: number,
    leading: number,
    maxWidth: number,
    align: "left" | "center" | "right" = "left",
  ): number {
    const lines = wrapSegs(this.fonts, segs, size, maxWidth);
    const space = this.fonts.regular.widthOfTextAtSize(" ", size);
    let lineTop = top;
    for (const line of lines) {
      let lineW = 0;
      for (let i = 0; i < line.length; i++) {
        lineW += segFont(this.fonts, line[i]).widthOfTextAtSize(line[i].text, size);
        if (i > 0 && !line[i].glue) lineW += space;
      }
      let cx = x;
      if (align === "center") cx = x + (maxWidth - lineW) / 2;
      else if (align === "right") cx = x + (maxWidth - lineW);
      const baseline = PAGE_H - lineTop - size * 0.85;
      for (let i = 0; i < line.length; i++) {
        const seg = line[i];
        const font = segFont(this.fonts, seg);
        const w = font.widthOfTextAtSize(seg.text, size);
        if (i > 0 && !seg.glue) cx += space;
        this.page.drawText(seg.text, {
          x: cx,
          y: baseline,
          size,
          font,
          color: seg.color ?? INK,
        });
        if (seg.underline) {
          // A filled rule rather than drawLine: fill colour is unambiguous at
          // hairline weights, where a stroked line can read as near-black.
          this.page.drawRectangle({
            x: cx,
            y: baseline - size * 0.21,
            width: w,
            height: 1.3,
            color: seg.underline,
          });
        }
        cx += w;
      }
      lineTop += leading;
    }
    return lines.length * leading;
  }

  paragraph(
    segs: Seg[],
    size: number,
    leading: number,
    opts: {
      x?: number;
      maxWidth?: number;
      align?: "left" | "center" | "right";
      spaceBefore?: number;
      spaceAfter?: number;
    } = {},
  ) {
    const {
      x = this.margin,
      maxWidth = this.contentW,
      align = "left",
      spaceBefore = 0,
      spaceAfter = 0,
    } = opts;
    const h = this.measureParagraph(segs, size, leading, maxWidth) + spaceBefore + spaceAfter;
    this.ensure(h);
    this.y += spaceBefore;
    this.y += this.drawParagraphAt(x, this.y, segs, size, leading, maxWidth, align);
    this.y += spaceAfter;
  }

  // --- tracked (letter-spaced) text ------------------------------------
  // pdf-lib has no character-spacing option, so the wide uppercase labels
  // that carry the site's look are drawn a glyph at a time.

  trackedWidth(text: string, size: number, font: PDFFont, tracking: number): number {
    if (!text.length) return 0;
    return font.widthOfTextAtSize(text, size) + tracking * (text.length - 1);
  }

  drawTracked(
    x: number,
    top: number,
    text: string,
    size: number,
    font: PDFFont,
    color: RGB,
    tracking: number,
  ): number {
    const baseline = PAGE_H - top - size * 0.85;
    let cx = x;
    for (const ch of text) {
      if (ch !== " ") {
        this.page.drawText(ch, { x: cx, y: baseline, size, font, color });
      }
      cx += font.widthOfTextAtSize(ch, size) + tracking;
    }
    return cx - x - tracking;
  }

  // Small uppercase label — the site's signature device.
  label(x: number, top: number, text: string, size = 6.6, color = MUTE, tracking = 1.3) {
    return this.drawTracked(x, top, text.toUpperCase(), size, this.fonts.bold, color, tracking);
  }

  // --- primitives -----------------------------------------------------

  rect(x: number, top: number, w: number, h: number, color: RGB) {
    this.page.drawRectangle({ x, y: PAGE_H - top - h, width: w, height: h, color });
  }

  box(
    x: number,
    top: number,
    w: number,
    h: number,
    opts: { fill?: RGB; border?: RGB; borderWidth?: number; dash?: number[] } = {},
  ) {
    this.page.drawRectangle({
      x,
      y: PAGE_H - top - h,
      width: w,
      height: h,
      color: opts.fill,
      borderColor: opts.border,
      borderWidth: opts.borderWidth ?? (opts.border ? 0.75 : 0),
      borderDashArray: opts.dash,
    });
  }

  lineH(x1: number, x2: number, top: number, thickness: number, color: RGB) {
    this.page.drawLine({
      start: { x: x1, y: PAGE_H - top },
      end: { x: x2, y: PAGE_H - top },
      thickness,
      color,
    });
  }

  lineV(x: number, top: number, h: number, thickness: number, color: RGB) {
    this.page.drawLine({
      start: { x, y: PAGE_H - top },
      end: { x, y: PAGE_H - top - h },
      thickness,
      color,
    });
  }
}

// --- shared content ------------------------------------------------------

type Doc = {
  d: BillOfSaleData;
  companyFull: string;
  interest: string;
  effective: string;
  price: string;
  priceIsPending: boolean;
  deliverables: string[];
  anyPending: boolean;
};

const PENDING_LABEL = "PENDING - TO BE CONFIRMED";

function prepare(d: BillOfSaleData): Doc {
  const dba = !isPending(d.companyDba) ? ` (DBA ${d.companyDba})` : "";
  const fields = [
    d.effectiveDate,
    d.sellerName,
    d.buyerName,
    d.buyerAddress,
    d.purchasePrice,
    d.companyAddress,
    d.companyPhone,
    d.mcNumber,
    d.usdotNumber,
    d.wireBankName,
    d.wireAccountName,
    d.wireRoutingNumber,
    d.wireAccountNumber,
  ];
  return {
    d,
    companyFull: `${d.companyName}${dba}`,
    interest: !isPending(d.interestTransferred)
      ? d.interestTransferred!
      : "100% Membership Interest",
    effective: !isPending(d.effectiveDate) ? d.effectiveDate! : "[DATE PENDING]",
    price: !isPending(d.purchasePrice) ? d.purchasePrice! : "[PRICE PENDING]",
    priceIsPending: isPending(d.purchasePrice),
    deliverables: d.deliverables?.length ? d.deliverables : DEFAULT_DELIVERABLES,
    anyPending: fields.some(isPending),
  };
}

type InfoRow = { label: string; value: string | null | undefined; placeholder?: string };

function companyRows(doc: Doc): InfoRow[] {
  return [
    { label: "Legal Name", value: doc.companyFull },
    { label: "Address", value: doc.d.companyAddress },
    { label: "Phone", value: doc.d.companyPhone },
    { label: "MC Authority #", value: doc.d.mcNumber },
    { label: "USDOT #", value: doc.d.usdotNumber },
    { label: "Interest Transferred", value: doc.interest },
  ];
}

function buyerRows(doc: Doc): InfoRow[] {
  return [
    { label: "Legal Name", value: doc.d.buyerName },
    { label: "Address", value: doc.d.buyerAddress },
  ];
}

function wireRows(doc: Doc): InfoRow[] {
  return [
    { label: "Bank Name", value: doc.d.wireBankName },
    { label: "Account Name", value: doc.d.wireAccountName },
    { label: "Routing Number", value: doc.d.wireRoutingNumber },
    { label: "Account Number", value: doc.d.wireAccountNumber },
  ];
}

const CLAUSE = {
  sale: (interest: string): Seg[] => [
    { text: "Seller hereby sells, transfers, assigns, and conveys to Buyer" },
    { text: interest, bold: true },
    { text: "in the Company, representing all outstanding membership interest of the Company." },
  ],
  payment: (price: string, pending: boolean): Seg[] => [
    { text: "The full purchase price of" },
    { text: price, bold: true, oblique: pending, color: pending ? FLAG_INK : undefined },
    {
      text:
        "shall be paid by Buyer to Seller after all Company documents have been delivered and " +
        "all Company access (including but not limited to FMCSA portal, MC authority, email, " +
        "phone number, and any other relevant accounts) has been transferred to and confirmed " +
        "received by Buyer.",
    },
  ],
  liabilityA: (): Seg[] => [
    {
      text:
        "Seller warrants that at Closing, the Company shall be free and clear of all debts, " +
        "taxes, tolls, tickets, penalties, violations, loans, insurance balances, and other liabilities.",
    },
  ],
  liabilityB: (): Seg[] => [
    {
      text:
        "All payments, debts, obligations, fines, taxes, tolls, tickets, insurance balances, " +
        "and any other financial liabilities incurred or arising before the date of Closing are " +
        "solely the responsibility of the Seller (previous owner). Buyer assumes no liability " +
        "for any such obligations that predate the Closing date.",
      bold: true,
    },
  ],
  law: (): Seg[] => [
    {
      text:
        "This Bill of Sale shall be governed by and construed in accordance with the applicable " +
        "laws of the State in which the Company operates.",
    },
  ],
  signIntro: (): Seg[] => [
    { text: "By signing below, the parties agree to the terms and conditions set forth in this Bill of Sale." },
  ],
  deliverablesIntro: (): Seg[] => [
    { text: "As part of this sale, Seller shall deliver the following to Buyer:" },
  ],
};

// A pending value renders as a flagged chip rather than blank space.
function pendingChip(L: Layout, x: number, top: number, text: string, size = 6.6): number {
  const tracking = 0.9;
  const w = L.trackedWidth(text.toUpperCase(), size, L.fonts.bold, tracking) + 11;
  const h = size + 7;
  L.box(x, top - 3.5, w, h, {
    fill: FLAG_BG,
    border: FLAG_INK,
    borderWidth: 0.6,
    dash: [1.6, 1.4],
  });
  L.drawTracked(x + 5.5, top, text.toUpperCase(), size, L.fonts.bold, FLAG_INK, tracking);
  return w;
}

function valueSegs(row: InfoRow): { segs: Seg[]; pending: boolean; chip: string } {
  if (isPending(row.value)) {
    const chip = row.placeholder ?? PENDING_LABEL;
    return {
      segs: [{ text: `[${chip}]`, bold: true, oblique: true, color: FLAG_INK }],
      pending: true,
      chip,
    };
  }
  return { segs: [{ text: row.value }], pending: false, chip: "" };
}

// --- footer ---------------------------------------------------------------

function drawFooters(doc: PDFDocument, fonts: Fonts, prepared: Doc) {
  const pages = doc.getPages();
  const total = pages.length;
  pages.forEach((page, i) => {
    page.drawLine({
      start: { x: MARGIN, y: 0.55 * 72 },
      end: { x: PAGE_W - MARGIN, y: 0.55 * 72 },
      thickness: 0.6,
      color: RULE,
    });
    const fy = 0.38 * 72;
    page.drawText(`Bill of Sale - ${prepared.d.companyName}`, {
      x: MARGIN,
      y: fy,
      size: 7.5,
      font: fonts.regular,
      color: MUTE,
    });
    // Only claim "draft" while something is still unconfirmed — a finished
    // document that calls itself a draft undermines the signature block.
    const center = prepared.anyPending ? "Confidential - draft for review" : "Confidential";
    const cw = fonts.regular.widthOfTextAtSize(center, 7.5);
    page.drawText(center, { x: (PAGE_W - cw) / 2, y: fy, size: 7.5, font: fonts.regular, color: MUTE });
    const pn = `Page ${i + 1} of ${total}`;
    const pw = fonts.regular.widthOfTextAtSize(pn, 7.5);
    page.drawText(pn, { x: PAGE_W - MARGIN - pw, y: fy, size: 7.5, font: fonts.regular, color: MUTE });
  });
}

// --- fillable buyer fields ------------------------------------------------

function addBuyerSignatureField(L: Layout, x: number, lineTop: number, width: number) {
  const sig = L.doc.getForm().createTextField("buyer_signature");
  sig.addToPage(L.page, {
    x,
    // Sits in the open space above the rule. Kept short enough that the
    // viewer's field highlight never reaches up into the BUYER label.
    y: PAGE_H - lineTop + 2,
    width,
    height: 20,
    borderWidth: 0,
  });
  sig.setFontSize(12);
}

function addBuyerDateField(L: Layout, x: number, top: number) {
  const field = L.doc.getForm().createTextField("buyer_date");
  field.addToPage(L.page, {
    x,
    y: PAGE_H - top - 12,
    width: 100,
    height: 12,
    borderWidth: 0,
  });
  field.setFontSize(9.5);
}

// =========================================================================
// TEMPLATE 1 — MASTHEAD
// =========================================================================

const A_GUTTER = 25.5; // clause-number column
const A_SEC_GAP = 11.5;

function aSectionHeader(L: Layout, num: string, title: string) {
  const top = L.y;
  L.drawTracked(L.margin, top + 1, num, 11.5, L.fonts.bold, FLARE_INK, 0);
  L.drawTracked(L.margin + A_GUTTER, top + 1.5, title.toUpperCase(), 9.3, L.fonts.bold, INK, 1.2);
  L.rect(L.margin + A_GUTTER, top + 15, 14.5, 1.5, FLARE);
  L.y = top + 21;
}

function aInfoTable(L: Layout, rows: InfoRow[]) {
  const x = L.margin + A_GUTTER;
  const w = L.contentW - A_GUTTER;
  const labelW = 92;
  for (const row of rows) {
    const { segs, pending, chip } = valueSegs(row);
    const lines = pending ? 1 : wrapSegs(L.fonts, segs, 9.5, w - labelW).length;
    const rowH = lines * 12.5 + 8;
    L.ensure(rowH);
    const top = L.y;
    L.drawParagraphAt(x, top + 3, [{ text: row.label, color: MUTE }], 9, 12.5, labelW);
    if (pending) pendingChip(L, x + labelW, top + 4, chip);
    else L.drawParagraphAt(x + labelW, top + 3, segs, 9.5, 12.5, w - labelW);
    L.y = top + rowH;
    L.lineH(x, x + w, L.y, 0.6, HAIR);
  }
}

function renderMasthead(L: Layout, doc: Doc) {
  const d = doc.d;

  // Masthead band — full bleed, page 1 only.
  const bandH = 63;
  L.rect(0, 0, PAGE_W, bandH, INK);
  L.drawTracked(MARGIN, 21, "BILL OF SALE", 22, L.fonts.bold, WHITE, 2.2);
  L.drawParagraphAt(MARGIN, 47, [{ text: "Membership Interest Purchase Agreement", color: rgb(1, 1, 1) }], 9, 11, 300);
  // Document reference, right-aligned in the band.
  const refs: [string, boolean][] = [
    [!isPending(d.mcNumber) ? d.mcNumber! : "MC PENDING", true],
    [!isPending(d.usdotNumber) ? `USDOT ${d.usdotNumber}` : "USDOT PENDING", false],
  ];
  let refTop = 21;
  for (const [text, strong] of refs) {
    const font = strong ? L.fonts.bold : L.fonts.regular;
    const size = strong ? 8.5 : 7.5;
    const w = L.trackedWidth(text.toUpperCase(), size, font, 0.5);
    L.drawTracked(PAGE_W - MARGIN - w, refTop, text.toUpperCase(), size, font, strong ? WHITE : rgb(0.72, 0.72, 0.74), 0.5);
    refTop += 12;
  }
  L.rect(0, bandH, PAGE_W, 2.25, FLARE);
  L.y = bandH + 2.25;

  // Entity
  L.gap(12);
  L.y += L.drawParagraphAt(MARGIN, L.y, [{ text: d.companyName.toUpperCase(), bold: true }], 13, 16, CONTENT_W);
  const sub = !isPending(d.companyDba)
    ? `DBA ${d.companyDba} - a limited liability company`
    : "a limited liability company";
  L.y += L.drawParagraphAt(MARGIN, L.y + 1, [{ text: sub, color: MUTE }], 8.6, 11, CONTENT_W) + 1;

  // Key-figures strip — what a stranger needs before reading a word.
  L.gap(10);
  const keys: { k: string; v: string; accent?: boolean; pending?: boolean }[] = [
    { k: "Effective date", v: doc.effective, pending: isPending(d.effectiveDate) },
    { k: "Purchase price", v: doc.price, accent: true, pending: doc.priceIsPending },
    { k: "Interest sold", v: doc.interest },
    { k: "Authority", v: !isPending(d.mcNumber) ? d.mcNumber! : "[MC PENDING]", pending: isPending(d.mcNumber) },
  ];
  const keyTop = L.y;
  const colW = CONTENT_W / keys.length;
  const innerW = (i: number) => colW - (i ? 9 : 0) - 6;
  // A long value (a spelled-out interest, a wordy date) wraps, so the strip
  // is sized from the tallest cell rather than assumed to be one line.
  const keyLines = Math.max(
    ...keys.map((key, i) => wrapSegs(L.fonts, [{ text: key.v, bold: true }], 10.5, innerW(i)).length),
  );
  const stripH = 18 + keyLines * 12.5 + 4;
  L.lineH(MARGIN, PAGE_W - MARGIN, keyTop, 1.1, INK);
  keys.forEach((key, i) => {
    const x = MARGIN + i * colW + (i ? 9 : 0);
    if (i) L.lineV(MARGIN + i * colW, keyTop + 4, stripH - 8, 0.6, HAIR);
    L.label(x, keyTop + 8, key.k, 6.3, MUTE, 1.25);
    L.drawParagraphAt(
      x,
      keyTop + 18,
      [
        {
          text: key.v,
          bold: true,
          oblique: key.pending,
          color: key.pending ? FLAG_INK : key.accent ? FLARE_INK : INK,
        },
      ],
      10.5,
      12.5,
      innerW(i),
    );
  });
  L.y = keyTop + stripH;
  L.lineH(MARGIN, PAGE_W - MARGIN, L.y, 0.6, RULE);

  // Preamble + parties
  L.gap(12);
  L.paragraph(
    [{ text: `This Bill of Sale ("Bill of Sale") is entered into as of the ${doc.effective}, by and between:` }],
    BODY,
    BODY_LEAD,
  );
  L.gap(8);

  const partyLabelW = 72;
  const parties: [string, string | null | undefined][] = [
    ["SELLER", d.sellerName],
    ["BUYER", d.buyerName],
    ["COMPANY", doc.companyFull],
  ];
  L.lineH(MARGIN, PAGE_W - MARGIN, L.y, 0.6, RULE);
  parties.forEach(([role, name], i) => {
    const isCompany = i === 2;
    const pending = isPending(name);
    const segs: Seg[] = pending
      ? [{ text: `[${role} NAME PENDING]`, bold: true, oblique: true, color: FLAG_INK }]
      : [
          { text: `${name},`, bold: true },
          {
            text: isCompany
              ? 'a limited liability company ("Company")'
              : `an individual ("${role[0]}${role.slice(1).toLowerCase()}")`,
            color: MUTE,
          },
        ];
    const h = Math.max(L.measureParagraph(segs, 9.5, 13, CONTENT_W - partyLabelW), 13) + 7;
    L.ensure(h);
    const top = L.y;
    L.label(MARGIN, top + 4.5, role, 6.4, FLARE_INK, 1.3);
    L.drawParagraphAt(MARGIN + partyLabelW, top + 3.5, segs, 9.5, 13, CONTENT_W - partyLabelW);
    L.y = top + h;
    L.lineH(MARGIN, PAGE_W - MARGIN, L.y, 0.6, i === 2 ? RULE : HAIR);
  });

  const bodyW = CONTENT_W - A_GUTTER;
  const bodyX = MARGIN + A_GUTTER;

  // 1 — Sale of Membership Interest
  const s1 = CLAUSE.sale(doc.interest);
  L.gap(A_SEC_GAP);
  L.ensure(21 + L.measureParagraph(s1, BODY, BODY_LEAD, bodyW));
  aSectionHeader(L, "1", "Sale of Membership Interest");
  L.y += L.drawParagraphAt(bodyX, L.y, s1, BODY, BODY_LEAD, bodyW);

  // 2 — Purchase Price
  L.gap(A_SEC_GAP);
  L.ensure(21 + 40);
  aSectionHeader(L, "2", "Purchase Price");
  {
    const top = L.y;
    const w = bodyW;
    L.label(bodyX, top, "Payment", 6.45, MUTE, 1.3);
    const amountLabel = "Amount";
    const aw = L.trackedWidth(amountLabel.toUpperCase(), 6.45, L.fonts.bold, 1.3);
    L.drawTracked(bodyX + w - aw, top, amountLabel.toUpperCase(), 6.45, L.fonts.bold, MUTE, 1.3);
    L.lineH(bodyX, bodyX + w, top + 11, 1.1, INK);
    L.label(bodyX, top + 20, "Total purchase price", 8.4, INK, 1.35);
    const priceSegs: Seg[] = [
      {
        text: doc.price,
        bold: true,
        oblique: doc.priceIsPending,
        color: doc.priceIsPending ? FLAG_INK : FLARE_INK,
      },
    ];
    L.drawParagraphAt(bodyX, top + 16, priceSegs, 13, 15, w, "right");
    L.lineH(bodyX, bodyX + w, top + 36, 0.6, RULE);
    L.y = top + 36;
  }

  // 3 — Payment Terms
  const s3 = CLAUSE.payment(doc.price, doc.priceIsPending);
  L.gap(A_SEC_GAP);
  L.ensure(21 + L.measureParagraph(s3, BODY, BODY_LEAD, bodyW));
  aSectionHeader(L, "3", "Payment Terms");
  L.y += L.drawParagraphAt(bodyX, L.y, s3, BODY, BODY_LEAD, bodyW);

  // 4 / 5 — information tables
  L.gap(A_SEC_GAP);
  L.ensure(21 + 40);
  aSectionHeader(L, "4", "Company Information");
  aInfoTable(L, companyRows(doc));

  L.gap(A_SEC_GAP);
  L.ensure(21 + 40);
  aSectionHeader(L, "5", "Buyer Information");
  aInfoTable(L, buyerRows(doc));

  // 6 — Deliverables, two columns
  L.gap(A_SEC_GAP);
  L.ensure(21 + 30);
  aSectionHeader(L, "6", "Seller's Deliverables");
  L.y += L.drawParagraphAt(bodyX, L.y, CLAUSE.deliverablesIntro(), BODY, BODY_LEAD, bodyW) + 4;
  {
    const colGap = 16;
    const cw = (bodyW - colGap) / 2;
    const items = doc.deliverables;
    for (let i = 0; i < items.length; i += 2) {
      const pair = [items[i], items[i + 1]].filter(Boolean) as string[];
      const heights = pair.map(
        (t) => wrapSegs(L.fonts, [{ text: t }], 9.4, cw - 11).length * 11.5,
      );
      const rowH = Math.max(...heights) + 6;
      L.ensure(rowH);
      const top = L.y;
      pair.forEach((text, col) => {
        const x = bodyX + col * (cw + colGap);
        L.rect(x, top + 4.5, 3.6, 3.6, FLARE);
        L.drawParagraphAt(x + 11, top, [{ text }], 9.4, 11.5, cw - 11);
        L.lineH(x, x + cw, top + rowH, 0.6, HAIR);
      });
      L.y = top + rowH;
    }
  }

  // 7 / 8
  const s7a = CLAUSE.liabilityA();
  const s7b = CLAUSE.liabilityB();
  L.gap(A_SEC_GAP);
  L.ensure(21 + L.measureParagraph(s7a, BODY, BODY_LEAD, bodyW) + 8 + L.measureParagraph(s7b, BODY, BODY_LEAD, bodyW));
  aSectionHeader(L, "7", "Financial Responsibility Before Closing");
  L.y += L.drawParagraphAt(bodyX, L.y, s7a, BODY, BODY_LEAD, bodyW) + 8;
  L.y += L.drawParagraphAt(bodyX, L.y, s7b, BODY, BODY_LEAD, bodyW);

  const s8 = CLAUSE.law();
  L.gap(A_SEC_GAP);
  L.ensure(21 + L.measureParagraph(s8, BODY, BODY_LEAD, bodyW));
  aSectionHeader(L, "8", "Governing Law");
  L.y += L.drawParagraphAt(bodyX, L.y, s8, BODY, BODY_LEAD, bodyW);

  // Signatures — on a shaded slab
  const slabH = 104;
  L.gap(14);
  L.ensure(slabH);
  {
    const top = L.y;
    L.rect(MARGIN, top, CONTENT_W, slabH, SHADE);
    const inner = MARGIN + 13;
    const innerW = CONTENT_W - 26;
    L.drawParagraphAt(inner, top + 11, CLAUSE.signIntro(), 9.5, 13, innerW);
    const colW = innerW / 2;
    const sigTop = top + 34;
    const lineTop = sigTop + 32;
    const sigW = colW - 22;
    [
      ["SELLER", d.sellerName] as const,
      ["BUYER", d.buyerName] as const,
    ].forEach(([role, name], i) => {
      const x = inner + i * colW;
      L.label(x, sigTop, role, 6.4, FLARE_INK, 1.3);
      L.lineH(x, x + sigW, lineTop, 0.9, INK);
      const nameSegs: Seg[] = isPending(name)
        ? [{ text: "[NAME PENDING]", bold: true, oblique: true, color: FLAG_INK }]
        : [{ text: "Print name:", color: MUTE }, { text: name!, bold: true }];
      L.drawParagraphAt(x, lineTop + 6, nameSegs, 9, 12, sigW);
      const dateTop = lineTop + 21;
      if (i === 1 && d.fillableBuyerFields) {
        L.drawParagraphAt(x, dateTop, [{ text: "Date:", color: MUTE }], 9, 12, sigW);
        addBuyerDateField(L, x + 26, dateTop);
        addBuyerSignatureField(L, x, lineTop, sigW);
      } else {
        L.drawParagraphAt(x, dateTop, [{ text: "Date: ______________________", color: MUTE }], 9, 12, sigW);
      }
    });
    L.y = top + slabH;
  }

  // Wire transfer — bordered panel with an ink header bar
  const rows = wireRows(doc);
  const wireRowH = 30;
  const wireH = 20 + wireRowH * 2;
  L.gap(14);
  L.ensure(wireH);
  {
    const top = L.y;
    L.box(MARGIN, top, CONTENT_W, wireH, { border: INK, borderWidth: 1.1 });
    L.rect(MARGIN, top, CONTENT_W, 20, INK);
    L.label(MARGIN + 11, top + 6.5, "Wire transfer instructions", 7, WHITE, 1.4);
    const rightLabel = "SELLER'S ACCOUNT";
    const rw = L.trackedWidth(rightLabel, 7, L.fonts.bold, 1.4);
    L.drawTracked(PAGE_W - MARGIN - 11 - rw, top + 6.5, rightLabel, 7, L.fonts.bold, FLARE, 1.4);
    const half = CONTENT_W / 2;
    rows.forEach((row, i) => {
      const col = i % 2;
      const line = Math.floor(i / 2);
      const x = MARGIN + col * half;
      const rowTop = top + 20 + line * wireRowH;
      if (line) L.lineH(MARGIN, PAGE_W - MARGIN, rowTop, 0.6, HAIR);
      if (col) L.lineV(x, rowTop, wireRowH, 0.6, HAIR);
      L.label(x + 11, rowTop + 7, row.label, 6.3, MUTE, 1.25);
      const { segs, pending, chip } = valueSegs(row);
      if (pending) pendingChip(L, x + 11, rowTop + 18, chip, 6);
      else L.drawParagraphAt(x + 11, rowTop + 15, [{ ...segs[0], bold: true }], 10, 12, half - 22);
    });
    L.y = top + wireH;
  }
}

// =========================================================================
// TEMPLATE 2 — INSTRUMENT
// =========================================================================

function bSectionHeader(L: Layout, num: string, title: string) {
  const top = L.y;
  const x = L.margin;
  const numW = L.trackedWidth(num, 7.8, L.fonts.bold, 1.1);
  L.drawTracked(x, top, num, 7.8, L.fonts.bold, FLARE_INK, 1.1);
  const titleX = x + numW + 8;
  const titleW = L.drawTracked(titleX, top, title.toUpperCase(), 7.8, L.fonts.bold, INK, 1.5);
  const lineX = titleX + titleW + 9;
  if (lineX < PAGE_W - L.margin) L.lineH(lineX, PAGE_W - L.margin, top + 4, 0.6, RULE);
  L.y = top + 15;
}

function bDefList(L: Layout, rows: InfoRow[]) {
  const x = L.margin;
  const w = L.contentW;
  const labelW = 111;
  L.lineH(x, x + w, L.y, 0.6, RULE);
  for (const row of rows) {
    const { segs, pending, chip } = valueSegs(row);
    const lines = pending ? 1 : wrapSegs(L.fonts, segs, 9.5, w - labelW).length;
    const rowH = lines * 12.5 + 7;
    L.ensure(rowH);
    const top = L.y;
    L.drawParagraphAt(x, top + 3, [{ text: row.label, color: MUTE }], 8.8, 12.5, labelW);
    if (pending) pendingChip(L, x + labelW, top + 4, chip);
    else L.drawParagraphAt(x + labelW, top + 3, segs, 9.5, 12.5, w - labelW);
    L.y = top + rowH;
    L.lineH(x, x + w, L.y, 0.6, HAIR);
  }
}

function renderInstrument(L: Layout, doc: Doc) {
  const d = doc.d;
  L.margin = WIDE_MARGIN;
  const x = L.margin;
  const w = L.contentW;

  // Title block, centred, no fills.
  L.y = 60;
  const kicker = "MEMBERSHIP INTEREST PURCHASE AGREEMENT";
  const kw = L.trackedWidth(kicker, 6.6, L.fonts.bold, 2.4);
  L.drawTracked((PAGE_W - kw) / 2, L.y, kicker, 6.6, L.fonts.bold, MUTE, 2.4);
  L.gap(20);
  const title = "BILL OF SALE";
  const tw = L.trackedWidth(title, 20, L.fonts.regular, 3.4);
  L.drawTracked((PAGE_W - tw) / 2, L.y, title, 20, L.fonts.regular, INK, 3.4);
  L.gap(30);
  L.rect((PAGE_W - 33) / 2, L.y, 33, 1.2, FLARE_INK);
  L.gap(13);
  L.y += L.drawParagraphAt(
    x,
    L.y,
    [
      { text: d.companyName, bold: true },
      ...(!isPending(d.companyDba) ? [{ text: `(DBA ${d.companyDba})`, color: MUTE }] : []),
    ],
    11,
    14,
    w,
    "center",
  );
  const idLine = [
    !isPending(d.mcNumber) ? d.mcNumber! : "MC pending",
    !isPending(d.usdotNumber) ? `USDOT ${d.usdotNumber}` : "USDOT pending",
  ].join("  -  ");
  L.y += L.drawParagraphAt(x, L.y + 3, [{ text: idLine, color: MUTE }], 8.6, 11, w, "center") + 3;

  // Preamble — the date carries an accent underscore rather than a fill.
  L.gap(20);
  L.paragraph(
    [
      { text: 'This Bill of Sale ("Bill of Sale") is entered into as of the' },
      {
        text: doc.effective,
        bold: true,
        underline: FLARE,
        oblique: isPending(d.effectiveDate),
        color: isPending(d.effectiveDate) ? FLAG_INK : undefined,
      },
      { text: ", by and between:", glue: true },
    ],
    BODY,
    BODY_LEAD,
  );
  L.gap(9);

  const parties: [string, string | null | undefined, string][] = [
    ["SELLER", d.sellerName, 'an individual ("Seller")'],
    ["BUYER", d.buyerName, 'an individual ("Buyer")'],
    ["COMPANY", doc.companyFull, 'a limited liability company ("Company")'],
  ];
  for (const [role, name, suffix] of parties) {
    const pending = isPending(name);
    const roleW = L.trackedWidth(`${role} -`, 7.4, L.fonts.bold, 1.4) + 6;
    const segs: Seg[] = pending
      ? [{ text: `[${role} NAME PENDING]`, bold: true, oblique: true, color: FLAG_INK }]
      : [{ text: `${name},`, bold: true }, { text: suffix }];
    const h = L.measureParagraph(segs, 9.8, 13, w - roleW) + 5;
    L.ensure(h);
    const top = L.y;
    L.drawTracked(x, top + 1, `${role} -`, 7.4, L.fonts.bold, INK, 1.4);
    L.drawParagraphAt(x + roleW, top, segs, 9.8, 13, w - roleW);
    L.y = top + h;
  }

  const gap = 14;

  // I — Sale
  const s1 = CLAUSE.sale(doc.interest);
  L.gap(gap);
  L.ensure(15 + L.measureParagraph(s1, BODY, BODY_LEAD, w));
  bSectionHeader(L, "I", "Sale of Membership Interest");
  L.y += L.drawParagraphAt(
    x,
    L.y,
    [
      { text: "Seller hereby sells, transfers, assigns, and conveys to Buyer" },
      { text: doc.interest, bold: true, underline: FLARE },
      { text: "in the Company, representing all outstanding membership interest of the Company." },
    ],
    BODY,
    BODY_LEAD,
    w,
  );

  // II — Purchase price, framed by two ink rules
  L.gap(gap);
  L.ensure(15 + 34);
  bSectionHeader(L, "II", "Purchase Price");
  {
    const top = L.y;
    L.lineH(x, x + w, top, 1, INK);
    L.label(x, top + 12, "Total purchase price", 8, INK, 1.5);
    L.drawParagraphAt(
      x,
      top + 8,
      [
        {
          text: doc.price,
          oblique: doc.priceIsPending,
          color: doc.priceIsPending ? FLAG_INK : INK,
        },
      ],
      15,
      17,
      w,
      "right",
    );
    L.lineH(x, x + w, top + 31, 1, INK);
    L.y = top + 31;
  }

  // III — Payment terms
  L.gap(gap);
  const s3 = CLAUSE.payment(doc.price, doc.priceIsPending);
  L.ensure(15 + L.measureParagraph(s3, BODY, BODY_LEAD, w));
  bSectionHeader(L, "III", "Payment Terms");
  L.y += L.drawParagraphAt(
    x,
    L.y,
    [
      { text: "The full purchase price of" },
      {
        text: doc.price,
        bold: true,
        underline: FLARE,
        oblique: doc.priceIsPending,
        color: doc.priceIsPending ? FLAG_INK : undefined,
      },
      { text: CLAUSE.payment(doc.price, doc.priceIsPending)[2].text },
    ],
    BODY,
    BODY_LEAD,
    w,
  );

  // IV / V
  L.gap(gap);
  L.ensure(15 + 40);
  bSectionHeader(L, "IV", "Company Information");
  bDefList(L, companyRows(doc));

  L.gap(gap);
  L.ensure(15 + 40);
  bSectionHeader(L, "V", "Buyer Information");
  bDefList(L, buyerRows(doc));

  // VI — Deliverables
  L.gap(gap);
  L.ensure(15 + 30);
  bSectionHeader(L, "VI", "Seller's Deliverables");
  L.y += L.drawParagraphAt(x, L.y, CLAUSE.deliverablesIntro(), BODY, BODY_LEAD, w) + 3;
  for (const item of doc.deliverables) {
    const h = L.measureParagraph([{ text: item }], 9.8, 13, w - 16) + 3;
    L.ensure(h);
    const top = L.y;
    L.drawParagraphAt(x + 4, top, [{ text: "•", color: FLARE_INK, bold: true }], 9.8, 13, 10);
    L.drawParagraphAt(x + 16, top, [{ text: item }], 9.8, 13, w - 16);
    L.y = top + h;
  }

  // VII / VIII
  const s7a = CLAUSE.liabilityA();
  const s7b = CLAUSE.liabilityB();
  L.gap(gap);
  L.ensure(15 + L.measureParagraph(s7a, BODY, BODY_LEAD, w) + 8 + L.measureParagraph(s7b, BODY, BODY_LEAD, w));
  bSectionHeader(L, "VII", "Financial Responsibility Before Closing");
  L.y += L.drawParagraphAt(x, L.y, s7a, BODY, BODY_LEAD, w) + 8;
  L.y += L.drawParagraphAt(x, L.y, s7b, BODY, BODY_LEAD, w);

  const s8 = CLAUSE.law();
  L.gap(gap);
  L.ensure(15 + L.measureParagraph(s8, BODY, BODY_LEAD, w));
  bSectionHeader(L, "VIII", "Governing Law");
  L.y += L.drawParagraphAt(x, L.y, s8, BODY, BODY_LEAD, w);

  // IX — Wire
  L.gap(gap);
  L.ensure(15 + 40);
  bSectionHeader(L, "IX", "Wire Transfer Instructions");
  bDefList(L, wireRows(doc));

  // Signatures
  L.gap(20);
  L.ensure(84);
  L.y += L.drawParagraphAt(x, L.y, CLAUSE.signIntro(), BODY, BODY_LEAD, w);
  L.gap(16);
  {
    const colW = w / 2;
    const sigTop = L.y;
    const lineTop = sigTop + 34;
    const sigW = colW - 26;
    [
      ["SELLER", d.sellerName] as const,
      ["BUYER", d.buyerName] as const,
    ].forEach(([role, name], i) => {
      const cx = x + i * colW;
      L.label(cx, sigTop, role, 6.6, INK, 1.5);
      L.lineH(cx, cx + sigW, lineTop, 0.9, INK);
      const nameSegs: Seg[] = isPending(name)
        ? [{ text: "[NAME PENDING]", bold: true, oblique: true, color: FLAG_INK }]
        : [{ text: "Print name:", color: MUTE }, { text: name!, bold: true }];
      L.drawParagraphAt(cx, lineTop + 6, nameSegs, 9, 12, sigW);
      const dateTop = lineTop + 21;
      if (i === 1 && d.fillableBuyerFields) {
        L.drawParagraphAt(cx, dateTop, [{ text: "Date:", color: MUTE }], 9, 12, sigW);
        addBuyerDateField(L, cx + 26, dateTop);
        addBuyerSignatureField(L, cx, lineTop, sigW);
      } else {
        L.drawParagraphAt(cx, dateTop, [{ text: "Date: ______________________", color: MUTE }], 9, 12, sigW);
      }
    });
    L.y = lineTop + 40;
  }
}

// =========================================================================
// TEMPLATE 3 — TERM SHEET
// =========================================================================

const C_RAIL = 96; // left rail holding the clause name

function cRow(
  L: Layout,
  num: string,
  title: string,
  draw: (x: number, top: number, w: number) => number, // returns height used
  measured: number,
) {
  const railLines = wrapSegs(L.fonts, [{ text: title.toUpperCase(), bold: true }], 7.4, C_RAIL - 10).length;
  const railH = 10 + railLines * 9.5;
  const bodyX = L.margin + C_RAIL + 16;
  const bodyW = L.contentW - C_RAIL - 16;
  L.ensure(Math.max(railH, measured) + 12);
  const top = L.y + 8;
  L.lineH(L.margin, PAGE_W - L.margin, L.y, 0.6, HAIR);
  L.drawTracked(L.margin, top, num, 7.4, L.fonts.bold, FLARE_INK, 1);
  // Title wraps inside the rail, tracked line by line.
  const words = title.toUpperCase().split(" ");
  let line = "";
  let lineTop = top + 11;
  for (const word of words) {
    const attempt = line ? `${line} ${word}` : word;
    if (L.trackedWidth(attempt, 7.4, L.fonts.bold, 0.8) > C_RAIL - 8 && line) {
      L.drawTracked(L.margin, lineTop, line, 7.4, L.fonts.bold, INK, 0.8);
      lineTop += 9.5;
      line = word;
    } else {
      line = attempt;
    }
  }
  if (line) {
    L.drawTracked(L.margin, lineTop, line, 7.4, L.fonts.bold, INK, 0.8);
    lineTop += 9.5;
  }
  const used = draw(bodyX, top, bodyW);
  L.y = top + Math.max(used, lineTop - top) + 10;
}

// Bordered chips, laid out in rows — used for access items and deliverables.
// CHIP metrics are shared by the draw and the measure below: if they drift,
// blocks are sized wrongly and break pages in the wrong place.
const CHIP = { padX: 6, h: 13, gapX: 4, gapY: 3.5, size: 8.4 };

function cChips(L: Layout, x: number, top: number, w: number, items: string[]): number {
  const { padX, h, gapX, gapY } = CHIP;
  let cx = x;
  let cy = top;
  for (const item of items) {
    const tw = L.fonts.regular.widthOfTextAtSize(item, CHIP.size);
    const chipW = tw + padX * 2;
    if (cx + chipW > x + w && cx > x) {
      cx = x;
      cy += h + gapY;
    }
    L.box(cx, cy, chipW, h, { fill: rgb(0.985, 0.985, 0.98), border: RULE, borderWidth: 0.6 });
    L.drawParagraphAt(cx + padX, cy + 3, [{ text: item }], CHIP.size, 10, tw + 1);
    cx += chipW + gapX;
  }
  return cy + h - top;
}

function cChipsHeight(L: Layout, w: number, items: string[]): number {
  const { padX, h, gapX, gapY } = CHIP;
  let cx = 0;
  let rows = 1;
  for (const item of items) {
    const chipW = L.fonts.regular.widthOfTextAtSize(item, CHIP.size) + padX * 2;
    if (cx + chipW > w && cx > 0) {
      cx = 0;
      rows += 1;
    }
    cx += chipW + gapX;
  }
  return rows * h + (rows - 1) * gapY;
}

// Two-column key/value grid used inside a clause body.
function cKeyValues(L: Layout, x: number, top: number, w: number, rows: InfoRow[]): number {
  const colW = (w - 14) / 2;
  let y = top;
  for (let i = 0; i < rows.length; i += 2) {
    const pair = rows.slice(i, i + 2);
    let rowH = 0;
    pair.forEach((row, col) => {
      const cx = x + col * (colW + 14);
      L.label(cx, y, row.label, 6.3, MUTE, 1.2);
      const { segs, pending, chip } = valueSegs(row);
      let h = 10;
      if (pending) {
        pendingChip(L, cx, y + 13, chip, 6);
        h += 14;
      } else {
        h += L.drawParagraphAt(cx, y + 10, [{ ...segs[0], bold: true }], 9.5, 12, colW);
      }
      rowH = Math.max(rowH, h);
    });
    y += rowH + 7;
  }
  return y - top;
}

function cKeyValuesHeight(L: Layout, w: number, rows: InfoRow[]): number {
  const colW = (w - 14) / 2;
  let h = 0;
  for (let i = 0; i < rows.length; i += 2) {
    const pair = rows.slice(i, i + 2);
    let rowH = 0;
    for (const row of pair) {
      const { segs, pending } = valueSegs(row);
      const lines = pending ? 1 : wrapSegs(L.fonts, segs, 9.5, colW).length;
      rowH = Math.max(rowH, 10 + (pending ? 14 : lines * 12));
    }
    h += rowH + 7;
  }
  return h;
}

function renderTermSheet(L: Layout, doc: Doc) {
  const d = doc.d;
  const x = MARGIN;
  const w = CONTENT_W;

  // Header: title left, effective-date stamp right.
  L.y = 40;
  const stampW = 108;
  const stampH = 30;
  L.box(PAGE_W - MARGIN - stampW, L.y, stampW, stampH, { border: INK, borderWidth: 1 });
  L.label(PAGE_W - MARGIN - stampW + 9, L.y + 7, "Effective", 6.2, MUTE, 1.2);
  const stampDate = !isPending(d.effectiveDate) ? d.effectiveDate! : "PENDING";
  L.drawParagraphAt(
    PAGE_W - MARGIN - stampW + 9,
    L.y + 16,
    [{ text: stampDate, bold: true, color: isPending(d.effectiveDate) ? FLAG_INK : INK }],
    8.6,
    10,
    stampW - 18,
  );
  L.y += L.drawParagraphAt(x, L.y, [{ text: "Bill of Sale", bold: true }], 17, 19, w - stampW - 20);
  L.y += L.drawParagraphAt(
    x,
    L.y + 2,
    [{ text: `Membership Interest Purchase Agreement  -  ${d.companyName}`, color: MUTE }],
    9,
    11,
    w - stampW - 20,
  ) + 2;
  L.y = Math.max(L.y, 40 + stampH);

  // Summary card: price panel + identifiers. Height comes from the content —
  // a two-line company name must not push its address past the border.
  L.gap(16);
  {
    const panelW = 174;
    const gx = x + panelW;
    const gw = w - panelW;
    const cellW = gw / 2;
    const cellTextW = cellW - 26;
    const cells: { k: string; v: string | null | undefined; sub?: string | null }[] = [
      { k: "Seller", v: d.sellerName, sub: "An individual" },
      { k: "Buyer", v: d.buyerName, sub: d.buyerAddress },
      {
        k: "Company",
        v: d.companyName,
        sub: !isPending(d.companyDba) ? `DBA ${d.companyDba}` : d.companyAddress,
      },
      {
        k: "Authority",
        v: !isPending(d.mcNumber) ? d.mcNumber : null,
        sub: !isPending(d.usdotNumber) ? `USDOT ${d.usdotNumber}` : null,
      },
    ];
    const cellHeight = (cell: (typeof cells)[number]) => {
      const pending = isPending(cell.v);
      const nameH = pending ? 15 : wrapSegs(L.fonts, [{ text: cell.v! }], 9.4, cellTextW).length * 11;
      const subH = cell.sub ? wrapSegs(L.fonts, [{ text: cell.sub }], 7.8, cellTextW).length * 9.5 + 1 : 0;
      return 22 + nameH + subH + 8;
    };
    const rowH = [
      Math.max(cellHeight(cells[0]), cellHeight(cells[1])),
      Math.max(cellHeight(cells[2]), cellHeight(cells[3])),
    ];
    const cardH = Math.max(96, rowH[0] + rowH[1]);
    L.ensure(cardH);
    const cardTop = L.y;

    L.box(x, cardTop, w, cardH, { border: INK, borderWidth: 1.2 });
    L.rect(x, cardTop, panelW, cardH, INK);
    const note = "Payable in full on transfer of all documents and access";
    const noteLines = wrapSegs(L.fonts, [{ text: note }], 7.6, panelW - 30).length;
    // The price is the loudest thing on the page, so it is set as large as it
    // can be on one line: a seven-figure sum or a [PRICE PENDING] flag steps
    // down rather than wrapping into the note beneath it.
    const priceFont = doc.priceIsPending ? L.fonts.boldOblique : L.fonts.bold;
    let priceSize = 22;
    while (priceSize > 11 && priceFont.widthOfTextAtSize(doc.price, priceSize) > panelW - 26) {
      priceSize -= 0.5;
    }
    const priceH = wrapSegs(L.fonts, [{ text: doc.price, bold: true }], priceSize, panelW - 26).length *
      (priceSize + 2);
    const panelH = 10 + priceH + 7 + noteLines * 10;
    const panelTop = cardTop + Math.max(14, (cardH - panelH) / 2);
    L.label(x + 16, panelTop, "Total purchase price", 6.3, FLARE, 1.3);
    L.drawParagraphAt(
      x + 16,
      panelTop + 13,
      [
        {
          text: doc.price,
          bold: true,
          oblique: doc.priceIsPending,
          color: doc.priceIsPending ? rgb(1, 0.72, 0.44) : WHITE,
        },
      ],
      priceSize,
      priceSize + 2,
      panelW - 26,
    );
    L.drawParagraphAt(
      x + 16,
      panelTop + 13 + priceH + 7,
      [{ text: note, color: rgb(0.66, 0.66, 0.68) }],
      7.6,
      10,
      panelW - 30,
    );

    cells.forEach((cell, i) => {
      const col = i % 2;
      const line = Math.floor(i / 2);
      const cx = gx + col * cellW;
      const cy = cardTop + (line ? rowH[0] : 0);
      const thisRowH = line ? cardH - rowH[0] : rowH[0];
      if (col) L.lineV(cx, cy + 6, thisRowH - 12, 0.6, HAIR);
      if (line) L.lineH(gx + 6, x + w - 6, cy, 0.6, HAIR);
      L.label(cx + 13, cy + 12, cell.k, 6.3, MUTE, 1.25);
      const pending = isPending(cell.v);
      let subTop = cy + 22;
      if (pending) {
        pendingChip(L, cx + 13, cy + 25, "PENDING", 6);
        subTop += 15;
      } else {
        subTop += L.drawParagraphAt(cx + 13, cy + 22, [{ text: cell.v!, bold: true }], 9.4, 11, cellTextW);
      }
      if (cell.sub) {
        L.drawParagraphAt(cx + 13, subTop + 1, [{ text: cell.sub, color: MUTE }], 7.8, 9.5, cellTextW);
      }
    });
    L.y = cardTop + cardH;
  }

  // Preamble
  L.gap(15);
  L.paragraph(
    [
      {
        text:
          `This Bill of Sale ("Bill of Sale") is entered into as of the ${doc.effective}, by and ` +
          "between the Seller, the Buyer and the Company identified above.",
      },
    ],
    9.6,
    13.5,
  );
  L.gap(12);
  L.lineH(x, x + w, L.y, 1.1, INK);

  // Clause rows
  const s1 = CLAUSE.sale(doc.interest);
  cRow(
    L,
    "01",
    "Sale of Membership Interest",
    (bx, bt, bw) => L.drawParagraphAt(bx, bt, s1, 9.6, 13.5, bw),
    L.measureParagraph(s1, 9.6, 13.5, CONTENT_W - C_RAIL - 16),
  );

  const accessItems = ["FMCSA portal", "MC authority", "Company email", "Phone number", "All other accounts"];
  const s2: Seg[] = [
    { text: "The full purchase price of" },
    {
      text: doc.price,
      bold: true,
      oblique: doc.priceIsPending,
      color: doc.priceIsPending ? FLAG_INK : undefined,
    },
    {
      text:
        "shall be paid by Buyer to Seller after all Company documents have been delivered and all " +
        "Company access has been transferred to and confirmed received by Buyer.",
    },
  ];
  const bodyWidth = CONTENT_W - C_RAIL - 16;
  cRow(
    L,
    "02",
    "Payment Terms",
    (bx, bt, bw) => {
      const used = L.drawParagraphAt(bx, bt, s2, 9.6, 13.5, bw);
      return used + 5 + cChips(L, bx, bt + used + 5, bw, accessItems);
    },
    L.measureParagraph(s2, 9.6, 13.5, bodyWidth) + 5 + cChipsHeight(L, bodyWidth, accessItems),
  );

  const cRows = companyRows(doc);
  cRow(
    L,
    "03",
    "Company Information",
    (bx, bt, bw) => cKeyValues(L, bx, bt, bw, cRows),
    cKeyValuesHeight(L, bodyWidth, cRows),
  );

  const bRows = buyerRows(doc);
  cRow(
    L,
    "04",
    "Buyer Information",
    (bx, bt, bw) => cKeyValues(L, bx, bt, bw, bRows),
    cKeyValuesHeight(L, bodyWidth, bRows),
  );

  const intro = CLAUSE.deliverablesIntro();
  cRow(
    L,
    "05",
    "Seller's Deliverables",
    (bx, bt, bw) => {
      const used = L.drawParagraphAt(bx, bt, intro, 9.6, 13.5, bw);
      return used + 5 + cChips(L, bx, bt + used + 5, bw, doc.deliverables);
    },
    L.measureParagraph(intro, 9.6, 13.5, bodyWidth) + 5 + cChipsHeight(L, bodyWidth, doc.deliverables),
  );

  const s6a = CLAUSE.liabilityA();
  const s6b = CLAUSE.liabilityB();
  const noteH = L.measureParagraph(s6b, 9.2, 12.5, bodyWidth - 22) + 14;
  cRow(
    L,
    "06",
    "Financial Responsibility Before Closing",
    (bx, bt, bw) => {
      const used = L.drawParagraphAt(bx, bt, s6a, 9.6, 13.5, bw);
      const noteTop = bt + used + 7;
      const h = L.measureParagraph(s6b, 9.2, 12.5, bw - 22) + 14;
      L.rect(bx, noteTop, bw, h, SHADE);
      L.rect(bx, noteTop, 2, h, FLARE);
      L.drawParagraphAt(bx + 12, noteTop + 7, s6b, 9.2, 12.5, bw - 22);
      return used + 7 + h;
    },
    L.measureParagraph(s6a, 9.6, 13.5, bodyWidth) + 7 + noteH,
  );

  const s7 = CLAUSE.law();
  cRow(
    L,
    "07",
    "Governing Law",
    (bx, bt, bw) => L.drawParagraphAt(bx, bt, s7, 9.6, 13.5, bw),
    L.measureParagraph(s7, 9.6, 13.5, bodyWidth),
  );

  const wRows = wireRows(doc);
  cRow(
    L,
    "08",
    "Wire Transfer Instructions",
    (bx, bt, bw) => {
      const used = L.drawParagraphAt(
        bx,
        bt,
        [{ text: "Payment is wired to the Seller's account below." }],
        9.6,
        13.5,
        bw,
      );
      return used + 4 + cKeyValues(L, bx, bt + used + 4, bw, wRows);
    },
    16 + cKeyValuesHeight(L, bodyWidth, wRows),
  );

  L.lineH(x, x + w, L.y, 0.6, HAIR);

  // Signature panel
  const panelH = 108;
  L.gap(16);
  L.ensure(panelH);
  {
    const top = L.y;
    L.box(x, top, w, panelH, { border: RULE, borderWidth: 0.9 });
    L.rect(x, top, w, 20, SHADE);
    L.lineH(x, x + w, top + 20, 0.6, RULE);
    L.label(x + 13, top + 6.5, "Signatures", 6.6, INK, 1.5);
    L.drawParagraphAt(
      x + 78,
      top + 6,
      [{ text: "By signing below, the parties agree to the terms set forth in this Bill of Sale.", color: MUTE }],
      8,
      10,
      w - 90,
    );
    const colW = w / 2;
    const sigTop = top + 32;
    const lineTop = sigTop + 34;
    const sigW = colW - 32;
    [
      ["SELLER", d.sellerName] as const,
      ["BUYER", d.buyerName] as const,
    ].forEach(([role, name], i) => {
      const cx = x + 15 + i * colW;
      if (i) L.lineV(x + colW, top + 20, panelH - 20, 0.6, RULE);
      L.label(cx, sigTop, role, 6.4, FLARE_INK, 1.3);
      L.lineH(cx, cx + sigW, lineTop, 0.9, INK);
      const nameSegs: Seg[] = isPending(name)
        ? [{ text: "[NAME PENDING]", bold: true, oblique: true, color: FLAG_INK }]
        : [{ text: "Print name:", color: MUTE }, { text: name!, bold: true }];
      L.drawParagraphAt(cx, lineTop + 6, nameSegs, 9, 12, sigW);
      const dateTop = lineTop + 21;
      if (i === 1 && d.fillableBuyerFields) {
        L.drawParagraphAt(cx, dateTop, [{ text: "Date:", color: MUTE }], 9, 12, sigW);
        addBuyerDateField(L, cx + 26, dateTop);
        addBuyerSignatureField(L, cx, lineTop, sigW);
      } else {
        L.drawParagraphAt(cx, dateTop, [{ text: "Date: ______________________", color: MUTE }], 9, 12, sigW);
      }
    });
    L.y = top + panelH;
  }
}

// ---------------------------------------------------------------------------

export async function buildBillOfSale(data: BillOfSaleData): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`Bill of Sale - ${data.companyName}`);
  const fonts: Fonts = {
    regular: await pdf.embedFont(StandardFonts.Helvetica),
    bold: await pdf.embedFont(StandardFonts.HelveticaBold),
    boldOblique: await pdf.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const L = new Layout(pdf, fonts);
  const doc = prepare(data);

  switch (data.template ?? "masthead") {
    case "instrument":
      renderInstrument(L, doc);
      break;
    case "termsheet":
      renderTermSheet(L, doc);
      break;
    default:
      renderMasthead(L, doc);
  }

  if (data.fillableBuyerFields) {
    // Make the fillable fields render with Helvetica everywhere.
    pdf.getForm().updateFieldAppearances(fonts.regular);
  }

  drawFooters(pdf, fonts, doc);
  return pdf.save();
}

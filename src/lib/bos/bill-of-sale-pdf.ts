// Bill of Sale (Membership Interest Purchase) PDF generator.
//
// TypeScript port of the internal "bill-of-sale" skill (Python/ReportLab).
// Runs entirely in the browser via pdf-lib — deal details (names, price,
// wire/banking info) never leave the admin's machine.
//
// Any field left empty renders as a clearly flagged placeholder — bold
// orange italic on a light-yellow cell, e.g. [PRICE PENDING] — so a draft
// can go out for review before every figure is locked in.

import {
  PDFDocument,
  PDFFont,
  PDFPage,
  StandardFonts,
  rgb,
  type RGB,
} from "pdf-lib";

export type BillOfSaleData = {
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

// Palette — mirrors the navy/blue groupveritor.com aesthetic.
const NAVY = rgb(0x0f / 255, 0x26 / 255, 0x47 / 255);
const ACCENT = rgb(0x1f / 255, 0x5f / 255, 0xa8 / 255);
const ACCENT_LIGHT = rgb(0xea / 255, 0xf1 / 255, 0xfa / 255);
const BORDER = rgb(0xd6 / 255, 0xdd / 255, 0xe6 / 255);
const TEXT = rgb(0x1c / 255, 0x23 / 255, 0x2c / 255);
const SUBTEXT = rgb(0x5b / 255, 0x65 / 255, 0x72 / 255);
const PENDING_BG = rgb(0xff / 255, 0xf4 / 255, 0xd6 / 255);
const PENDING_TEXT = rgb(0xa5 / 255, 0x46 / 255, 0x0a / 255);
const WHITE = rgb(1, 1, 1);

const PAGE_W = 612; // letter
const PAGE_H = 792;
const MARGIN = 0.72 * 72; // 51.84
const BOTTOM_LIMIT = 0.75 * 72; // reserved for footer
const CONTENT_W = PAGE_W - 2 * MARGIN;
const TABLE_W = 6.0 * 72; // 432 — all info tables

type Seg = { text: string; bold?: boolean; oblique?: boolean; color?: RGB };
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
    for (const raw of seg.text.split(/\s+/)) {
      if (!raw) continue;
      words.push({ ...seg, text: raw, w: font.widthOfTextAtSize(raw, size) });
    }
  }
  const space = fonts.regular.widthOfTextAtSize(" ", size);
  const lines: Seg[][] = [];
  let line: Word[] = [];
  let lineW = 0;
  for (const word of words) {
    const extra = (line.length ? space : 0) + word.w;
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

  constructor(doc: PDFDocument, fonts: Fonts) {
    this.doc = doc;
    this.fonts = fonts;
    this.newPage(0);
  }

  newPage(topMargin = MARGIN) {
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

  // Draws at the current cursor (or a given top y) and returns height used.
  drawParagraphAt(
    x: number,
    top: number,
    segs: Seg[],
    size: number,
    leading: number,
    maxWidth: number,
    align: "left" | "center" = "left",
  ): number {
    const lines = wrapSegs(this.fonts, segs, size, maxWidth);
    const space = this.fonts.regular.widthOfTextAtSize(" ", size);
    let lineTop = top;
    for (const line of lines) {
      let lineW = 0;
      for (let i = 0; i < line.length; i++) {
        lineW += segFont(this.fonts, line[i]).widthOfTextAtSize(line[i].text, size);
        if (i > 0) lineW += space;
      }
      let cx = align === "center" ? x + (maxWidth - lineW) / 2 : x;
      const baseline = PAGE_H - lineTop - size * 0.85;
      for (const seg of line) {
        const font = segFont(this.fonts, seg);
        this.page.drawText(seg.text, {
          x: cx,
          y: baseline,
          size,
          font,
          color: seg.color ?? TEXT,
        });
        cx += font.widthOfTextAtSize(seg.text, size) + space;
      }
      lineTop += leading;
    }
    return lines.length * leading;
  }

  paragraph(
    segs: Seg[],
    size: number,
    leading: number,
    opts: { x?: number; maxWidth?: number; align?: "left" | "center"; spaceBefore?: number; spaceAfter?: number } = {},
  ) {
    const {
      x = MARGIN,
      maxWidth = CONTENT_W,
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

  // --- primitives -----------------------------------------------------

  rect(x: number, top: number, w: number, h: number, color: RGB) {
    this.page.drawRectangle({ x, y: PAGE_H - top - h, width: w, height: h, color });
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

// --- section header: numbered accent badge + navy title -----------------

const BADGE = 0.28 * 72; // 20.16

function sectionHeaderHeight(): number {
  return BADGE + 2;
}

function drawSectionHeader(L: Layout, num: string, title: string) {
  const top = L.y;
  L.rect(MARGIN, top, BADGE, BADGE, ACCENT);
  const numW = L.fonts.bold.widthOfTextAtSize(num, 10);
  L.page.drawText(num, {
    x: MARGIN + (BADGE - numW) / 2,
    y: PAGE_H - top - BADGE / 2 - 3.5,
    size: 10,
    font: L.fonts.bold,
    color: WHITE,
  });
  L.page.drawText(title, {
    x: MARGIN + 0.4 * 72,
    y: PAGE_H - top - BADGE / 2 - 4.4,
    size: 12.5,
    font: L.fonts.bold,
    color: NAVY,
  });
  L.y += sectionHeaderHeight();
}

// --- label/value info table with pending highlighting -------------------

type InfoRow = { label: string; value: string | null | undefined; placeholder?: string };

const CELL_PAD_X = 9;
const CELL_PAD_Y = 7;
const CELL_LEADING = 13;

function infoRowContent(row: InfoRow): { segs: Seg[]; pending: boolean } {
  if (isPending(row.value)) {
    return {
      segs: [
        {
          text: `[${row.placeholder ?? "PENDING - TO BE CONFIRMED"}]`,
          bold: true,
          oblique: true,
          color: PENDING_TEXT,
        },
      ],
      pending: true,
    };
  }
  return { segs: [{ text: row.value }], pending: false };
}

function measureInfoTable(L: Layout, rows: InfoRow[], labelW: number, valueW: number): number {
  let h = 0;
  for (const row of rows) {
    const labelLines = wrapSegs(L.fonts, [{ text: row.label, bold: true }], 9.5, labelW - 2 * CELL_PAD_X).length;
    const valueLines = wrapSegs(L.fonts, infoRowContent(row).segs, 9.5, valueW - 2 * CELL_PAD_X).length;
    h += Math.max(labelLines, valueLines) * CELL_LEADING + 2 * CELL_PAD_Y;
  }
  return h;
}

function drawInfoTable(L: Layout, rows: InfoRow[], labelW = 1.7 * 72, valueW = 4.3 * 72) {
  const x = MARGIN;
  const top = L.y;
  let rowTop = top;
  for (const row of rows) {
    const { segs, pending } = infoRowContent(row);
    const labelLines = wrapSegs(L.fonts, [{ text: row.label, bold: true }], 9.5, labelW - 2 * CELL_PAD_X).length;
    const valueLines = wrapSegs(L.fonts, segs, 9.5, valueW - 2 * CELL_PAD_X).length;
    const rowH = Math.max(labelLines, valueLines) * CELL_LEADING + 2 * CELL_PAD_Y;

    L.rect(x, rowTop, labelW, rowH, ACCENT_LIGHT);
    if (pending) L.rect(x + labelW, rowTop, valueW, rowH, PENDING_BG);

    L.drawParagraphAt(x + CELL_PAD_X, rowTop + CELL_PAD_Y, [{ text: row.label, bold: true, color: NAVY }], 9.5, CELL_LEADING, labelW - 2 * CELL_PAD_X);
    L.drawParagraphAt(x + labelW + CELL_PAD_X, rowTop + CELL_PAD_Y, segs, 9.5, CELL_LEADING, valueW - 2 * CELL_PAD_X);

    rowTop += rowH;
    L.lineH(x, x + labelW + valueW, rowTop, 0.75, BORDER); // row divider / bottom
  }
  // outer box + column divider
  L.lineH(x, x + labelW + valueW, top, 0.75, BORDER);
  L.lineV(x, top, rowTop - top, 0.75, BORDER);
  L.lineV(x + labelW, top, rowTop - top, 0.75, BORDER);
  L.lineV(x + labelW + valueW, top, rowTop - top, 0.75, BORDER);
  L.y = rowTop;
}

// --- footer ---------------------------------------------------------------

function drawFooters(doc: PDFDocument, fonts: Fonts, companyName: string) {
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    page.drawLine({
      start: { x: MARGIN, y: 0.55 * 72 },
      end: { x: PAGE_W - MARGIN, y: 0.55 * 72 },
      thickness: 0.6,
      color: BORDER,
    });
    const fy = 0.38 * 72;
    page.drawText(`Bill of Sale - ${companyName}`, { x: MARGIN, y: fy, size: 8, font: fonts.regular, color: SUBTEXT });
    const center = "Confidential - draft for review";
    const cw = fonts.regular.widthOfTextAtSize(center, 8);
    page.drawText(center, { x: (PAGE_W - cw) / 2, y: fy, size: 8, font: fonts.regular, color: SUBTEXT });
    const pn = `Page ${i + 1}`;
    const pw = fonts.regular.widthOfTextAtSize(pn, 8);
    page.drawText(pn, { x: PAGE_W - MARGIN - pw, y: fy, size: 8, font: fonts.regular, color: SUBTEXT });
  });
}

// ---------------------------------------------------------------------------

export async function buildBillOfSale(data: BillOfSaleData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Bill of Sale - ${data.companyName}`);
  const fonts: Fonts = {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    boldOblique: await doc.embedFont(StandardFonts.HelveticaBoldOblique),
  };
  const L = new Layout(doc, fonts);

  const dbaSuffix = !isPending(data.companyDba) ? ` (DBA ${data.companyDba})` : "";
  const companyFull = `${data.companyName}${dbaSuffix}`;
  const interest = !isPending(data.interestTransferred)
    ? data.interestTransferred!
    : "100% Membership Interest";

  // --- header band (top of page 1) ---
  const bandX = (PAGE_W - 6.56 * 72) / 2;
  const bandW = 6.56 * 72;
  const bandH = 14 + 24 + 2 + 14 + 14;
  L.rect(bandX, 0, bandW, bandH, NAVY);
  L.drawParagraphAt(bandX, 14, [{ text: "BILL OF SALE", bold: true, color: WHITE }], 20, 24, bandW, "center");
  L.drawParagraphAt(bandX, 14 + 24 + 2, [{ text: "Membership Interest Purchase Agreement", color: WHITE }], 11, 14, bandW, "center");
  L.y = bandH + 10;
  L.paragraph([{ text: companyFull, bold: true, color: NAVY }], 13, 17, { align: "center" });
  L.gap(14);

  // --- intro + parties ---
  const effTxt = !isPending(data.effectiveDate) ? data.effectiveDate! : "[DATE PENDING]";
  L.paragraph(
    [{ text: `This Bill of Sale ("Bill of Sale") is entered into as of ${effTxt}, by and between:` }],
    10,
    14.5,
    { spaceBefore: 4, spaceAfter: 2 },
  );
  L.gap(6);

  const partyLabelW = 1.0 * 72;
  const partyValueW = 5.0 * 72;
  const partyRows: { label: string; segs: Seg[] }[] = [];
  for (const [label, name] of [
    ["SELLER", data.sellerName],
    ["BUYER", data.buyerName],
  ] as const) {
    partyRows.push({
      label,
      segs: isPending(name)
        ? [{ text: `[${label} NAME PENDING]`, bold: true, oblique: true, color: PENDING_TEXT }]
        : [
            { text: `${name},`, bold: true },
            { text: `an individual (“${label[0]}${label.slice(1).toLowerCase()}”)` },
          ],
    });
  }
  partyRows.push({
    label: "COMPANY",
    segs: [
      { text: `${companyFull},`, bold: true },
      { text: "a limited liability company (“Company”)" },
    ],
  });
  for (const row of partyRows) {
    const h = Math.max(
      L.measureParagraph([{ text: row.label, bold: true }], 9.5, 13, partyLabelW),
      L.measureParagraph(row.segs, 9.5, 13, partyValueW - 6),
    ) + 6;
    L.ensure(h);
    const top = L.y + 3;
    L.drawParagraphAt(MARGIN, top, [{ text: row.label, bold: true, color: NAVY }], 9.5, 13, partyLabelW);
    L.drawParagraphAt(MARGIN + partyLabelW, top, row.segs, 9.5, 13, partyValueW - 6);
    L.y += h;
  }
  L.gap(12);
  L.ensure(2);
  L.lineH(MARGIN, PAGE_W - MARGIN, L.y, 0.75, BORDER);
  L.gap(10);

  const sectionGap = 12;

  // Helper to keep a section header + content block together.
  function section(num: string, title: string, contentHeight: number, draw: () => void) {
    L.ensure(sectionHeaderHeight() + 4 + contentHeight);
    drawSectionHeader(L, num, title);
    L.gap(4);
    draw();
    L.gap(sectionGap);
  }

  // 1. Sale of Membership Interest
  const s1 = [
    { text: "Seller hereby sells, transfers, assigns, and conveys to Buyer" },
    { text: interest, bold: true },
    { text: "in the Company, representing all outstanding membership interest of the Company." },
  ];
  section("1", "SALE OF MEMBERSHIP INTEREST", L.measureParagraph(s1, 10, 14.5, CONTENT_W) + 6, () => {
    L.paragraph(s1, 10, 14.5, { spaceBefore: 4, spaceAfter: 2 });
  });

  // 2. Purchase Price
  const priceRowH = CELL_LEADING + 2 * CELL_PAD_Y;
  section("2", "PURCHASE PRICE", priceRowH * 2, () => {
    const x = MARGIN;
    const c1 = 3.5 * 72;
    const c2 = 2.5 * 72;
    const top = L.y;
    L.rect(x, top, c1 + c2, priceRowH, NAVY);
    L.drawParagraphAt(x + CELL_PAD_X, top + CELL_PAD_Y, [{ text: "Payment", bold: true, color: WHITE }], 9.5, 12, c1);
    L.drawParagraphAt(x + c1 + CELL_PAD_X, top + CELL_PAD_Y, [{ text: "Amount", bold: true, color: WHITE }], 9.5, 12, c2);
    const row2 = top + priceRowH;
    L.rect(x, row2, c1, priceRowH, ACCENT_LIGHT);
    const pending = isPending(data.purchasePrice);
    if (pending) L.rect(x + c1, row2, c2, priceRowH, PENDING_BG);
    L.drawParagraphAt(x + CELL_PAD_X, row2 + CELL_PAD_Y, [{ text: "TOTAL PURCHASE PRICE", bold: true, color: NAVY }], 9.5, CELL_LEADING, c1);
    L.drawParagraphAt(
      x + c1 + CELL_PAD_X,
      row2 + CELL_PAD_Y,
      pending
        ? [{ text: "[PRICE PENDING]", bold: true, oblique: true, color: PENDING_TEXT }]
        : [{ text: data.purchasePrice! }],
      9.5,
      CELL_LEADING,
      c2,
    );
    const bottom = row2 + priceRowH;
    L.lineH(x, x + c1 + c2, top, 0.75, BORDER);
    L.lineH(x, x + c1 + c2, row2, 0.75, BORDER);
    L.lineH(x, x + c1 + c2, bottom, 0.75, BORDER);
    L.lineV(x, top, priceRowH * 2, 0.75, BORDER);
    L.lineV(x + c1, top, priceRowH * 2, 0.75, BORDER);
    L.lineV(x + c1 + c2, top, priceRowH * 2, 0.75, BORDER);
    L.y = bottom;
  });

  // 3. Payment Terms
  const priceInline = !isPending(data.purchasePrice) ? data.purchasePrice! : "[PRICE PENDING]";
  const s3 = [
    { text: "The full purchase price of" },
    { text: priceInline, bold: true },
    {
      text:
        "shall be paid by Buyer to Seller after all Company documents have been delivered and " +
        "all Company access (including but not limited to FMCSA portal, MC authority, email, " +
        "phone number, and any other relevant accounts) has been transferred to and confirmed " +
        "received by Buyer.",
    },
  ];
  section("3", "PAYMENT TERMS", L.measureParagraph(s3, 10, 14.5, CONTENT_W) + 6, () => {
    L.paragraph(s3, 10, 14.5, { spaceBefore: 4, spaceAfter: 2 });
  });

  // 4. Company Information
  const companyRows: InfoRow[] = [
    { label: "Legal Name", value: companyFull },
    { label: "Address", value: data.companyAddress },
    { label: "Phone", value: data.companyPhone },
    { label: "MC Authority #", value: data.mcNumber },
    { label: "USDOT #", value: data.usdotNumber },
    { label: "Interest Transferred", value: interest },
  ];
  section("4", "COMPANY INFORMATION", measureInfoTable(L, companyRows, 1.7 * 72, 4.3 * 72), () => {
    drawInfoTable(L, companyRows);
  });

  // 5. Buyer Information
  const buyerRows: InfoRow[] = [
    { label: "Legal Name", value: data.buyerName },
    { label: "Address", value: data.buyerAddress },
  ];
  section("5", "BUYER INFORMATION", measureInfoTable(L, buyerRows, 1.7 * 72, 4.3 * 72), () => {
    drawInfoTable(L, buyerRows);
  });

  // 6. Seller's Deliverables
  const deliverables = data.deliverables?.length ? data.deliverables : DEFAULT_DELIVERABLES;
  const bulletW = TABLE_W - 20;
  const introSegs = [{ text: "As part of this sale, Seller shall deliver the following to Buyer:" }];
  let s6h = L.measureParagraph(introSegs, 10, 14.5, CONTENT_W) + 6 + 3;
  for (const item of deliverables) {
    s6h += L.measureParagraph([{ text: `• ${item}` }], 10, 14.5, bulletW) + 3;
  }
  section("6", "SELLER'S DELIVERABLES", s6h, () => {
    L.paragraph(introSegs, 10, 14.5, { spaceBefore: 4, spaceAfter: 2 });
    L.gap(3);
    for (const item of deliverables) {
      L.y += L.drawParagraphAt(MARGIN + 20, L.y, [{ text: `• ${item}` }], 10, 14.5, bulletW) + 3;
    }
  });

  // 7. Financial Responsibility Before Closing
  const s7a = [
    {
      text:
        "Seller warrants that at Closing, the Company shall be free and clear of all debts, " +
        "taxes, tolls, tickets, penalties, violations, loans, insurance balances, and other liabilities.",
    },
  ];
  const s7b = [
    {
      text:
        "All payments, debts, obligations, fines, taxes, tolls, tickets, insurance balances, " +
        "and any other financial liabilities incurred or arising before the date of Closing are " +
        "solely the responsibility of the Seller (previous owner). Buyer assumes no liability " +
        "for any such obligations that predate the Closing date.",
      bold: true,
    },
  ];
  const s7h =
    L.measureParagraph(s7a, 10, 14.5, CONTENT_W) + 6 +
    L.measureParagraph(s7b, 10, 14.5, CONTENT_W) + 6;
  section("7", "FINANCIAL RESPONSIBILITY BEFORE CLOSING", s7h, () => {
    L.paragraph(s7a, 10, 14.5, { spaceBefore: 4, spaceAfter: 2 });
    L.paragraph(s7b, 10, 14.5, { spaceBefore: 4, spaceAfter: 2 });
  });

  // 8. Governing Law
  const s8 = [
    {
      text:
        "This Bill of Sale shall be governed by and construed in accordance with the applicable " +
        "laws of the State in which the Company operates.",
    },
  ];
  section("8", "GOVERNING LAW", L.measureParagraph(s8, 10, 14.5, CONTENT_W) + 6, () => {
    L.paragraph(s8, 10, 14.5, { spaceBefore: 4, spaceAfter: 2 });
  });

  L.gap(6);
  L.ensure(2);
  L.lineH(MARGIN, PAGE_W - MARGIN, L.y, 0.75, BORDER);
  L.gap(14);

  // Signatures
  const sigIntro = [
    { text: "By signing below, the parties agree to the terms and conditions set forth in this Bill of Sale." },
  ];
  const colW = 3.0 * 72;
  const sigBlockH =
    sectionHeaderHeight() + 4 +
    L.measureParagraph(sigIntro, 10, 14.5, CONTENT_W) + 6 + 16 +
    13 + 4 + 30 + 4 + 14 + 4 + 14 + 10 + 14;
  L.ensure(sigBlockH);
  drawSectionHeader(L, "S", "SIGNATURES");
  L.gap(4);
  L.paragraph(sigIntro, 10, 14.5, { spaceBefore: 4, spaceAfter: 2 });
  L.gap(16);

  const sellerX = MARGIN;
  const buyerX = MARGIN + colW;
  L.drawParagraphAt(sellerX, L.y, [{ text: "SELLER", bold: true, color: NAVY }], 9.5, 13, colW);
  L.drawParagraphAt(buyerX, L.y, [{ text: "BUYER", bold: true, color: NAVY }], 9.5, 13, colW);
  L.gap(13 + 4);
  const sigLineTop = L.y + 30; // 30pt of open space to sign in
  const sigLineW = colW - 20;
  L.lineH(sellerX, sellerX + sigLineW, sigLineTop, 0.9, TEXT);
  L.lineH(buyerX, buyerX + sigLineW, sigLineTop, 0.9, TEXT);

  // Optional fillable buyer signature field sitting on the open space.
  if (data.fillableBuyerFields) {
    const form = doc.getForm();
    const sig = form.createTextField("buyer_signature");
    sig.addToPage(L.page, {
      x: buyerX,
      y: PAGE_H - sigLineTop + 2,
      width: sigLineW,
      height: 26,
      borderWidth: 0,
    });
    sig.setFontSize(12);
  }

  L.y = sigLineTop + 6;
  const sellerNameSegs: Seg[] = isPending(data.sellerName)
    ? [{ text: "[NAME PENDING]", bold: true, oblique: true, color: PENDING_TEXT }]
    : [{ text: "Print Name:" }, { text: data.sellerName!, bold: true }];
  const buyerNameSegs: Seg[] = isPending(data.buyerName)
    ? [{ text: "[NAME PENDING]", bold: true, oblique: true, color: PENDING_TEXT }]
    : [{ text: "Print Name:" }, { text: data.buyerName!, bold: true }];
  L.drawParagraphAt(sellerX, L.y, sellerNameSegs, 10, 14, colW - 10);
  L.drawParagraphAt(buyerX, L.y, buyerNameSegs, 10, 14, colW - 10);
  L.gap(14 + 10);

  L.drawParagraphAt(sellerX, L.y, [{ text: "Date: ______________________" }], 10, 14, colW);
  if (data.fillableBuyerFields) {
    L.drawParagraphAt(buyerX, L.y, [{ text: "Date:" }], 10, 14, colW);
    const form = doc.getForm();
    const dateField = form.createTextField("buyer_date");
    dateField.addToPage(L.page, {
      x: buyerX + 30,
      y: PAGE_H - L.y - 14,
      width: 110,
      height: 14,
      borderWidth: 0,
    });
    dateField.setFontSize(10);
  } else {
    L.drawParagraphAt(buyerX, L.y, [{ text: "Date: ______________________" }], 10, 14, colW);
  }
  L.gap(14 + 20);

  // Wire Transfer Instructions
  const wireRows: InfoRow[] = [
    { label: "Bank Name", value: data.wireBankName },
    { label: "Account Name", value: data.wireAccountName },
    { label: "Routing Number", value: data.wireRoutingNumber },
    { label: "Account Number", value: data.wireAccountNumber },
  ];
  const wireH = sectionHeaderHeight() + 4 + measureInfoTable(L, wireRows, 1.7 * 72, 4.3 * 72);
  L.ensure(wireH);
  drawSectionHeader(L, "W", "WIRE TRANSFER INSTRUCTIONS");
  L.gap(4);
  drawInfoTable(L, wireRows);

  if (data.fillableBuyerFields) {
    // Make the fillable fields render with Helvetica everywhere.
    doc.getForm().updateFieldAppearances(fonts.regular);
  }

  drawFooters(doc, fonts, data.companyName);
  return doc.save();
}

// TEMPORARY — Meta ad creative generator. Delete after export.
//
//   /api/adgen?i=<0-11>&size=<4x5|1x1|9x16>
//
// Two-layer model: photo plate underneath, real brand overlay on top. The
// overlay is rendered as type (not baked into the photo) so a headline test
// costs nothing and the logo is always the real file.
import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const ROOT = process.cwd();
const FONTS = path.join(ROOT, "docs/ad-samples/fonts");
const AMBER = "#ff8a1a";
const INK = "#0a0a0b";

const font = (f: string) => fs.readFileSync(path.join(FONTS, f));

// Stock plates live outside the repo so 40MB of JPEG never lands in git.
const PLATES =
  "C:/Users/Nitropc/Desktop/veritor meta ads creatives/source photos (pexels)/_working (generator)";

// JPEG carries its dimensions in a SOF marker whose position varies, so the
// segment chain has to be walked. (PNG just has them at a fixed offset.)
function jpegSize(b: Buffer) {
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const m = b[i + 1];
    // SOF0..SOF15, excluding the non-frame markers DHT/JPG/DAC
    if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) {
      return { h: b.readUInt16BE(i + 5), w: b.readUInt16BE(i + 7) };
    }
    if (m === 0xd8 || m === 0xd9 || (m >= 0xd0 && m <= 0xd7)) {
      i += 2;
      continue;
    }
    i += 2 + b.readUInt16BE(i + 2);
  }
  throw new Error("no JPEG SOF marker");
}

function img(p: string) {
  const abs = path.isAbsolute(p) ? p : path.join(ROOT, p);
  const b = fs.readFileSync(abs);
  const isPng = abs.toLowerCase().endsWith(".png");
  const { w, h } = isPng
    ? { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }
    : jpegSize(b);
  return {
    uri: `data:image/${isPng ? "png" : "jpeg"};base64,${b.toString("base64")}`,
    w,
    h,
  };
}

// cinematic/split/statement are the round-one editorial layouts.
// poster/band are direct-response layouts: the question does the targeting,
// so the type is large and the photo is demoted to supporting evidence.
type Template = "cinematic" | "split" | "statement" | "poster" | "band";

type Creative = {
  id: string;
  lang: "en" | "es" | "ru";
  photo: string;
  focal: [number, number];
  // Normalised [x0,y0,x1,y1] sub-rectangle of the source, applied before the
  // cover fit. Used to keep third-party carrier livery out of frame.
  crop?: [number, number, number, number];
  template: Template;
  eyebrow: string;
  h1: string;
  h2?: string;
  sub?: string;
  list?: string[];
  cta: string;
  trust: string[];
  hScale?: number;
  // "band" only: the solid amber qualifier strip. This is the line that stops
  // people disqualifying themselves, so it gets its own block of colour.
  band?: string;
};

const TRUST_EN = [
  "400+ sales closed",
  "3–5 day close",
  "No commission",
  "Nationwide US",
];

const CREATIVES: Creative[] = [
  {
    id: "01_relay-contract",
    lang: "en",
    photo: "visuals/hero1.png",
    focal: [0.58, 0.45],
    template: "cinematic",
    eyebrow: "AMAZON RELAY CARRIERS",
    h1: "Your Relay contract",
    h2: "outweighs your trucks.",
    sub: "It's the single biggest thing that moves your number — more than fleet size or age of authority.",
    cta: "Get your free valuation →",
    trust: TRUST_EN,
  },
  {
    id: "02_close-3-5-days",
    lang: "en",
    photo: "visuals/handshake-keys.png",
    focal: [0.5, 0.4],
    template: "cinematic",
    eyebrow: "US LOGISTICS LLC ACQUISITIONS",
    h1: "Sell your trucking LLC.",
    h2: "Closed in 3–5 days.",
    sub: "Written offer. Wire through attorney escrow — at your bank or online.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.88,
  },
  {
    id: "03_written-agreement",
    lang: "en",
    photo: "visuals/founder-context.png",
    focal: [0.55, 0.4],
    template: "split",
    eyebrow: "HOW WE CLOSE",
    h1: "Written agreement.",
    h2: "Never a handshake.",
    sub: "Funds move through attorney escrow and release on signature. Sign at your bank or online.",
    cta: "See how we close →",
    trust: TRUST_EN,
  },
  {
    id: "04_what-is-mc-worth",
    lang: "en",
    photo: "visuals/hero2.png",
    focal: [0.36, 0.55],
    template: "cinematic",
    eyebrow: "FREE FMCSA LOOKUP",
    h1: "What is your MC",
    h2: "number worth?",
    sub: "Enter your MC or DOT. Indicative range in 60 seconds. No signup, no obligation.",
    cta: "Check your company →",
    trust: TRUST_EN,
  },
  {
    id: "05_still-sellable",
    lang: "en",
    photo: "visuals/document-table.png",
    focal: [0.68, 0.5],
    template: "split",
    eyebrow: "AMAZON RELAY CARRIERS",
    h1: "Lapsed insurance?",
    h2: "Still sellable.",
    sub: "Coverage gets re-bound at closing — a lapse doesn't disqualify you. A loan on the truck is paid off in the wire.",
    cta: "Ask about your case →",
    trust: TRUST_EN,
  },
  {
    id: "06_bank-close",
    lang: "en",
    photo: "visuals/handshake-keys.png",
    focal: [0.5, 0.82],
    template: "split",
    eyebrow: "HOW WE CLOSE",
    h1: "Money first.",
    h2: "Then the keys.",
    sub: "Escrow releases on signature, so the funds land as you sign — at your bank or online, your call.",
    cta: "See the process →",
    trust: TRUST_EN,
  },
  {
    id: "07_dont-dissolve-it",
    lang: "en",
    photo: "visuals/default-cover.png",
    focal: [0.5, 0.52],
    template: "cinematic",
    eyebrow: "THINKING OF LETTING IT LAPSE?",
    h1: "Don't dissolve it.",
    h2: "Sell it.",
    sub: "A dormant MC with clean history still carries real value. Find out what yours is worth.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
  },
  {
    id: "08_confidential",
    lang: "en",
    photo: "visuals/founder-context.png",
    focal: [0.5, 0.62],
    template: "cinematic",
    eyebrow: "CONFIDENTIAL BY DEFAULT",
    h1: "Your drivers",
    h2: "hear it from you.",
    sub: "NDA first. Freight brokers and Amazon are notified only when you decide they are.",
    cta: "How it works →",
    trust: TRUST_EN,
  },
  {
    id: "09_what-transfers",
    lang: "en",
    photo: "visuals/document-table.png",
    focal: [0.55, 0.45],
    template: "statement",
    eyebrow: "WHAT ACTUALLY TRANSFERS",
    h1: "The whole entity.",
    h2: "Not just the paper.",
    list: [
      "MC authority + DOT record",
      "EIN, bank account, company phone",
      "Freight broker setups, IFTA, IRP, consortium",
    ],
    cta: "See the full list →",
    trust: TRUST_EN,
  },
  {
    id: "10_track-record",
    lang: "en",
    photo: "visuals/hero1.png",
    focal: [0.3, 0.5],
    template: "split",
    eyebrow: "TRACK RECORD",
    h1: "400+ sales closed.",
    h2: "Every one in person.",
    sub: "Built by drivers. Based in Dayton, Ohio. Closing nationwide.",
    cta: "Why sellers choose us →",
    trust: TRUST_EN,
    hScale: 0.9,
  },
  {
    id: "11_es_speed",
    lang: "es",
    photo: "visuals/hero2.png",
    focal: [0.52, 0.58],
    template: "cinematic",
    eyebrow: "ADQUISICIÓN DE LLC DE LOGÍSTICA",
    h1: "Venda su LLC",
    h2: "de transporte.",
    sub: "Oferta por escrito. Cerramos en persona en su banco, por transferencia, en 3–5 días hábiles.",
    cta: "Valuación gratis →",
    trust: ["400+ LLC cerradas", "Cierre en 3–5 días", "Gestión directa", "Alcance nacional"],
  },
  {
    id: "12_ru_relay",
    lang: "ru",
    photo: "visuals/default-cover.png",
    focal: [0.82, 0.58],
    template: "cinematic",
    eyebrow: "ПОКУПКА ЛОГИСТИЧЕСКИХ LLC В США",
    h1: "Продайте свою",
    h2: "транспортную LLC.",
    sub: "Включая компании с активным контрактом Amazon Relay. Закрытие за 3–5 рабочих дней.",
    cta: "Бесплатная оценка →",
    trust: ["400+ сделок закрыто", "3–5 рабочих дней", "Прямая работа", "По всей стране"],
    hScale: 0.86,
  },

  // ── Round 2 (indices 12–26): Pexels plates. Same overlay system, new
  // photography and several angles the first twelve never covered.
  {
    id: "13_selling-authority",
    lang: "en",
    photo: `${PLATES}/04_red-conventional-rain.jpg`,
    focal: [0.35, 0.55],
    template: "cinematic",
    eyebrow: "AMAZON RELAY CARRIERS",
    h1: "You're not selling trucks.",
    h2: "You're selling the company.",
    sub: "The MC, the DOT record, an active Relay contract — that's the asset a buyer is actually pricing. Trucks are just equipment.",
    cta: "See what it's worth →",
    trust: TRUST_EN,
    hScale: 0.72,
  },
  {
    id: "14_open-road-close",
    lang: "en",
    photo: `${PLATES}/02_lone-rig-open-road.jpg`,
    focal: [0.32, 0.62],
    template: "cinematic",
    eyebrow: "US LOGISTICS LLC ACQUISITIONS",
    h1: "Sell your trucking LLC.",
    h2: "Closed in 3–5 days.",
    sub: "Written offer. Wire through attorney escrow — at your bank or online.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.88,
  },
  {
    id: "15_mc-worth-w900",
    lang: "en",
    photo: `${PLATES}/03_w900-reefer-parked.jpg`,
    crop: [0.05, 0.35, 0.75, 1.0],
    focal: [0.45, 0.5],
    template: "cinematic",
    eyebrow: "FREE FMCSA LOOKUP",
    h1: "What is your MC",
    h2: "number worth?",
    sub: "Enter your MC or DOT. Indicative range in 60 seconds. No signup, no obligation.",
    cta: "Check your company →",
    trust: TRUST_EN,
  },
  {
    id: "16_track-record-fleet",
    lang: "en",
    photo: `${PLATES}/01_kenworth-row-goldenhour.jpg`,
    focal: [0.48, 0.62],
    template: "cinematic",
    eyebrow: "TRACK RECORD",
    h1: "400+ sales closed.",
    h2: "Every one in person.",
    sub: "Built by drivers. Based in Dayton, Ohio. Closing nationwide.",
    cta: "Why sellers choose us →",
    trust: TRUST_EN,
    hScale: 0.9,
  },
  {
    id: "17_dont-dissolve-vintage",
    lang: "en",
    photo: `${PLATES}/05_vintage-peterbilt.jpg`,
    crop: [0.08, 0.32, 1.0, 0.82],
    focal: [0.5, 0.5],
    template: "cinematic",
    eyebrow: "THINKING OF LETTING IT LAPSE?",
    h1: "Don't dissolve it.",
    h2: "Sell it.",
    sub: "A dormant MC with clean history still carries real value. Find out what yours is worth.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
  },
  {
    id: "18_done-with-the-road",
    lang: "en",
    photo: `${PLATES}/11_senior-hand-document.jpg`,
    focal: [0.6, 0.5],
    template: "split",
    eyebrow: "PLANNING YOUR EXIT",
    h1: "Done with the road?",
    h2: "Don't just walk away.",
    sub: "Letting the authority lapse throws away the one thing a buyer actually wants. Sell the entity instead.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.9,
  },
  {
    id: "19_confidential-silhouette",
    lang: "en",
    photo: `${PLATES}/06_driver-silhouette-bw.jpg`,
    crop: [0.0, 0.0, 1.0, 0.72],
    focal: [0.24, 0.5],
    template: "cinematic",
    eyebrow: "CONFIDENTIAL BY DEFAULT",
    h1: "Your drivers",
    h2: "hear it from you.",
    sub: "NDA first. Freight brokers and Amazon are notified only when you decide they are.",
    cta: "How it works →",
    trust: TRUST_EN,
  },
  {
    id: "20_what-transfers-keys",
    lang: "en",
    photo: `${PLATES}/07_key-handover-contract.jpg`,
    focal: [0.5, 0.95],
    template: "cinematic",
    eyebrow: "WHAT ACTUALLY TRANSFERS",
    h1: "The whole entity.",
    h2: "Not just the paper.",
    list: [
      "MC authority + DOT record",
      "EIN, bank account, company phone",
      "Freight broker setups, IFTA, IRP, consortium",
    ],
    cta: "See the full list →",
    trust: TRUST_EN,
  },
  {
    id: "21_bank-close-handshake",
    lang: "en",
    photo: `${PLATES}/08_handshake-documents.jpg`,
    focal: [0.5, 0.48],
    template: "split",
    eyebrow: "HOW WE CLOSE",
    h1: "Money first.",
    h2: "Then the keys.",
    sub: "Escrow releases on signature, so the funds land as you sign — at your bank or online, your call.",
    cta: "See the process →",
    trust: TRUST_EN,
  },
  {
    id: "22_written-agreement-light",
    lang: "en",
    photo: `${PLATES}/09_key-handover-light.jpg`,
    focal: [0.5, 0.45],
    template: "cinematic",
    eyebrow: "HOW WE CLOSE",
    h1: "Written agreement.",
    h2: "Never a handshake.",
    sub: "Funds move through attorney escrow and release on signature. Sign at your bank or online.",
    cta: "See how we close →",
    trust: TRUST_EN,
  },
  {
    id: "23_still-sellable-denim",
    lang: "en",
    photo: `${PLATES}/10_handshake-laptop-denim.jpg`,
    focal: [0.55, 0.5],
    template: "split",
    eyebrow: "AMAZON RELAY CARRIERS",
    h1: "Lapsed insurance?",
    h2: "Still sellable.",
    sub: "Coverage gets re-bound at closing — a lapse doesn't disqualify you. A loan on the truck is paid off in the wire.",
    cta: "Ask about your case →",
    trust: TRUST_EN,
  },
  {
    id: "24_nationwide-bw",
    lang: "en",
    photo: `${PLATES}/14_CROP-truck-row-bw.jpg`,
    // Left third only — keeps competing carrier livery out of frame.
    crop: [0.0, 0.2, 0.44, 1.0],
    focal: [0.55, 0.55],
    template: "cinematic",
    eyebrow: "COAST TO COAST",
    h1: "One deal.",
    h2: "Every state.",
    sub: "Closing comes to you — in person, at your own bank, wherever the LLC is registered.",
    cta: "Start with your MC →",
    trust: TRUST_EN,
  },
  {
    id: "25_know-your-number",
    lang: "en",
    photo: `${PLATES}/15_CROP-bridge-rig-washington.jpg`,
    // Tight on the tractor; drops the trailer graphic.
    crop: [0.08, 0.0, 0.42, 1.0],
    focal: [0.42, 0.6],
    template: "cinematic",
    eyebrow: "FREE FMCSA VALUATION",
    h1: "Know your number",
    h2: "before you talk to anyone.",
    sub: "Sixty seconds, no signup. Walk into any conversation already knowing what you hold.",
    cta: "Check your company →",
    trust: TRUST_EN,
    hScale: 0.76,
  },
  {
    id: "26_es_signature",
    lang: "es",
    photo: `${PLATES}/12_fountain-pen-signature.jpg`,
    focal: [0.5, 0.45],
    template: "cinematic",
    eyebrow: "ADQUISICIÓN DE LLC DE LOGÍSTICA",
    h1: "Venda su LLC",
    h2: "de transporte.",
    sub: "Oferta por escrito. Cerramos en persona en su banco, por transferencia, en 3–5 días hábiles.",
    cta: "Valuación gratis →",
    trust: ["400+ LLC cerradas", "Cierre en 3–5 días", "Gestión directa", "Alcance nacional"],
  },
  {
    id: "27_ru_signature",
    lang: "ru",
    photo: `${PLATES}/13_signature-line.jpg`,
    focal: [0.45, 0.5],
    template: "cinematic",
    eyebrow: "ПОКУПКА ЛОГИСТИЧЕСКИХ LLC В США",
    h1: "Продайте свою",
    h2: "транспортную LLC.",
    sub: "Включая компании с активным контрактом Amazon Relay. Закрытие за 3–5 рабочих дней.",
    cta: "Бесплатная оценка →",
    trust: ["400+ сделок закрыто", "3–5 рабочих дней", "Прямая работа", "По всей стране"],
    hScale: 0.86,
  },

  // ── Round 3 (indices 27–38): direct response.
  // The creative has to do the targeting — Meta has no "owner-operator" or
  // "Amazon Relay" audience worth buying. So every headline is a question a
  // trucking-company owner answers "yes" to in under a second, and every ad
  // carries the qualifier that stops people ruling themselves out.
  {
    id: "28_selling-your-company",
    lang: "en",
    photo: `${PLATES}/16_owner-flannel-green.jpg`,
    focal: [0.45, 0.42],
    template: "poster",
    eyebrow: "US TRUCKING LLC ACQUISITIONS",
    h1: "Selling your trucking company?",
    sub: "Amazon Relay or not, you get a written offer in 24 hours and the wire lands at your bank in 3–5 days.",
    cta: "Free valuation →",
    trust: TRUST_EN,
    hScale: 0.86,
  },
  {
    id: "29_relay-or-not",
    lang: "en",
    photo: `${PLATES}/04_red-conventional-rain.jpg`,
    focal: [0.35, 0.55],
    template: "band",
    band: "WRITTEN OFFER IN 24 HOURS",
    eyebrow: "US TRUCKING LLC ACQUISITIONS",
    h1: "Amazon Relay",
    h2: "or not.",
    sub: "Either way, get a written offer in 24 hours. Clean authority and active insurance are what we check first.",
    cta: "See what yours is worth →",
    trust: TRUST_EN,
  },
  {
    id: "30_own-a-trucking-llc",
    lang: "en",
    photo: `${PLATES}/18_owner-woman-peterbilt.jpg`,
    focal: [0.5, 0.4],
    template: "poster",
    eyebrow: "FREE FMCSA LOOKUP",
    h1: "Own a trucking LLC?",
    sub: "Find out what it's worth in 60 seconds. Enter your MC or DOT number. No signup, no obligation, no pushy calls.",
    cta: "Check your number →",
    trust: TRUST_EN,
  },
  {
    id: "31_thinking-of-closing",
    lang: "en",
    photo: `${PLATES}/19_kitchen-decision.jpg`,
    focal: [0.45, 0.45],
    template: "poster",
    eyebrow: "BEFORE YOU FILE DISSOLUTION",
    h1: "Thinking of closing your trucking company?",
    sub: "Sell it instead. The authority, the DOT record and the history are worth money to a buyer — and worth nothing once it's dissolved.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.74,
  },
  {
    id: "32_mc-not-using",
    lang: "en",
    photo: `${PLATES}/05_vintage-peterbilt.jpg`,
    crop: [0.08, 0.32, 1.0, 0.82],
    focal: [0.5, 0.5],
    template: "band",
    band: "IT'S STILL WORTH MONEY",
    eyebrow: "DORMANT AUTHORITY",
    h1: "Have an MC",
    h2: "you're not using?",
    sub: "A clean MC that's sitting idle still has a buyer. Find out what yours is worth before you let it lapse.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
  },
  {
    id: "33_dormant-vs-dissolved",
    lang: "en",
    photo: `${PLATES}/22_blank-paper-pen.jpg`,
    focal: [0.5, 0.55],
    template: "poster",
    eyebrow: "THE ONE DEADLINE THAT MATTERS",
    h1: "A dormant MC still has a buyer.",
    h2: "A dissolved one doesn't.",
    sub: "Sell the entity while the authority is still live. Written offer in 24 hours.",
    cta: "Check your number →",
    trust: TRUST_EN,
    hScale: 0.76,
  },
  {
    id: "34_written-offer-24h",
    lang: "en",
    photo: `${PLATES}/07_key-handover-contract.jpg`,
    focal: [0.5, 0.95],
    template: "band",
    band: "AMAZON RELAY OR NOT",
    eyebrow: "NO OBLIGATION",
    h1: "Get a written offer",
    h2: "in 24 hours.",
    sub: "Send your MC or DOT number. We come back with a real number in writing — not a range, not a callback.",
    cta: "Start now →",
    trust: TRUST_EN,
  },
  {
    id: "35_selling-your-trucking-company",
    lang: "en",
    photo: `${PLATES}/23_shop-grille-red.jpg`,
    focal: [0.62, 0.5],
    template: "poster",
    eyebrow: "US TRUCKING LLC ACQUISITIONS",
    h1: "Ready to sell your trucking company?",
    sub: "Written offer in 24 hours. 400+ sales closed — funds move through attorney escrow, wire at your own bank.",
    cta: "Get your offer →",
    trust: TRUST_EN,
    hScale: 0.84,
  },
  {
    id: "36_lapsed-still-sellable",
    lang: "en",
    photo: `${PLATES}/24_shop-two-men.jpg`,
    focal: [0.45, 0.5],
    template: "band",
    band: "STILL SELLABLE",
    eyebrow: "AMAZON RELAY CARRIERS",
    h1: "Insurance lapsed?",
    h2: "Loan on the truck?",
    sub: "If you're running an active Relay contract, a coverage lapse won't disqualify you — it gets re-bound at closing. A loan on the truck is paid off in the wire either way.",
    cta: "Ask about your case →",
    trust: TRUST_EN,
  },
  {
    id: "37_get-out-of-trucking",
    lang: "en",
    photo: `${PLATES}/20_kitchen-couple.jpg`,
    focal: [0.5, 0.42],
    template: "poster",
    eyebrow: "PLANNING YOUR EXIT",
    h1: "Ready to get out of trucking?",
    sub: "Don't just let the authority lapse. Sell the entity — MC, DOT record and history included. Written offer in 24 hours.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.84,
  },
  {
    id: "38_es_direct",
    lang: "es",
    photo: `${PLATES}/17_owner-portrait.jpg`,
    focal: [0.5, 0.4],
    template: "poster",
    eyebrow: "ADQUISICIÓN DE LLC DE TRANSPORTE",
    h1: "¿Vende su compañía de transporte?",
    sub: "Con o sin contrato de Amazon Relay. Oferta por escrito en 24 horas y cierre en persona en su banco en 3–5 días hábiles.",
    cta: "Valuación gratis →",
    trust: ["400+ LLC cerradas", "Cierre en 3–5 días", "Gestión directa", "Alcance nacional"],
    hScale: 0.74,
  },
  {
    id: "39_ru_direct",
    lang: "ru",
    photo: `${PLATES}/21_kitchen-young-man.jpg`,
    focal: [0.45, 0.4],
    template: "poster",
    eyebrow: "ПОКУПКА ТРАНСПОРТНЫХ LLC В США",
    h1: "Продаёте транспортную компанию?",
    sub: "С контрактом Amazon Relay или без него. Письменное предложение за 24 часа, закрытие в вашем банке за 3–5 рабочих дней.",
    cta: "Бесплатная оценка →",
    trust: ["400+ сделок закрыто", "3–5 рабочих дней", "Прямая работа", "По всей стране"],
    hScale: 0.7,
  },

  // ── Round 4 (indices 39–63): more direct response, new triggers.
  // Round 3 asked "are you selling?". Round 4 names the *situation* the owner
  // is actually in — trucks parked, renewal due, nobody to take it over — so
  // recognition happens before the reader has decided to read an ad.
  //
  // Two policy rules shaped this copy and must survive any rewrite:
  //   1. No age or retirement framing. Meta treats implied personal attributes
  //      as an automatic rejection, so "winding down" replaces "retiring".
  //   2. No "are you in debt" framing. Where the trigger is a truck loan, the
  //      ad states what *we* accept rather than what the reader owes.
  {
    id: "40_trucks-sitting",
    lang: "en",
    photo: `${PLATES}/27_classic-row-five.jpg`,
    focal: [0.5, 0.55],
    template: "poster",
    eyebrow: "US TRUCKING LLC ACQUISITIONS",
    h1: "Trucks sitting more than they're running?",
    sub: "Parked equipment still costs you insurance, plates and payments. Sell the company while the authority is still clean — written offer in 24 hours.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.74,
  },
  {
    id: "41_one-truck-counts",
    lang: "en",
    photo: `${PLATES}/26_CROP-pete-green-sky.jpg`,
    // Crops out the "HIGH ROAD" lettering on the trailer rail. Tight on the
    // tractor because "band" only reveals the top third of the photo — a wider
    // crop puts the truck under the scrim and the ad renders as empty sky.
    crop: [0.11, 0.46, 0.49, 0.95],
    focal: [0.5, 0.3],
    template: "band",
    band: "NO FLEET REQUIRED",
    eyebrow: "OWNER-OPERATORS WELCOME",
    h1: "One truck.",
    h2: "Still worth selling.",
    sub: "You don't need a fleet. A single-truck LLC with a clean MC qualifies — most weeks, single-truck sales are the majority of what closes.",
    cta: "See what yours is worth →",
    trust: TRUST_EN,
  },
  {
    id: "42_insurance-renewal",
    lang: "en",
    photo: `${PLATES}/50_calculator-paid-due.jpg`,
    focal: [0.5, 0.5],
    template: "poster",
    eyebrow: "BEFORE YOU RENEW",
    h1: "Insurance renewal coming up?",
    sub: "That's the moment most owners decide. Get a written offer first — it takes 24 hours, and it costs you nothing to know the number before you sign for another year.",
    cta: "Get your number →",
    trust: TRUST_EN,
    hScale: 0.78,
  },
  {
    id: "43_loan-on-the-truck",
    lang: "en",
    photo: `${PLATES}/40_owner-wheel-repair.jpg`,
    focal: [0.5, 0.5],
    template: "band",
    band: "WE HANDLE THE PAYOFF",
    eyebrow: "FINANCED EQUIPMENT",
    h1: "A loan on the truck",
    h2: "doesn't stop the sale.",
    sub: "Equipment financing, a lien, an unpaid ELD contract — all of it gets handled at closing. It changes the number, not the answer.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
  },
  {
    id: "44_whats-your-mc-worth",
    lang: "en",
    photo: `${PLATES}/34_CROP-four-tankers.jpg`,
    // Crops out a background facility sign carrying a real company name.
    crop: [0.25, 0.55, 1.0, 1.0],
    focal: [0.5, 0.5],
    template: "poster",
    eyebrow: "FREE FMCSA LOOKUP",
    h1: "What is your MC number worth?",
    sub: "Age of authority, safety record, operating history and contracts all carry a price. Enter your MC or DOT and see the range in 60 seconds.",
    cta: "Check your number →",
    trust: TRUST_EN,
    hScale: 0.78,
  },
  {
    id: "45_winding-down",
    lang: "en",
    photo: `${PLATES}/42_senior-reading-paper.jpg`,
    focal: [0.45, 0.28],
    template: "poster",
    eyebrow: "PLANNING YOUR EXIT",
    h1: "Winding the business down?",
    sub: "There's a version of that where you get paid for it. The authority, the DOT record and the operating history are all worth money — until the day you dissolve.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.8,
  },
  {
    id: "46_no-one-to-take-over",
    lang: "en",
    photo: `${PLATES}/43_senior-desk-glasses.jpg`,
    focal: [0.5, 0.45],
    template: "poster",
    eyebrow: "SUCCESSION",
    h1: "Nobody to take the business over?",
    sub: "You built the authority, the record and the relationships. A sale turns all of it into money instead of paperwork you eventually file to close.",
    cta: "See what it's worth →",
    trust: TRUST_EN,
    hScale: 0.76,
  },
  {
    id: "47_talked-about-selling",
    lang: "en",
    photo: `${PLATES}/44_senior-couple-calculator.jpg`,
    focal: [0.5, 0.3],
    template: "poster",
    eyebrow: "STILL THINKING ABOUT IT?",
    h1: "Been talking about selling for a year?",
    sub: "Start with the number. A written offer takes 24 hours, commits you to nothing, and makes the conversation at your kitchen table a lot shorter.",
    cta: "Get the number →",
    trust: TRUST_EN,
    hScale: 0.74,
  },
  {
    id: "48_sold-trucks-kept-mc",
    lang: "en",
    photo: `${PLATES}/39_owner-rusted-truck.jpg`,
    focal: [0.55, 0.4],
    template: "band",
    band: "THE AUTHORITY IS THE ASSET",
    eyebrow: "NO EQUIPMENT? NO PROBLEM",
    h1: "Sold the trucks.",
    h2: "Still have the MC?",
    sub: "The equipment was never the valuable part. A clean authority with operating history still belongs to a company worth selling — plenty of deals close with no trucks attached.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
  },
  {
    id: "49_repairs-cost-more",
    lang: "en",
    photo: `${PLATES}/41_garage-looking-up.jpg`,
    focal: [0.4, 0.5],
    template: "poster",
    eyebrow: "RUNNING COSTS",
    h1: "Repairs costing more than the loads pay?",
    sub: "That's usually the year owners decide. Find out what the company is worth before another quarter of maintenance eats the answer.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.72,
  },
  {
    id: "50_no-commission",
    lang: "en",
    photo: `${PLATES}/45_two-people-signing.jpg`,
    focal: [0.5, 0.5],
    template: "band",
    band: "YOU KEEP THE WHOLE NUMBER",
    eyebrow: "NO FEES. NO COMMISSION.",
    h1: "Nothing comes out",
    h2: "of your number.",
    sub: "No fees. No commission. What you accept is what lands in your account, in full.",
    cta: "Get your offer →",
    trust: TRUST_EN,
  },
  {
    id: "51_paid-at-closing",
    lang: "en",
    photo: `${PLATES}/48_counting-cash-desk.jpg`,
    focal: [0.5, 0.5],
    template: "poster",
    eyebrow: "HOW YOU GET PAID",
    h1: "Paid at closing. Not in payments.",
    sub: "No earn-out, no seller financing, no waiting on someone else's cash flow. The full amount wires to you in person, at your own bank, in 3–5 business days.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.76,
  },
  {
    id: "52_number-first",
    lang: "en",
    photo: `${PLATES}/47_charts-calculator.jpg`,
    focal: [0.5, 0.5],
    template: "band",
    band: "COSTS YOU NOTHING TO KNOW",
    eyebrow: "FREE VALUATION",
    h1: "Get the number first.",
    h2: "Decide after.",
    sub: "Most owners have no idea what their authority is worth. Find out in 24 hours, in writing, with no obligation to sell anything.",
    cta: "Get your valuation →",
    trust: TRUST_EN,
  },
  {
    id: "53_one-phone-call",
    lang: "en",
    photo: `${PLATES}/37_owner-phone-call.jpg`,
    focal: [0.42, 0.42],
    template: "poster",
    eyebrow: "ONE CONVERSATION",
    h1: "One call. Then you'll know.",
    sub: "No pitch, no pressure, no salesperson calling you for weeks. One conversation about your MC, your equipment and your contracts — then a number in writing.",
    cta: "Start the conversation →",
    trust: TRUST_EN,
    hScale: 0.82,
  },
  {
    id: "54_read-then-decide",
    lang: "en",
    photo: `${PLATES}/38_owner-reading-doc-cab.jpg`,
    focal: [0.55, 0.45],
    template: "band",
    band: "NO OBLIGATION",
    eyebrow: "WRITTEN OFFER IN 24 HOURS",
    h1: "Read the offer.",
    h2: "Then decide.",
    sub: "You get it in writing, on paper, with the number and the terms spelled out. Take it to your accountant. Take a month. Or throw it away.",
    cta: "Get your offer →",
    trust: TRUST_EN,
  },
  {
    id: "55_sign-once",
    lang: "en",
    photo: `${PLATES}/46_hand-signing-doc.jpg`,
    focal: [0.5, 0.5],
    template: "poster",
    eyebrow: "HOW IT CLOSES",
    h1: "Sign once. It's done.",
    sub: "The agreement, the state filings and the closing are handled for you. You sign, the wire clears through attorney escrow, and the company is no longer your problem.",
    cta: "See how it works →",
    trust: TRUST_EN,
    hScale: 0.84,
  },
  {
    id: "56_done-chasing-loads",
    lang: "en",
    photo: `${PLATES}/28_w900-golden-road.jpg`,
    focal: [0.5, 0.5],
    template: "poster",
    eyebrow: "US TRUCKING LLC ACQUISITIONS",
    h1: "Done chasing loads?",
    sub: "Rates, freight brokers, drivers, DOT audits — there's an exit that pays you for the company instead of leaving you with a dissolution filing.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.88,
  },
  {
    id: "57_hand-over-keys",
    lang: "en",
    photo: `${PLATES}/36_owner-old-green-truck.jpg`,
    focal: [0.45, 0.5],
    template: "band",
    band: "WE CLOSE IN 3–5 DAYS",
    eyebrow: "READY WHEN YOU ARE",
    h1: "Ready to hand",
    h2: "over the keys?",
    sub: "Written offer in 24 hours. Closing in person at your bank inside a week. You walk out with the wire and none of the paperwork.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
  },
  {
    id: "58_before-next-renewal",
    lang: "en",
    photo: `${PLATES}/25_pete-red-autumn.jpg`,
    focal: [0.45, 0.5],
    template: "poster",
    eyebrow: "TIMING MATTERS",
    h1: "Want out before the next renewal?",
    sub: "Then start now. Offer in 24 hours, closing in 3–5 days — comfortably ahead of your insurance, IFTA or UCR coming due again.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.76,
  },
  {
    id: "59_offer-this-week",
    lang: "en",
    photo: `${PLATES}/35_pete-red-garage.jpg`,
    focal: [0.5, 0.5],
    template: "band",
    band: "WIRE IN 3–5 BUSINESS DAYS",
    eyebrow: "NO WAITING AROUND",
    h1: "Offer this week.",
    h2: "Wire the next.",
    sub: "No back-and-forth, no six months of tyre-kickers. A written offer fast, and money in your account inside a week.",
    cta: "Get your offer →",
    trust: TRUST_EN,
  },
  {
    id: "60_two-trucks-or-twenty",
    lang: "en",
    photo: `${PLATES}/32_two-trucks-hay-road.jpg`,
    focal: [0.4, 0.5],
    template: "poster",
    eyebrow: "ANY SIZE",
    h1: "Two trucks or twenty?",
    sub: "Both qualify. Single owner-operator LLCs and small fleets, with or without an Amazon Relay contract, anywhere in the United States.",
    cta: "Get a free valuation →",
    trust: TRUST_EN,
    hScale: 0.86,
  },
  {
    id: "61_es_mc-dormant",
    lang: "es",
    photo: `${PLATES}/30_pete-desert-side.jpg`,
    focal: [0.5, 0.5],
    template: "poster",
    eyebrow: "AUTORIDAD INACTIVA",
    h1: "¿Tiene un MC que no está usando?",
    sub: "Una autoridad limpia que está parada todavía tiene comprador. Oferta por escrito en 24 horas, sin compromiso y sin llamadas insistentes.",
    cta: "Valuación gratis →",
    trust: ["400+ LLC cerradas", "Cierre en 3–5 días", "Gestión directa", "Alcance nacional"],
    hScale: 0.74,
  },
  {
    id: "62_es_one-truck",
    lang: "es",
    photo: `${PLATES}/31_blue-kenworth-flatbed.jpg`,
    // Tight on the tractor so it clears the band scrim — see 41_one-truck-counts.
    crop: [0.0, 0.26, 0.48, 0.8],
    focal: [0.5, 0.3],
    template: "band",
    band: "CON RELAY O SIN RELAY",
    eyebrow: "NO NECESITA UNA FLOTA",
    h1: "Un camión",
    h2: "también se vende.",
    sub: "No hace falta tener flota. Una LLC de un solo camión con MC limpio califica sin problema, en todo Estados Unidos.",
    cta: "Valuación gratis →",
    trust: ["400+ LLC cerradas", "Cierre en 3–5 días", "Gestión directa", "Alcance nacional"],
  },
  {
    id: "63_ru_mc-dormant",
    lang: "ru",
    photo: `${PLATES}/29_red-freightliner-mountain.jpg`,
    focal: [0.45, 0.5],
    template: "poster",
    eyebrow: "НЕАКТИВНАЯ АВТОРИТЕТНОСТЬ",
    h1: "Есть MC, который вы не используете?",
    sub: "Чистый MC, который простаивает, всё равно можно продать. Письменное предложение за 24 часа, без обязательств и навязчивых звонков.",
    cta: "Бесплатная оценка →",
    trust: ["400+ сделок закрыто", "3–5 рабочих дней", "Прямая работа", "По всей стране"],
    hScale: 0.7,
  },
  {
    id: "64_ru_one-truck",
    lang: "ru",
    photo: `${PLATES}/33_empty-highway-mountains.jpg`,
    focal: [0.5, 0.55],
    // Poster, not band: this photo's horizon sits low, so the band scrim would
    // leave nothing but sky. The qualifier moves into the eyebrow instead.
    template: "poster",
    eyebrow: "С RELAY ИЛИ БЕЗ · ФЛОТ НЕ ОБЯЗАТЕЛЕН",
    h1: "Один грузовик",
    h2: "— тоже сделка.",
    sub: "Флот не нужен. LLC с одним грузовиком и чистым MC полностью подходит — в любом штате США.",
    cta: "Бесплатная оценка →",
    trust: ["400+ сделок закрыто", "3–5 рабочих дней", "Прямая работа", "По всей стране"],
  },

  // ── ROUND SIX — instant-form lead ads ────────────────────────────────
  // Built for a Meta Instant Form (name / email / MC number), not for the
  // website. Two halves of one funnel: 65 finds carriers who already hold a
  // Relay contract, 66 finds owners who don't know whether they qualify.
  //
  // TRUST_ROUND_SIX drops "3–5 day close" for "Free, no obligation". On a lead
  // form the objection is not "how fast do you close" — nobody is at the
  // closing stage yet — it is "what does asking cost me".
  {
    id: "65_relay-contract-worth",
    lang: "en",
    photo: `${PLATES}/68_pete-white-mountains.jpg`,
    focal: [0.62, 0.63],
    template: "poster",
    // "Amazon Relay" stays in the eyebrow at 24px and nowhere else in frame —
    // §4 of META_ADS_CREATIVE.md. The headline says "your contract", which is
    // unambiguous sitting directly under that eyebrow and carries no mark.
    eyebrow: "AMAZON RELAY CARRIERS",
    h1: "Your contract is worth more than your trucks.",
    sub: "It took 180 days of clean authority to earn — and it's the single biggest thing that moves your number. Find out what yours is worth, free, and you keep 100% of what you’re offered.",
    cta: "See what yours is worth →",
    trust: [
      "400+ sales closed",
      "Free, no obligation",
      "No commission",
      "Nationwide US",
    ],
    hScale: 0.9,
  },
  {
    id: "66_four-boxes-checklist",
    lang: "en",
    photo: `${PLATES}/69_cascadia-green-sky.jpg`,
    // Portrait source, so the poster strip crops to the cab. Framed on the
    // windshield-and-grille band rather than the whole truck: at 1080x422 a
    // whole tractor would be a thumbnail, a grille is a presence.
    focal: [0.5, 0.52],
    template: "poster",
    // The strip asks the selling question so the eyebrow is free to carry the
    // trademark at small size, and so someone who is NOT selling has an
    // obvious reason to scroll on.
    band: "THINKING OF SELLING YOUR LLC?",
    eyebrow: "AMAZON RELAY ELIGIBILITY",
    h1: "Four boxes.",
    h2: "Do you tick them?",
    // Deliberately no `sub` — the checklist is the argument and a restatement
    // above it just costs a line. Sourced from relay.amazon.com's published
    // carrier requirements; the entity-type rule (interstate, for-hire,
    // property) is omitted because essentially everyone who sees this ad
    // already meets it.
    list: [
      "MC authority active 180+ days",
      "FMCSA rating: Satisfactory, None or Not Rated",
      "Unsafe Driving & HOS BASICs under 60%",
      "$1M auto liability · $100K cargo",
    ],
    cta: "Check my MC — free →",
    trust: ["Free, no obligation", "24-hour written offer", "Nationwide US"],
    hScale: 0.85,
  },
];

const SIZES = {
  "4x5": { w: 1080, h: 1350, pad: 72, bottom: 56, top: 64, s: 1, photoSplit: 0.54 },
  "1x1": { w: 1080, h: 1080, pad: 64, bottom: 52, top: 56, s: 0.9, photoSplit: 0.46 },
  // Stories/Reels: IG chrome covers roughly the top 250px and bottom 320px,
  // so the copy block is lifted clear of both.
  "9x16": { w: 1080, h: 1920, pad: 80, bottom: 300, top: 210, s: 1.14, photoSplit: 0.58 },
} as const;

type SizeKey = keyof typeof SIZES;

// Cover-fit with a focal point, the same math object-fit:cover + object-position
// would do — satori has neither.
function cover(
  nat: { w: number; h: number },
  box: { w: number; h: number },
  focal: [number, number],
) {
  const scale = Math.max(box.w / nat.w, box.h / nat.h);
  const dw = Math.ceil(nat.w * scale);
  const dh = Math.ceil(nat.h * scale);
  const left = Math.round(
    Math.min(0, Math.max(box.w - dw, box.w / 2 - focal[0] * dw)),
  );
  const top = Math.round(
    Math.min(0, Math.max(box.h - dh, box.h / 2 - focal[1] * dh)),
  );
  return { dw, dh, left, top };
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const i = Number(url.searchParams.get("i") ?? 0);
  const sizeKey = (url.searchParams.get("size") ?? "4x5") as SizeKey;
  const c = CREATIVES[i];
  const S = SIZES[sizeKey];
  if (!c || !S) return new Response("bad params", { status: 400 });

  const logo = img("public/brand/logo-on-dark.png");
  const photo = img(c.photo);

  const hs = (c.hScale ?? 1) * S.s;
  const F = {
    eyebrow: Math.round(24 * S.s),
    h: Math.round(78 * hs),
    sub: Math.round(30 * S.s),
    cta: Math.round(28 * S.s),
    trust: Math.round(22 * S.s),
    logoW: Math.round(300 * S.s),
  };
  F.logoW = Math.min(F.logoW, 340);
  const logoH = Math.round((logo.h / logo.w) * F.logoW);

  const isSplit = c.template === "split";
  const isStatement = c.template === "statement";
  const isPoster = c.template === "poster";
  const isBand = c.template === "band";

  // Poster is a stacked flyer: copy block on solid ink, photo beneath it, a
  // full-bleed amber action bar under that, then dead space so the bar clears
  // the Stories UI at 9:16.
  const ctaBarH = Math.round(120 * S.s);
  const posterFoot = S.bottom;
  const posterFree = S.h - S.top - posterFoot - ctaBarH;
  // A checklist needs the room, and it needs it on solid ink — that is the
  // whole reason a criteria ad is a poster and not a band. Under `band` the
  // copy is bottom-anchored over the photo, so every extra line pushes the top
  // of the block into the half-transparent part of the scrim, and the photo
  // gets sliced wherever the block happens to end.
  const posterCopyH = Math.round(posterFree * (c.list ? 0.62 : 0.52));
  const posterPhotoH = posterFree - posterCopyH;

  const photoBox = isPoster
    ? { w: S.w, h: posterPhotoH }
    : isSplit
      ? { w: S.w, h: Math.round(S.h * S.photoSplit) }
      : { w: S.w, h: S.h };

  // Fit the *cropped* region, then render the full image shifted so that
  // region lands where the fit put it. satori has no way to clip a source
  // rect, so the offset does the clipping against the overflow:hidden plate.
  const [cx0, cy0, cx1, cy1] = c.crop ?? [0, 0, 1, 1];
  const nat = {
    w: Math.round((cx1 - cx0) * photo.w),
    h: Math.round((cy1 - cy0) * photo.h),
  };
  const fit = cover(nat, photoBox, c.focal);
  const zoom = fit.dw / nat.w;
  const fullW = Math.ceil(photo.w * zoom);
  const fullH = Math.ceil(photo.h * zoom);
  const imgLeft = fit.left - Math.round(cx0 * fullW);
  const imgTop = fit.top - Math.round(cy0 * fullH);

  const copy = (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        position: "relative",
        width: S.w - S.pad * 2,
      }}
    >
      {c.band && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            // negative margins bleed the strip past the canvas padding
            marginLeft: -S.pad,
            marginRight: -S.pad,
            marginBottom: Math.round(30 * S.s),
            width: S.w,
            padding: `${Math.round(20 * S.s)}px ${S.pad}px`,
            background: AMBER,
            color: INK,
            fontSize: Math.round(30 * S.s),
            fontWeight: 700,
            letterSpacing: Math.round(30 * S.s) * 0.06,
          }}
        >
          {c.band}
        </div>
      )}
      <div
        style={{
          display: "flex",
          fontSize: F.eyebrow,
          fontWeight: 600,
          letterSpacing: F.eyebrow * 0.38,
          color: AMBER,
          marginBottom: Math.round(26 * S.s),
        }}
      >
        {c.eyebrow}
      </div>
      <div
        style={{
          display: "flex",
          fontSize: F.h,
          fontWeight: 600,
          letterSpacing: -F.h * 0.04,
          lineHeight: 0.98,
          color: "#fff",
        }}
      >
        {c.h1}
      </div>
      {c.h2 && (
        <div
          style={{
            display: "flex",
            fontSize: F.h,
            fontWeight: 300,
            fontStyle: "italic",
            letterSpacing: -F.h * 0.04,
            lineHeight: 1.02,
            color: "rgba(255,255,255,0.85)",
          }}
        >
          {c.h2}
        </div>
      )}
      {c.sub && (
        <div
          style={{
            display: "flex",
            width: Math.min(S.w - S.pad * 2, Math.round(830 * S.s)),
            marginTop: Math.round(30 * S.s),
            fontSize: F.sub,
            lineHeight: 1.42,
            color: "rgba(255,255,255,0.75)",
          }}
        >
          {c.sub}
        </div>
      )}
      {c.list && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: Math.round(30 * S.s),
          }}
        >
          {c.list.map((item) => (
            <div
              key={item}
              style={{
                display: "flex",
                alignItems: "center",
                marginBottom: Math.round(14 * S.s),
                fontSize: F.sub,
                color: "rgba(255,255,255,0.78)",
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: Math.round(9 * S.s),
                  height: Math.round(9 * S.s),
                  borderRadius: 999,
                  background: AMBER,
                  marginRight: Math.round(18 * S.s),
                }}
              />
              {item}
            </div>
          ))}
        </div>
      )}
      <div
        style={{
          display: "flex",
          alignSelf: "flex-start",
          marginTop: Math.round(42 * S.s),
          padding: `${Math.round(22 * S.s)}px ${Math.round(40 * S.s)}px`,
          borderRadius: 999,
          background: AMBER,
          color: INK,
          fontSize: F.cta,
          fontWeight: 600,
        }}
      >
        {c.cta}
      </div>
      <div
        style={{
          display: "flex",
          marginTop: Math.round(40 * S.s),
          fontSize: F.trust,
          fontWeight: 500,
          color: "rgba(255,255,255,0.6)",
        }}
      >
        {c.trust.flatMap((item, n) => [
          n > 0 ? (
            <span
              key={`s${n}`}
              style={{ color: AMBER, margin: `0 ${Math.round(14 * S.s)}px` }}
            >
              ·
            </span>
          ) : null,
          <span key={item}>{item}</span>,
        ])}
      </div>
    </div>
  );

  const FONT_SET = [
    { name: "Inter", data: font("Inter-Regular.ttf"), weight: 400 as const, style: "normal" as const },
    { name: "Inter", data: font("Inter-SemiBold.ttf"), weight: 500 as const, style: "normal" as const },
    { name: "Inter", data: font("Inter-SemiBold.ttf"), weight: 600 as const, style: "normal" as const },
    { name: "Inter", data: font("Inter-Bold.ttf"), weight: 700 as const, style: "normal" as const },
    { name: "Inter", data: font("Inter-LightItalic.ttf"), weight: 300 as const, style: "italic" as const },
  ];

  if (isPoster) {
    return new ImageResponse(
      (
        <div
          style={{
            width: S.w,
            height: S.h,
            display: "flex",
            flexDirection: "column",
            background: INK,
            fontFamily: "Inter",
          }}
        >
          {/* Copy block — everything the buyer needs to self-identify, on
              solid ink so nothing competes with the question. */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              height: S.top + posterCopyH,
              padding: `${S.top}px ${S.pad}px 0`,
            }}
          >
            <img src={logo.uri} width={F.logoW} height={logoH} />
            {/* Pushes the copy down so it sits tight against the photo edge
                instead of floating in the middle of the ink block. */}
            <div style={{ display: "flex", flexGrow: 1, minHeight: Math.round(34 * S.s) }} />
            {/* Qualifier strip. On a band creative this sits over the photo;
                here it bleeds the full width of the ink block and acts as the
                divider between the logo and the argument. */}
            {c.band && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  marginLeft: -S.pad,
                  marginRight: -S.pad,
                  marginBottom: Math.round(30 * S.s),
                  width: S.w,
                  padding: `${Math.round(20 * S.s)}px ${S.pad}px`,
                  background: AMBER,
                  color: INK,
                  fontSize: Math.round(30 * S.s),
                  fontWeight: 700,
                  letterSpacing: Math.round(30 * S.s) * 0.06,
                }}
              >
                {c.band}
              </div>
            )}
            <div
              style={{
                display: "flex",
                fontSize: F.eyebrow,
                fontWeight: 600,
                letterSpacing: F.eyebrow * 0.38,
                color: AMBER,
                marginBottom: Math.round(22 * S.s),
              }}
            >
              {c.eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: F.h,
                fontWeight: 700,
                letterSpacing: -F.h * 0.04,
                lineHeight: 1.0,
                color: "#fff",
              }}
            >
              {c.h1}
            </div>
            {c.h2 && (
              <div
                style={{
                  display: "flex",
                  fontSize: F.h,
                  fontWeight: 300,
                  fontStyle: "italic",
                  letterSpacing: -F.h * 0.04,
                  lineHeight: 1.04,
                  color: "rgba(255,255,255,0.85)",
                }}
              >
                {c.h2}
              </div>
            )}
            {c.sub && (
              <div
                style={{
                  display: "flex",
                  marginTop: Math.round(26 * S.s),
                  fontSize: F.sub,
                  lineHeight: 1.4,
                  color: "rgba(255,255,255,0.78)",
                }}
              >
                {c.sub}
              </div>
            )}
            {c.list && (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  marginTop: Math.round(30 * S.s),
                }}
              >
                {c.list.map((item) => (
                  <div
                    key={item}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      marginBottom: Math.round(14 * S.s),
                      fontSize: F.sub,
                      color: "rgba(255,255,255,0.82)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        width: Math.round(9 * S.s),
                        height: Math.round(9 * S.s),
                        borderRadius: 999,
                        background: AMBER,
                        marginRight: Math.round(18 * S.s),
                      }}
                    />
                    {item}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Photo — evidence, not the hero */}
          <div
            style={{
              width: S.w,
              height: posterPhotoH,
              display: "flex",
              overflow: "hidden",
              position: "relative",
            }}
          >
            <img
              src={photo.uri}
              width={fullW}
              height={fullH}
              style={{ position: "absolute", left: imgLeft, top: imgTop }}
            />
          </div>

          {/* Action bar */}
          <div
            style={{
              width: S.w,
              height: ctaBarH,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: `0 ${S.pad}px`,
              background: AMBER,
              color: INK,
            }}
          >
            <div style={{ display: "flex", fontSize: F.cta, fontWeight: 700 }}>
              {c.cta}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: F.trust,
                fontWeight: 600,
                color: "rgba(10,10,11,0.62)",
              }}
            >
              {c.trust.slice(0, 2).join("  ·  ")}
            </div>
          </div>

          {/* Foot — keeps the action bar clear of the Stories UI at 9:16 */}
          <div style={{ width: S.w, height: posterFoot, display: "flex" }} />
        </div>
      ),
      { width: S.w, height: S.h, fonts: FONT_SET },
    );
  }

  return new ImageResponse(
    (
      <div
        style={{
          width: S.w,
          height: S.h,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          position: "relative",
          background: INK,
          fontFamily: "Inter",
          padding: S.pad,
          paddingBottom: S.bottom,
        }}
      >
        {/* Plate */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: photoBox.w,
            height: photoBox.h,
            display: "flex",
            overflow: "hidden",
            opacity: isStatement ? 0.05 : 1,
          }}
        >
          <img
            src={photo.uri}
            width={fullW}
            height={fullH}
            style={{ position: "absolute", left: imgLeft, top: imgTop }}
          />
        </div>

        {/* Statement backdrop: the plate is texture only, so it gets flattened
            under a near-solid wash and lit by two amber glows instead. */}
        {isStatement && (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: 0,
                width: S.w,
                height: S.h,
                display: "flex",
                background: "rgba(10,10,11,0.55)",
              }}
            />
            <div
              style={{
                position: "absolute",
                top: -Math.round(S.h * 0.16),
                right: -Math.round(S.w * 0.24),
                width: Math.round(S.w * 1.05),
                height: Math.round(S.w * 1.05),
                display: "flex",
                background:
                  "radial-gradient(circle, rgba(255,138,26,0.30) 0%, rgba(255,138,26,0) 70%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: -Math.round(S.h * 0.2),
                left: -Math.round(S.w * 0.3),
                width: Math.round(S.w * 0.95),
                height: Math.round(S.w * 0.95),
                display: "flex",
                background:
                  "radial-gradient(circle, rgba(255,138,26,0.14) 0%, rgba(255,138,26,0) 70%)",
              }}
            />
          </>
        )}

        {/* Copy scrim */}
        {!isSplit && (
          <div
            style={{
              position: "absolute",
              left: 0,
              top: Math.round(S.h * (isBand ? 0.18 : 0.26)),
              width: S.w,
              height: Math.round(S.h * (isBand ? 0.82 : 0.74)),
              display: "flex",
              background: isBand
                ? "linear-gradient(to bottom, rgba(10,10,11,0) 0%, rgba(10,10,11,0.72) 26%, #0a0a0b 46%, #0a0a0b 100%)"
                : "linear-gradient(to bottom, rgba(10,10,11,0) 0%, rgba(10,10,11,0.55) 34%, rgba(10,10,11,0.90) 58%, rgba(10,10,11,0.985) 76%, #0a0a0b 100%)",
            }}
          />
        )}

        {/* Seam highlight on split layouts */}
        {isSplit && (
          <>
            <div
              style={{
                position: "absolute",
                left: 0,
                top: photoBox.h - Math.round(S.h * 0.16),
                width: S.w,
                height: Math.round(S.h * 0.16),
                display: "flex",
                background:
                  "linear-gradient(to bottom, rgba(10,10,11,0) 0%, rgba(10,10,11,0.85) 70%, #0a0a0b 100%)",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 0,
                top: photoBox.h - 3,
                width: S.w,
                height: 3,
                display: "flex",
                background: AMBER,
                opacity: 0.9,
              }}
            />
          </>
        )}

        {/* Top scrim keeps the logo legible on any plate */}
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            width: S.w,
            height: Math.round(S.h * 0.26),
            display: "flex",
            background:
              "linear-gradient(to bottom, rgba(10,10,11,0.82) 0%, rgba(10,10,11,0.34) 46%, rgba(10,10,11,0) 100%)",
          }}
        />

        <img
          src={logo.uri}
          width={F.logoW}
          height={logoH}
          style={{ position: "absolute", left: S.pad, top: S.top }}
        />

        {copy}
      </div>
    ),
    {
      width: S.w,
      height: S.h,
      fonts: [
        { name: "Inter", data: font("Inter-Regular.ttf"), weight: 400, style: "normal" },
        { name: "Inter", data: font("Inter-SemiBold.ttf"), weight: 500, style: "normal" },
        { name: "Inter", data: font("Inter-SemiBold.ttf"), weight: 600, style: "normal" },
        { name: "Inter", data: font("Inter-Bold.ttf"), weight: 700, style: "normal" },
        { name: "Inter", data: font("Inter-LightItalic.ttf"), weight: 300, style: "italic" },
      ],
    },
  );
}

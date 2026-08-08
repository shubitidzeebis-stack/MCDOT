// TEMPORARY — Instagram/Facebook organic post generator. Delete after export.
//
//   /api/socialgen?i=<0-29>
//
// These are POSTS, not ads. The distinction is enforced in the layout, not
// just the copy: there is no CTA button, no trust badge strip, no arrow, no
// offer. The brand appears once, small, in a footer rule. Every post has to
// survive being read by someone who is not selling anything and is not
// thinking about selling — it earns attention by being useful first.
//
// Every factual claim traces to a page or post on groupveritor.com. Nothing
// here is invented copy; see SOURCES.txt in the export folder.
import { ImageResponse } from "next/og";
import fs from "node:fs";
import path from "node:path";

export const runtime = "nodejs";

const ROOT = process.cwd();
const FONTS = path.join(ROOT, "docs/ad-samples/fonts");

const INK = "#0a0a0b";
const AMBER = "#ff8a1a";
const BODY = "#b7b7be";
const DIM = "#6e6e77";
const RULE = "rgba(255,255,255,0.13)";

const font = (f: string) => fs.readFileSync(path.join(FONTS, f));

const PLATES =
  "C:/Users/Nitropc/Desktop/veritor meta ads creatives/source photos (pexels)/_working (generator)";

function jpegSize(b: Buffer) {
  let i = 2;
  while (i < b.length - 9) {
    if (b[i] !== 0xff) {
      i++;
      continue;
    }
    const m = b[i + 1];
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

// Cover-fit with a focal point — satori has neither object-fit nor
// object-position.
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

type Template =
  | "statement" // photo-forward, one line of type. The quiet post.
  | "fact" // a single figure carrying the post.
  | "myth" // the correction format. Highest save rate of the six.
  | "list" // checklist. The reference post people screenshot.
  | "steps" // a timeline in rows.
  | "compare" // two columns, side by side.
  | "qa"; // plain question, plain answer.

type Post = {
  id: string;
  lang: "en" | "es" | "ru";
  photo: string;
  focal: [number, number];
  crop?: [number, number, number, number];
  template: Template;
  photoH?: number; // override the default strip height for this template
  eyebrow?: string;
  h1?: string; // statement / list / steps / compare heading
  sub?: string;
  figure?: string; // fact
  myth?: string; // myth
  truth?: string;
  items?: string[]; // list
  rows?: [string, string][]; // steps
  colA?: [string, string[]]; // compare — [header, items]
  colB?: [string, string[]];
  q?: string; // qa
  a?: string;
  note?: string; // small closing line, all templates
  hScale?: number;
};

const P = (f: string) => `${PLATES}/${f}`;

const POSTS: Post[] = [
  // ── English (1–22) ────────────────────────────────────────────────────
  {
    id: "01_mc-number-alone",
    lang: "en",
    photo: P("34_CROP-four-tankers.jpg"),
    // Tighter than the ad-generator crop of the same plate: at a 2.8:1 strip
    // the old rect still let a sliver of the background facility sign in at
    // top-right. Starting at 0.66 puts the horizon above the frame entirely.
    crop: [0.25, 0.66, 0.96, 1.0],
    focal: [0.5, 0.62],
    template: "myth",
    myth: "\u201CI'll sell the MC number and keep the LLC.\u201D",
    truth:
      "FMCSA prohibits selling, leasing or transferring an MC or DOT number outside a legitimate sale of the entity it belongs to.",
    note: "The number is registered to the company, not to you. It moves when the company moves \u2014 and never on its own.",
  },
  {
    id: "02_180-day-rule",
    lang: "en",
    photo: P("50_calculator-paid-due.jpg"),
    focal: [0.5, 0.45],
    template: "fact",
    eyebrow: "AMAZON RELAY ONBOARDING",
    figure: "180 days",
    sub: "Relay won\u2019t onboard a carrier until the MC authority and the BIPD policy attached to it have both been continuously active for at least six months. Six months of premiums, six months of FMCSA standing, no lapses in between.",
    note: "It is the single most common reason a clean, capable carrier gets turned down.",
  },
  {
    id: "03_what-transfers",
    lang: "en",
    photo: P("07_key-handover-contract.jpg"),
    focal: [0.5, 0.42],
    template: "list",
    photoH: 300,
    eyebrow: "IF A TRUCKING LLC CHANGES HANDS",
    h1: "What actually moves with the company",
    items: [
      "The LLC itself \u2014 the EIN stays the same",
      "MC authority and DOT records",
      "The company phone number",
      "The company email account",
      "The company bank account",
      "The insurance policy, re-bound under new ownership",
      "An Amazon Relay contract, if there is one",
    ],
  },
  {
    id: "04_what-stays-yours",
    lang: "en",
    photo: P("11_senior-hand-document.jpg"),
    focal: [0.5, 0.5],
    template: "list",
    photoH: 380,
    eyebrow: "THE OTHER HALF OF THE LIST",
    h1: "And what stays yours",
    items: [
      "Trucks titled in your name rather than the LLC\u2019s",
      "Personal vehicles and personal accounts",
      "Your name \u2014 it belongs in no one\u2019s marketing",
      "Tax obligations from before the closing date",
    ],
    note: "Anything not written into the agreement stays where it is. Read the list before you sign it, not after.",
  },
  {
    id: "05_sell-llc-keep-trucks",
    lang: "en",
    photo: P("28_w900-golden-road.jpg"),
    focal: [0.5, 0.5],
    template: "statement",
    eyebrow: "WORTH KNOWING",
    h1: "The company and the trucks are two different assets.",
    sub: "The LLC is the entity, the authority, the phone line, the bank account. The trucks are equipment. They can be sold to different people, at different times, for different reasons \u2014 and usually they should be.",
  },
  {
    id: "06_four-exits",
    lang: "en",
    photo: P("33_empty-highway-mountains.jpg"),
    focal: [0.5, 0.5],
    template: "list",
    photoH: 400,
    eyebrow: "OWNER-OPERATOR EXITS",
    h1: "Four ways out, and they don\u2019t pay the same",
    items: [
      "Wind it down and sell the trucks one at a time",
      "Lease the authority to another carrier",
      "Sell trucks and company together to one buyer",
      "Sell the company and keep the trucks",
    ],
    note: "Most owners only ever consider the first one.",
  },
  {
    id: "07_leasing-authority",
    lang: "en",
    photo: P("39_owner-rusted-truck.jpg"),
    focal: [0.5, 0.42],
    template: "myth",
    myth: "\u201CLeasing my authority out is a quiet way to step back.\u201D",
    truth:
      "Whoever runs under your MC runs on your record. Their violations attach to your authority \u2014 and they are still there when the lease ends.",
    note: "It works as a short bridge. It is a poor long-term exit, because the legal exposure never actually leaves you.",
  },
  {
    id: "08_loans",
    lang: "en",
    photo: P("40_owner-wheel-repair.jpg"),
    focal: [0.5, 0.45],
    template: "myth",
    myth: "\u201CThere\u2019s a loan on the truck, so the company can\u2019t be sold.\u201D",
    truth:
      "Outstanding balances are paid off out of the closing wire. The lender is paid first, the remainder goes to the seller, and the closing statement reconciles to the penny.",
    note: "When the loan is paid off at closing, a personal guarantee attached to it ends with it.",
  },
  {
    id: "09_valuation-variables",
    lang: "en",
    photo: P("47_charts-calculator.jpg"),
    focal: [0.5, 0.5],
    template: "list",
    photoH: 300,
    eyebrow: "HOW A TRUCKING LLC GETS PRICED",
    h1: "Six things that move the number",
    items: [
      "An active Amazon Relay contract",
      "How long the MC has been active and insured",
      "Whether the insurance is in force today",
      "Violation history on the FMCSA record",
      "State of registration",
      "Active loans or a factoring line",
    ],
    note: "The first one moves it further than the other five combined.",
  },
  {
    id: "10_no-value-added",
    lang: "en",
    photo: P("22_blank-paper-pen.jpg"),
    focal: [0.5, 0.5],
    template: "list",
    photoH: 380,
    eyebrow: "SET EXPECTATIONS EARLY",
    h1: "What sellers expect to add value, but doesn\u2019t",
    items: [
      "Branding and Google reviews",
      "The driver roster \u2014 drivers are at-will",
      "Office furniture, signage, marketing assets",
      "Existing freight broker relationships",
    ],
    note: "None of it is worthless. It just isn\u2019t what a buyer is paying for.",
  },
  {
    id: "11_value-added",
    lang: "en",
    photo: P("03_w900-reefer-parked.jpg"),
    // Dropped from 0.5 so the top of the reefer unit — which carries a legible
    // maker's name — sits above the strip.
    focal: [0.5, 0.62],
    template: "list",
    photoH: 380,
    eyebrow: "THE OTHER DIRECTION",
    h1: "What genuinely raises the number",
    items: [
      "A long, clean operating history",
      "Equipment in working shape with clean titles",
      "Insurance that never lapsed",
      "Disclosing every complication on day one",
    ],
    note: "The last one costs nothing and shortens the whole process.",
  },
  {
    id: "12_timeline",
    lang: "en",
    photo: P("13_signature-line.jpg"),
    focal: [0.5, 0.5],
    template: "steps",
    photoH: 300,
    eyebrow: "WHAT THE CALENDAR REALLY LOOKS LIKE",
    h1: "Selling a trucking LLC, day by day",
    rows: [
      ["DAY 1", "FMCSA record pulled, authority and insurance verified, a written number comes back"],
      ["DAY 2\u20133", "Letter of intent signed, light diligence underway"],
      ["DAY 3\u20135", "Purchase agreement drafted and reviewed by both sides"],
      ["DAY 5\u201314", "Signing, bank signatories updated, wire out"],
    ],
    note: "Most deals land between day 7 and day 14. If anyone promises 72 hours, ask what they are skipping.",
  },
  {
    id: "13_ask-any-buyer",
    lang: "en",
    photo: P("24_shop-two-men.jpg"),
    focal: [0.5, 0.42],
    template: "list",
    photoH: 340,
    eyebrow: "BEFORE YOU SIGN ANYTHING",
    h1: "Four questions worth asking any buyer",
    items: [
      "\u201CAre you the operator, or are you reselling?\u201D",
      "\u201CWhere will the company run after closing?\u201D",
      "\u201CWho pays the legal fees?\u201D",
      "\u201CWhen exactly does the wire go out?\u201D",
    ],
    note: "The answers sort serious buyers from the rest faster than any reference check.",
  },
  {
    id: "14_closing-checklist",
    lang: "en",
    photo: P("08_handshake-documents.jpg"),
    focal: [0.5, 0.5],
    template: "statement",
    eyebrow: "A USEFUL TEST",
    h1: "Ask for the closing checklist before you sign.",
    sub: "Anyone who has actually closed a trucking company has one \u2014 phone line, email, bank account, FMCSA portal, insurance, titles, filings. If a buyer can\u2019t produce it, that tells you what kind of buyer you are talking to.",
  },
  {
    id: "15_spot-a-legitimate-buyer",
    lang: "en",
    photo: P("10_handshake-laptop-denim.jpg"),
    focal: [0.5, 0.5],
    template: "compare",
    photoH: 300,
    eyebrow: "BEFORE YOU SIGN",
    h1: "How to tell a real deal from a setup",
    colA: [
      "A LEGITIMATE SALE",
      [
        "A written purchase agreement, signed by both sides",
        "Funds move through attorney escrow",
        "Closing happens in person, at your own bank",
        "The FMCSA record is updated as part of closing",
        "No pressure to skip your own attorney",
      ],
    ],
    colB: [
      "A FRAUD SETUP",
      [
        "Nothing in writing \u2014 just a handshake",
        "Payment requested by Venmo, Zelle or crypto",
        "Signing is remote-only, no in-person option",
        "No mention of updating the FMCSA record",
        "Pressure to sign before you\u2019ve reviewed anything",
      ],
    ],
  },
  {
    id: "16_who-has-to-know",
    lang: "en",
    photo: P("06_driver-silhouette-bw.jpg"),
    focal: [0.5, 0.45],
    template: "compare",
    photoH: 320,
    eyebrow: "CONFIDENTIALITY, CONCRETELY",
    h1: "Who has to be told. Who doesn\u2019t.",
    colA: [
      "HAS TO KNOW",
      [
        "The lender, if there is a loan",
        "The insurance carrier",
        "FMCSA, after closing",
        "Legal counsel on both sides",
      ],
    ],
    colB: [
      "DOESN\u2019T",
      [
        "Your drivers",
        "Your dispatchers",
        "Freight brokers and shippers",
        "Your factoring contacts",
        "Your competitors",
      ],
    ],
  },
  {
    id: "17_quiet-is-strategy",
    lang: "en",
    photo: P("02_lone-rig-open-road.jpg"),
    focal: [0.5, 0.5],
    template: "statement",
    eyebrow: "AN INDUSTRY THIS SMALL",
    h1: "Quiet isn\u2019t secrecy. It\u2019s strategy.",
    sub: "Drivers talk. Dispatchers talk. Insurance agents talk. A sale that leaks starts costing the company value in the exact weeks it is trying to close \u2014 drivers leave, freight brokers move loads elsewhere. Whatever you decide, decide it privately first.",
  },
  {
    id: "18_lapsed-insurance",
    lang: "en",
    photo: P("46_hand-signing-doc.jpg"),
    focal: [0.5, 0.5],
    template: "qa",
    photoH: 420,
    q: "Does lapsed insurance end the conversation?",
    a: "Not automatically. A company holding an active Amazon Relay contract can change hands with coverage lapsed \u2014 the contract is the asset, and the policy gets re-bound at closing. Without Relay, an in-force policy is usually required, because Relay onboarding needs continuous coverage history to look at.",
  },
  {
    id: "19_dormant-authority",
    lang: "en",
    photo: P("05_vintage-peterbilt.jpg"),
    focal: [0.5, 0.5],
    template: "statement",
    eyebrow: "PARKED, NOT WORTHLESS",
    h1: "An authority that sits still doesn\u2019t hold its value forever.",
    sub: "Insurance lapses. The record ages. What was a clean six-month authority becomes a mature MC with no operating history behind it, and the window for a straightforward transfer narrows. That isn\u2019t a reason to rush \u2014 it\u2019s a reason to know where you stand.",
  },
  {
    id: "20_relay-contract",
    lang: "en",
    photo: P("35_pete-red-garage.jpg"),
    focal: [0.5, 0.5],
    template: "qa",
    photoH: 420,
    q: "What happens to an Amazon Relay contract in a sale?",
    a: "It\u2019s held by the company, not by the individual who owns it \u2014 which is exactly why it\u2019s valuable to a buyer. The specifics of any given transfer depend on Amazon\u2019s own review, but a clean, active contract is consistently the single biggest factor in what a trucking LLC is worth.",
  },
  {
    id: "21_trucks-take-time",
    lang: "en",
    photo: P("27_classic-row-five.jpg"),
    focal: [0.5, 0.5],
    template: "fact",
    eyebrow: "WINDING DOWN, HONESTLY",
    figure: "30\u201390 days",
    sub: "That is what one truck typically takes to sell on the open market \u2014 per truck, one buyer at a time, with every showing, inspection and financing delay that comes with it.",
    note: "It is the part of closing a business that owners underestimate most.",
  },
  {
    id: "22_here-if-you-decide",
    lang: "en",
    // Was 37_owner-phone-call: a young man in a parka against a blue bus, which
    // reads European commuter, not US owner-operator. The whole point of this
    // post is that the reader recognises himself in it.
    photo: P("38_owner-reading-doc-cab.jpg"),
    focal: [0.5, 0.42],
    template: "statement",
    eyebrow: "WHY WE POST THIS",
    h1: "Nobody should be talked into selling their company.",
    sub: "Most of what we do is answer questions from owners who haven\u2019t decided anything \u2014 what transfers, what a clean record is worth, whether a loan is a problem. If you\u2019re somewhere in that thinking, ask. There\u2019s no form and no pressure at the other end of it.",
  },

  // ── Spanish (23–26) ───────────────────────────────────────────────────
  {
    id: "23_es_que-se-transfiere",
    lang: "es",
    photo: P("09_key-handover-light.jpg"),
    focal: [0.5, 0.5],
    template: "list",
    photoH: 300,
    eyebrow: "SI UNA LLC DE TRANSPORTE CAMBIA DE DUE\u00D1O",
    h1: "Qu\u00E9 se transfiere con la empresa",
    items: [
      "La LLC en s\u00ED \u2014 el EIN no cambia",
      "La autoridad MC y el registro DOT",
      "El n\u00FAmero de tel\u00E9fono de la empresa",
      "La cuenta de correo de la empresa",
      "La cuenta bancaria de la empresa",
      "La p\u00F3liza de seguro, renovada bajo el nuevo due\u00F1o",
      "El contrato de Amazon Relay, si existe",
    ],
  },
  {
    id: "24_es_prestamo",
    lang: "es",
    photo: P("41_garage-looking-up.jpg"),
    focal: [0.5, 0.45],
    template: "myth",
    myth: "\u201CHay un pr\u00E9stamo sobre el cami\u00F3n, as\u00ED que no se puede vender.\u201D",
    truth:
      "El saldo se cancela desde la transferencia del cierre. Primero se paga al prestamista, el resto va al vendedor, y el estado de cuenta cuadra al centavo.",
    note: "Cuando el pr\u00E9stamo se liquida en el cierre, la garant\u00EDa personal asociada termina con \u00E9l.",
  },
  {
    id: "25_es_180-dias",
    lang: "es",
    photo: P("30_pete-desert-side.jpg"),
    focal: [0.5, 0.5],
    template: "fact",
    eyebrow: "ONBOARDING DE AMAZON RELAY",
    figure: "180 d\u00EDas",
    sub: "Relay no admite a un transportista hasta que la autoridad MC y la p\u00F3liza BIPD asociada lleven al menos seis meses activas de forma continua. Seis meses de primas pagadas, seis meses en regla ante FMCSA, sin interrupciones.",
    note: "Es el motivo m\u00E1s com\u00FAn por el que rechazan a un transportista limpio y capaz.",
  },
  {
    id: "26_es_dos-activos",
    lang: "es",
    photo: P("32_two-trucks-hay-road.jpg"),
    focal: [0.5, 0.5],
    template: "statement",
    eyebrow: "VALE LA PENA SABERLO",
    h1: "La empresa y los camiones son dos activos distintos.",
    sub: "La LLC es la entidad, la autoridad, la l\u00EDnea telef\u00F3nica, la cuenta bancaria. Los camiones son equipo. Se pueden vender a personas distintas, en momentos distintos \u2014 y casi siempre conviene as\u00ED.",
  },

  // ── Russian (27–30) ───────────────────────────────────────────────────
  {
    id: "27_ru_chto-perehodit",
    lang: "ru",
    photo: P("45_two-people-signing.jpg"),
    focal: [0.5, 0.45],
    template: "list",
    photoH: 300,
    eyebrow: "\u041A\u041E\u0413\u0414\u0410 LLC \u041C\u0415\u041D\u042F\u0415\u0422 \u0412\u041B\u0410\u0414\u0415\u041B\u042C\u0426\u0410",
    h1: "\u0427\u0442\u043E \u043F\u0435\u0440\u0435\u0445\u043E\u0434\u0438\u0442 \u0432\u043C\u0435\u0441\u0442\u0435 \u0441 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0435\u0439",
    items: [
      "\u0421\u0430\u043C\u0430 LLC \u2014 EIN \u043E\u0441\u0442\u0430\u0451\u0442\u0441\u044F \u043F\u0440\u0435\u0436\u043D\u0438\u043C",
      "MC-\u0430\u0432\u0442\u043E\u0440\u0438\u0442\u0435\u0442 \u0438 \u0437\u0430\u043F\u0438\u0441\u0438 DOT",
      "\u0422\u0435\u043B\u0435\u0444\u043E\u043D \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438",
      "\u041F\u043E\u0447\u0442\u043E\u0432\u044B\u0439 \u044F\u0449\u0438\u043A \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438",
      "\u0411\u0430\u043D\u043A\u043E\u0432\u0441\u043A\u0438\u0439 \u0441\u0447\u0451\u0442 \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u0438",
      "\u0421\u0442\u0440\u0430\u0445\u043E\u0432\u043A\u0430 \u2014 \u043F\u0435\u0440\u0435\u043E\u0444\u043E\u0440\u043C\u043B\u044F\u0435\u0442\u0441\u044F \u043D\u0430 \u043D\u043E\u0432\u043E\u0433\u043E \u0432\u043B\u0430\u0434\u0435\u043B\u044C\u0446\u0430",
      "\u041A\u043E\u043D\u0442\u0440\u0430\u043A\u0442 Amazon Relay, \u0435\u0441\u043B\u0438 \u043E\u043D \u0435\u0441\u0442\u044C",
    ],
  },
  {
    id: "28_ru_kredit",
    lang: "ru",
    photo: P("36_owner-old-green-truck.jpg"),
    focal: [0.5, 0.4],
    template: "myth",
    myth: "\u00AB\u041D\u0430 \u0433\u0440\u0443\u0437\u043E\u0432\u0438\u043A\u0435 \u043A\u0440\u0435\u0434\u0438\u0442 \u2014 \u0437\u043D\u0430\u0447\u0438\u0442, \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044E \u043D\u0435 \u043F\u0440\u043E\u0434\u0430\u0442\u044C\u00BB",
    truth:
      "\u041E\u0441\u0442\u0430\u0442\u043E\u043A \u0434\u043E\u043B\u0433\u0430 \u0433\u0430\u0441\u0438\u0442\u0441\u044F \u0438\u0437 \u0441\u0443\u043C\u043C\u044B \u0441\u0434\u0435\u043B\u043A\u0438. \u0421\u043D\u0430\u0447\u0430\u043B\u0430 \u043F\u043B\u0430\u0442\u044F\u0442 \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u0440\u0443, \u043E\u0441\u0442\u0430\u0442\u043E\u043A \u0438\u0434\u0451\u0442 \u043F\u0440\u043E\u0434\u0430\u0432\u0446\u0443, \u0438 \u0432\u0441\u0451 \u0441\u0445\u043E\u0434\u0438\u0442\u0441\u044F \u0434\u043E \u0446\u0435\u043D\u0442\u0430.",
    note: "\u0412\u043C\u0435\u0441\u0442\u0435 \u0441 \u043F\u043E\u0433\u0430\u0448\u0435\u043D\u043D\u044B\u043C \u043A\u0440\u0435\u0434\u0438\u0442\u043E\u043C \u0437\u0430\u043A\u0430\u043D\u0447\u0438\u0432\u0430\u0435\u0442\u0441\u044F \u0438 \u043B\u0438\u0447\u043D\u043E\u0435 \u043F\u043E\u0440\u0443\u0447\u0438\u0442\u0435\u043B\u044C\u0441\u0442\u0432\u043E \u043F\u043E \u043D\u0435\u043C\u0443.",
  },
  {
    id: "29_ru_180-dney",
    lang: "ru",
    photo: P("29_red-freightliner-mountain.jpg"),
    focal: [0.5, 0.5],
    template: "fact",
    eyebrow: "\u041F\u041E\u0414\u041A\u041B\u042E\u0427\u0415\u041D\u0418\u0415 \u041A AMAZON RELAY",
    figure: "180 \u0434\u043D\u0435\u0439",
    sub: "Relay \u043D\u0435 \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0430\u0435\u0442 \u043F\u0435\u0440\u0435\u0432\u043E\u0437\u0447\u0438\u043A\u0430, \u043F\u043E\u043A\u0430 MC-\u0430\u0432\u0442\u043E\u0440\u0438\u0442\u0435\u0442 \u0438 \u043F\u0440\u0438\u0432\u044F\u0437\u0430\u043D\u043D\u044B\u0439 \u043A \u043D\u0435\u043C\u0443 \u043F\u043E\u043B\u0438\u0441 BIPD \u043D\u0435 \u043F\u0440\u043E\u0440\u0430\u0431\u043E\u0442\u0430\u044E\u0442 \u043D\u0435\u043F\u0440\u0435\u0440\u044B\u0432\u043D\u043E \u0445\u043E\u0442\u044F \u0431\u044B \u0448\u0435\u0441\u0442\u044C \u043C\u0435\u0441\u044F\u0446\u0435\u0432. \u0428\u0435\u0441\u0442\u044C \u043C\u0435\u0441\u044F\u0446\u0435\u0432 \u043F\u043B\u0430\u0442\u0435\u0436\u0435\u0439, \u0448\u0435\u0441\u0442\u044C \u043C\u0435\u0441\u044F\u0446\u0435\u0432 \u0447\u0438\u0441\u0442\u043E\u0433\u043E \u0441\u0442\u0430\u0442\u0443\u0441\u0430 \u0432 FMCSA, \u0431\u0435\u0437 \u043F\u0435\u0440\u0435\u0440\u044B\u0432\u043E\u0432.",
    note: "\u0421\u0430\u043C\u0430\u044F \u0447\u0430\u0441\u0442\u0430\u044F \u043F\u0440\u0438\u0447\u0438\u043D\u0430 \u043E\u0442\u043A\u0430\u0437\u0430 \u0447\u0438\u0441\u0442\u043E\u043C\u0443 \u043F\u0435\u0440\u0435\u0432\u043E\u0437\u0447\u0438\u043A\u0443.",
  },
  {
    id: "30_ru_tishina",
    lang: "ru",
    photo: P("25_pete-red-autumn.jpg"),
    focal: [0.5, 0.5],
    template: "statement",
    eyebrow: "\u041E\u0422\u0420\u0410\u0421\u041B\u042C \u041C\u0410\u041B\u0415\u041D\u042C\u041A\u0410\u042F",
    h1: "\u0422\u0438\u0448\u0438\u043D\u0430 \u2014 \u044D\u0442\u043E \u043D\u0435 \u0441\u043A\u0440\u044B\u0442\u043D\u043E\u0441\u0442\u044C, \u0430 \u0440\u0430\u0441\u0447\u0451\u0442.",
    sub: "\u0412\u043E\u0434\u0438\u0442\u0435\u043B\u0438 \u0433\u043E\u0432\u043E\u0440\u044F\u0442. \u0414\u0438\u0441\u043F\u0435\u0442\u0447\u0435\u0440\u044B \u0433\u043E\u0432\u043E\u0440\u044F\u0442. \u0421\u0442\u0440\u0430\u0445\u043E\u0432\u044B\u0435 \u0430\u0433\u0435\u043D\u0442\u044B \u0433\u043E\u0432\u043E\u0440\u044F\u0442. \u0415\u0441\u043B\u0438 \u043E \u043F\u0440\u043E\u0434\u0430\u0436\u0435 \u0443\u0437\u043D\u0430\u044E\u0442 \u0440\u0430\u043D\u043E, \u043A\u043E\u043C\u043F\u0430\u043D\u0438\u044F \u0442\u0435\u0440\u044F\u0435\u0442 \u0432 \u0446\u0435\u043D\u0435 \u0438\u043C\u0435\u043D\u043D\u043E \u0432 \u0442\u0435 \u043D\u0435\u0434\u0435\u043B\u0438, \u043A\u043E\u0433\u0434\u0430 \u0441\u0434\u0435\u043B\u043A\u0430 \u0437\u0430\u043A\u0440\u044B\u0432\u0430\u0435\u0442\u0441\u044F.",
  },
];

const W = 1080;
const H = 1350;
const PAD = 76;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const i = Number(url.searchParams.get("i") ?? 0);
  const p = POSTS[i];
  if (!p) return new Response("bad index", { status: 400 });

  const logo = img("public/brand/logo-on-dark.png");
  const photo = img(p.photo);

  const DEFAULT_PHOTO_H: Record<Template, number> = {
    statement: H,
    fact: 520,
    myth: 380,
    list: 340,
    steps: 320,
    compare: 300,
    qa: 420,
  };
  const photoH = p.photoH ?? DEFAULT_PHOTO_H[p.template];
  const photoBox = { w: W, h: photoH };

  const [cx0, cy0, cx1, cy1] = p.crop ?? [0, 0, 1, 1];
  const nat = {
    w: Math.round((cx1 - cx0) * photo.w),
    h: Math.round((cy1 - cy0) * photo.h),
  };
  const fit = cover(nat, photoBox, p.focal);
  const zoom = fit.dw / nat.w;
  const fullW = Math.ceil(photo.w * zoom);
  const fullH = Math.ceil(photo.h * zoom);
  const imgLeft = fit.left - Math.round(cx0 * fullW);
  const imgTop = fit.top - Math.round(cy0 * fullH);

  const logoW = 154;
  const logoH = Math.round((logo.h / logo.w) * logoW);

  const isStatement = p.template === "statement";

  const eyebrow = (text: string, color = AMBER) => (
    <div
      style={{
        display: "flex",
        fontSize: 21,
        fontWeight: 600,
        letterSpacing: 21 * 0.32,
        color,
        marginBottom: 26,
      }}
    >
      {text}
    </div>
  );

  const note = p.note ? (
    <div
      style={{
        display: "flex",
        marginTop: 34,
        paddingTop: 26,
        borderTop: `1px solid ${RULE}`,
        fontSize: 25,
        lineHeight: 1.4,
        color: DIM,
      }}
    >
      {p.note}
    </div>
  ) : null;

  // The photo strip fades into the ink so the crop edge never reads as a
  // hard band across the post.
  const photoStrip = (
    <div
      style={{
        display: "flex",
        position: "relative",
        width: W,
        height: photoH,
        overflow: "hidden",
      }}
    >
      <img
        src={photo.uri}
        width={fullW}
        height={fullH}
        style={{ position: "absolute", left: imgLeft, top: imgTop }}
      />
      {!isStatement && (
        <div
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            height: 150,
            display: "flex",
            backgroundImage: `linear-gradient(to bottom, rgba(10,10,11,0), ${INK})`,
          }}
        />
      )}
      {isStatement && (
        <div
          style={{
            position: "absolute",
            left: 0,
            top: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            backgroundImage:
              "linear-gradient(to bottom, rgba(10,10,11,0.55) 0%, rgba(10,10,11,0.10) 26%, rgba(10,10,11,0.72) 62%, rgba(10,10,11,0.96) 100%)",
          }}
        />
      )}
    </div>
  );

  let body: React.ReactNode = null;

  if (p.template === "statement") {
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-end",
          flexGrow: 1,
          padding: `0 ${PAD}px 24px`,
        }}
      >
        {p.eyebrow && eyebrow(p.eyebrow)}
        <div
          style={{
            display: "flex",
            fontSize: Math.round(72 * (p.hScale ?? 1)),
            fontWeight: 600,
            letterSpacing: -2.4,
            lineHeight: 1.04,
            color: "#fff",
          }}
        >
          {p.h1}
        </div>
        {p.sub && (
          <div
            style={{
              display: "flex",
              marginTop: 30,
              fontSize: 29,
              lineHeight: 1.44,
              color: BODY,
            }}
          >
            {p.sub}
          </div>
        )}
        {note}
      </div>
    );
  }

  if (p.template === "fact") {
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          padding: `0 ${PAD}px`,
        }}
      >
        {p.eyebrow && eyebrow(p.eyebrow)}
        <div
          style={{
            display: "flex",
            fontSize: 116,
            fontWeight: 700,
            letterSpacing: -4,
            lineHeight: 1,
            color: "#fff",
            marginBottom: 30,
          }}
        >
          {p.figure}
        </div>
        <div style={{ display: "flex", width: 110, height: 5, background: AMBER, marginBottom: 30 }} />
        {p.sub && (
          <div style={{ display: "flex", fontSize: 29, lineHeight: 1.44, color: BODY }}>
            {p.sub}
          </div>
        )}
        {note}
      </div>
    );
  }

  if (p.template === "myth") {
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          padding: `0 ${PAD}px`,
        }}
      >
        {eyebrow("WHAT PEOPLE ASSUME", DIM)}
        <div
          style={{
            display: "flex",
            fontSize: 42,
            fontWeight: 400,
            lineHeight: 1.2,
            letterSpacing: -0.8,
            color: "#7a7a83",
            marginBottom: 42,
          }}
        >
          {p.myth}
        </div>
        <div style={{ display: "flex", width: 110, height: 5, background: AMBER, marginBottom: 42 }} />
        {eyebrow("WHAT\u2019S ACTUALLY TRUE")}
        <div
          style={{
            display: "flex",
            fontSize: 42,
            fontWeight: 600,
            lineHeight: 1.2,
            letterSpacing: -0.8,
            color: "#fff",
          }}
        >
          {p.truth}
        </div>
        {note}
      </div>
    );
  }

  if (p.template === "list") {
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          padding: `0 ${PAD}px`,
        }}
      >
        {p.eyebrow && eyebrow(p.eyebrow)}
        <div
          style={{
            display: "flex",
            fontSize: 54,
            fontWeight: 600,
            letterSpacing: -1.6,
            lineHeight: 1.08,
            color: "#fff",
            marginBottom: 38,
          }}
        >
          {p.h1}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {(p.items ?? []).map((it) => (
            <div key={it} style={{ display: "flex", alignItems: "flex-start", marginBottom: 22 }}>
              <div
                style={{
                  display: "flex",
                  width: 14,
                  height: 3,
                  background: AMBER,
                  marginTop: 18,
                  marginRight: 22,
                  flexShrink: 0,
                }}
              />
              <div style={{ display: "flex", flexGrow: 1, fontSize: 30, lineHeight: 1.3, color: "#e6e6e9" }}>
                {it}
              </div>
            </div>
          ))}
        </div>
        {note}
      </div>
    );
  }

  if (p.template === "steps") {
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          padding: `0 ${PAD}px`,
        }}
      >
        {p.eyebrow && eyebrow(p.eyebrow)}
        <div
          style={{
            display: "flex",
            fontSize: 54,
            fontWeight: 600,
            letterSpacing: -1.6,
            lineHeight: 1.08,
            color: "#fff",
            marginBottom: 30,
          }}
        >
          {p.h1}
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          {(p.rows ?? []).map(([k, v]) => (
            <div
              key={k}
              style={{
                display: "flex",
                alignItems: "flex-start",
                paddingTop: 24,
                paddingBottom: 24,
                borderTop: `1px solid ${RULE}`,
              }}
            >
              <div
                style={{
                  display: "flex",
                  width: 190,
                  flexShrink: 0,
                  fontSize: 24,
                  fontWeight: 600,
                  letterSpacing: 2.4,
                  color: AMBER,
                  paddingTop: 4,
                }}
              >
                {k}
              </div>
              <div style={{ display: "flex", flexGrow: 1, fontSize: 28, lineHeight: 1.34, color: "#e6e6e9" }}>
                {v}
              </div>
            </div>
          ))}
        </div>
        {note}
      </div>
    );
  }

  if (p.template === "compare") {
    const col = (
      header: string,
      items: string[],
      headerColor: string,
      left: boolean,
    ) => (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: (W - PAD * 2 - 48) / 2,
          paddingLeft: left ? 0 : 48,
          borderLeft: left ? "none" : `1px solid ${RULE}`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 21,
            fontWeight: 600,
            letterSpacing: 21 * 0.24,
            color: headerColor,
            marginBottom: 26,
          }}
        >
          {header}
        </div>
        {items.map((it) => (
          <div
            key={it}
            style={{
              display: "flex",
              fontSize: 26,
              lineHeight: 1.32,
              color: headerColor === AMBER ? "#e6e6e9" : "#8e8e97",
              marginBottom: 22,
            }}
          >
            {it}
          </div>
        ))}
      </div>
    );
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          padding: `0 ${PAD}px`,
        }}
      >
        {p.eyebrow && eyebrow(p.eyebrow)}
        <div
          style={{
            display: "flex",
            fontSize: 50,
            fontWeight: 600,
            letterSpacing: -1.5,
            lineHeight: 1.08,
            color: "#fff",
            marginBottom: 44,
          }}
        >
          {p.h1}
        </div>
        <div style={{ display: "flex", flexDirection: "row" }}>
          {col(p.colA![0], p.colA![1], AMBER, true)}
          {col(p.colB![0], p.colB![1], DIM, false)}
        </div>
        {note}
      </div>
    );
  }

  if (p.template === "qa") {
    body = (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          flexGrow: 1,
          padding: `0 ${PAD}px`,
        }}
      >
        {eyebrow("A QUESTION WE GET A LOT")}
        <div
          style={{
            display: "flex",
            fontSize: 50,
            fontWeight: 600,
            letterSpacing: -1.5,
            lineHeight: 1.12,
            color: "#fff",
            marginBottom: 34,
          }}
        >
          {p.q}
        </div>
        <div style={{ display: "flex", width: 110, height: 5, background: AMBER, marginBottom: 34 }} />
        <div style={{ display: "flex", fontSize: 29, lineHeight: 1.44, color: BODY }}>{p.a}</div>
        {note}
      </div>
    );
  }

  const footer = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        margin: `0 ${PAD}px`,
        paddingTop: 26,
        paddingBottom: 46,
        borderTop: `1px solid ${RULE}`,
      }}
    >
      <img src={logo.uri} width={logoW} height={logoH} />
      <div style={{ display: "flex", fontSize: 20, letterSpacing: 1.6, color: DIM }}>
        groupveritor.com
      </div>
    </div>
  );

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: INK,
          fontFamily: "Inter",
          position: "relative",
        }}
      >
        {isStatement ? (
          <div
            style={{
              display: "flex",
              position: "absolute",
              left: 0,
              top: 0,
              right: 0,
              bottom: 0,
            }}
          >
            {photoStrip}
          </div>
        ) : (
          photoStrip
        )}
        {body}
        {footer}
      </div>
    ),
    {
      width: W,
      height: H,
      fonts: [
        { name: "Inter", data: font("Inter-Regular.ttf"), weight: 400, style: "normal" },
        { name: "Inter", data: font("Inter-SemiBold.ttf"), weight: 600, style: "normal" },
        { name: "Inter", data: font("Inter-Bold.ttf"), weight: 700, style: "normal" },
      ],
    },
  );
}

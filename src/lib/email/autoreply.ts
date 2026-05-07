// Auto-reply email sent the moment /api/contact succeeds. Wraps the
// branded shell. Localized for EN / ES / RU. Mirrors the template
// patterns in templates.ts so visual is identical.

import { SITE } from "@/lib/site";
import type { Locale } from "@/lib/i18n";
import {
  emailShell,
  firstName,
  STYLE,
} from "./shell";

function safe(value: string | null | undefined): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

type Args = {
  name: string;
  locale: Locale;
  unsubscribeUrl?: string;
};

type LocaleStrings = {
  subject: string;
  preheader: (name: string) => string;
  greet: (name: string) => string;
  thanks: string;
  reply: string;
  urgent: string;
  signoff: string;
};

const COPY: Record<Locale, LocaleStrings> = {
  en: {
    subject: `We received your details — ${SITE.name}`,
    preheader: (name) => `Hi ${name}, your enquiry is in. Expect us shortly.`,
    greet: (name) => `Hi ${name},`,
    thanks: "Thanks for sending your LLC details over to us.",
    reply:
      "A member of our acquisitions team will review and come back to you within a few hours, every day of the week. If your LLC fits our criteria, the next step is a quick call and a written offer — no pressure either way.",
    urgent: "If anything urgent comes up before we reply, just answer this email.",
    signoff: `The ${SITE.name} team`,
  },
  es: {
    subject: `Recibimos sus datos — ${SITE.name}`,
    preheader: (name) => `Hola ${name}, su consulta está registrada.`,
    greet: (name) => `Hola ${name},`,
    thanks: "Gracias por enviarnos los datos de su LLC.",
    reply:
      "Un miembro de nuestro equipo de adquisiciones lo revisará y le responderá en pocas horas durante la semana laboral. Si su LLC cumple nuestros criterios, el siguiente paso es una llamada breve y una oferta por escrito — sin presión.",
    urgent: "Si surge algo urgente antes de que respondamos, simplemente responda este correo.",
    signoff: `El equipo de ${SITE.name}`,
  },
  ru: {
    subject: `Мы получили ваши данные — ${SITE.name}`,
    preheader: (name) => `Здравствуйте, ${name}, ваш запрос принят.`,
    greet: (name) => `Здравствуйте, ${name},`,
    thanks: "Спасибо, что отправили данные о вашей LLC.",
    reply:
      "Сотрудник нашего отдела покупок просмотрит их и свяжется с вами в течение нескольких часов в рабочий день. Если ваша LLC подходит под наши критерии, следующий шаг — короткий звонок и письменный оффер. Без давления.",
    urgent: "Если возникнет что-то срочное до нашего ответа — просто ответьте на это письмо.",
    signoff: `Команда ${SITE.name}`,
  },
};

export function contactAutoreply({ name, locale, unsubscribeUrl }: Args): {
  subject: string;
  text: string;
  html: string;
} {
  const c = COPY[locale];
  const first = firstName(name);

  const text = [
    c.greet(first),
    "",
    c.thanks,
    "",
    c.reply,
    "",
    c.urgent,
    "",
    c.signoff,
  ].join("\n");

  const html = emailShell({
    preheader: c.preheader(first),
    unsubscribeUrl,
    bodyHtml: `
      <p style="${STYLE.paragraph}">${safe(c.greet(first))}</p>
      <p style="${STYLE.paragraph}">${safe(c.thanks)}</p>
      <p style="${STYLE.paragraph}">${safe(c.reply)}</p>
      <p style="${STYLE.paragraphMuted}">${safe(c.urgent)}</p>
    `,
  });

  return { subject: c.subject, text, html };
}

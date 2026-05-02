// Auto-reply email sent to the seller right after they submit the form.
// Tone matches TB&D — short, calm, "we'll be back within a few hours".
// Localized for EN / ES / RU.
//
// IMPORTANT: every commercial email we send must include a CAN-SPAM-compliant
// footer (sender identity, postal address, unsubscribe instructions). This
// template appends that footer in all three languages. The autoreply itself
// is technically transactional (it's a confirmation), but mixing transactional
// + soft-promotional content makes it commercial under CAN-SPAM, so we comply
// either way.

import { SITE, formatAddressOneLine } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

type Args = {
  name: string;
  locale: Locale;
};

type Copy = {
  subject: string;
  greet: (name: string) => string;
  line1: string;
  line2: string;
  signoff: string;
  signedAs: string;
  // CAN-SPAM disclosure block — sender identity, address, opt-out.
  footerWhy: string;
  footerAddress: string;
  footerUnsubscribe: (email: string) => string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    subject: `We received your details — ${SITE.name}`,
    greet: (name) => `Hi ${name},`,
    line1: "Thanks for sending your LLC details over to us.",
    line2:
      "A member of our acquisitions team will review and come back to you within a few hours during the working week. If your LLC fits our criteria, the next step is a quick call and a written offer.",
    signoff: "Talk soon,",
    signedAs: `The ${SITE.name} Team`,
    footerWhy:
      "You're receiving this email because you submitted an enquiry through our website.",
    footerAddress: `${SITE.legalName} · ${formatAddressOneLine()}`,
    footerUnsubscribe: (email) =>
      `To stop receiving emails from us, reply with "UNSUBSCRIBE" in the subject line, or email ${email}.`,
  },
  es: {
    subject: `Recibimos sus datos — ${SITE.name}`,
    greet: (name) => `Hola ${name},`,
    line1: "Gracias por enviarnos los datos de su LLC.",
    line2:
      "Un miembro de nuestro equipo de adquisiciones lo revisará y le responderá en pocas horas durante la semana laboral. Si su LLC cumple nuestros criterios, el siguiente paso es una llamada breve y una oferta por escrito.",
    signoff: "Hasta pronto,",
    signedAs: `El equipo de ${SITE.name}`,
    footerWhy:
      "Recibe este correo porque envió una consulta a través de nuestro sitio web.",
    footerAddress: `${SITE.legalName} · ${formatAddressOneLine()}`,
    footerUnsubscribe: (email) =>
      `Para dejar de recibir correos, responda con "UNSUBSCRIBE" en el asunto, o escriba a ${email}.`,
  },
  ru: {
    subject: `Мы получили ваши данные — ${SITE.name}`,
    greet: (name) => `Здравствуйте, ${name},`,
    line1: "Спасибо, что отправили данные о вашей LLC.",
    line2:
      "Сотрудник нашего отдела покупок просмотрит их и свяжется с вами в течение нескольких часов в рабочий день. Если ваша LLC подходит под наши критерии, следующий шаг — короткий звонок и письменный оффер.",
    signoff: "До связи,",
    signedAs: `Команда ${SITE.name}`,
    footerWhy:
      "Вы получили это письмо, потому что отправили запрос через наш сайт.",
    footerAddress: `${SITE.legalName} · ${formatAddressOneLine()}`,
    footerUnsubscribe: (email) =>
      `Чтобы отписаться, ответьте на это письмо со словом "UNSUBSCRIBE" в теме, или напишите на ${email}.`,
  },
};

export function contactAutoreply({ name, locale }: Args): {
  subject: string;
  text: string;
  html: string;
} {
  const c = COPY[locale];
  const unsubscribe = c.footerUnsubscribe(SITE.legal.privacyEmail);

  const text = [
    c.greet(name),
    "",
    c.line1,
    "",
    c.line2,
    "",
    c.signoff,
    c.signedAs,
    "",
    "—",
    c.footerWhy,
    c.footerAddress,
    unsubscribe,
  ].join("\n");

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, sans-serif; max-width: 560px; margin: 0 auto; color: #111; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${escape(c.greet(name))}</p>
      <p style="margin: 0 0 16px;">${escape(c.line1)}</p>
      <p style="margin: 0 0 24px;">${escape(c.line2)}</p>
      <p style="margin: 0 0 4px;">${escape(c.signoff)}</p>
      <p style="margin: 0 0 28px; color: #111; font-weight: 600;">${escape(c.signedAs)}</p>
      <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 24px 0;" />
      <div style="font-size: 12px; color: #888; line-height: 1.5;">
        <p style="margin: 0 0 6px;">${escape(c.footerWhy)}</p>
        <p style="margin: 0 0 6px;">${escape(c.footerAddress)}</p>
        <p style="margin: 0;">${escape(unsubscribe)}</p>
      </div>
    </div>
  `;

  return { subject: c.subject, text, html };
}

function escape(str: string): string {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

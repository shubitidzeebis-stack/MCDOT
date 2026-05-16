import Link from "next/link";
import { CheckIcon } from "@/components/Icons";
import { SITE } from "@/lib/site";
import type { Locale } from "@/lib/i18n";

type Strings = {
  heading: string;
  lead: string;
  lookFor: { label: string; from: string; subject: string };
  stepsEyebrow: string;
  steps: { title: string; body: string }[];
  back: string;
};

// Subjects mirror the localized autoreply in src/lib/email/autoreply.ts.
// If those change, change these too.
const COPY: Record<Locale, Strings> = {
  en: {
    heading: "Got it. We’re on it.",
    lead: "Thanks for sending your details. A member of our acquisitions team will review and come back to you within a few hours, every day of the week.",
    lookFor: {
      label: "Look for the confirmation email",
      from: `From ${SITE.emailFrom.replace(/.*<(.+)>.*/, "$1")} (${SITE.name})`,
      subject: `Subject: “We received your details — ${SITE.name}”`,
    },
    stepsEyebrow: "What happens next",
    steps: [
      {
        title: "1. Confirmation in your inbox",
        body: `Lands within a few minutes from ${SITE.emailFrom.replace(/.*<(.+)>.*/, "$1")}. If you don’t see it, check spam — and reply to anything you find from us so future messages get through.`,
      },
      {
        title: "2. A real human replies",
        body: "Within a few hours, every day of the week — usually with one or two quick clarifying questions so we can size the offer accurately.",
      },
      {
        title: "3. Written offer, no games",
        body: "If your LLC fits our buying criteria, you get one written number — not a starting point for negotiation, not a verbal range. Decide on your own time.",
      },
    ],
    back: "← Back to home",
  },
  es: {
    heading: "Recibido. Estamos en ello.",
    lead: "Gracias por enviar sus datos. Un miembro de nuestro equipo de adquisiciones los revisará y le responderá en unas horas, cualquier día de la semana.",
    lookFor: {
      label: "Busque el correo de confirmación",
      from: `De ${SITE.emailFrom.replace(/.*<(.+)>.*/, "$1")} (${SITE.name})`,
      subject: `Asunto: “Recibimos sus datos — ${SITE.name}”`,
    },
    stepsEyebrow: "Qué sigue",
    steps: [
      {
        title: "1. Confirmación en su bandeja",
        body: `Llega en unos minutos desde ${SITE.emailFrom.replace(/.*<(.+)>.*/, "$1")}. Si no lo ve, revise spam — y responda a cualquier correo nuestro para que los próximos lleguen sin problemas.`,
      },
      {
        title: "2. Le responde una persona real",
        body: "En unas horas, cualquier día de la semana — normalmente con una o dos preguntas rápidas para dimensionar la oferta con precisión.",
      },
      {
        title: "3. Oferta por escrito, sin juegos",
        body: "Si su LLC encaja con nuestros criterios, recibe una cifra por escrito — no un punto de partida para negociar, no un rango verbal. Decide a su ritmo.",
      },
    ],
    back: "← Volver al inicio",
  },
  ru: {
    heading: "Получили. Беремся за дело.",
    lead: "Спасибо, что отправили данные. Сотрудник нашего отдела покупок просмотрит их и свяжется с вами в течение нескольких часов в любой день недели.",
    lookFor: {
      label: "Ждите письмо-подтверждение",
      from: `От ${SITE.emailFrom.replace(/.*<(.+)>.*/, "$1")} (${SITE.name})`,
      subject: `Тема: «Мы получили ваши данные — ${SITE.name}»`,
    },
    stepsEyebrow: "Что дальше",
    steps: [
      {
        title: "1. Подтверждение на почте",
        body: `Придёт в течение нескольких минут с адреса ${SITE.emailFrom.replace(/.*<(.+)>.*/, "$1")}. Не видите — проверьте «Спам» и ответьте на любое наше письмо, чтобы следующие приходили в «Входящие».`,
      },
      {
        title: "2. Ответит живой человек",
        body: "В течение нескольких часов в любой день недели — обычно с одним-двумя уточняющими вопросами, чтобы корректно оценить оффер.",
      },
      {
        title: "3. Письменный оффер, без игр",
        body: "Если ваша LLC подходит — получаете одну цифру письменно. Не «вилку», не повод для торга. Решаете в своём темпе.",
      },
    ],
    back: "← На главную",
  },
};

export function ThanksContent({ locale = "en" as Locale }: { locale?: Locale }) {
  const c = COPY[locale];
  const homeHref = locale === "en" ? "/" : `/${locale}`;

  return (
    <main id="main" className="relative pt-16">
      <section className="mx-auto max-w-[720px] px-5 py-20 md:px-6 md:py-28">
        <div className="flex flex-col items-start">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[#ff8a1a]/15 text-[#ff8a1a] ring-1 ring-[#ff8a1a]/30">
            <CheckIcon size={22} />
          </span>
          <h1 className="mt-6 text-[2rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl">
            {c.heading}
          </h1>
          <p className="mt-5 max-w-[560px] text-[15px] leading-relaxed text-white/65 md:text-[17px]">
            {c.lead}
          </p>

          {/* Email-to-expect callout */}
          <div className="mt-10 w-full max-w-[560px] rounded-2xl bg-white/[0.04] p-5 ring-1 ring-white/10 backdrop-blur-md md:p-6">
            <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[#ff8a1a]">
              {c.lookFor.label}
            </p>
            <p className="mt-3 text-[14px] leading-relaxed text-white/80">
              {c.lookFor.from}
            </p>
            <p className="mt-1 text-[14px] leading-relaxed text-white/60">
              {c.lookFor.subject}
            </p>
          </div>

          {/* What happens next */}
          <p className="mt-12 text-[10px] font-semibold uppercase tracking-[0.32em] text-white/45">
            {c.stepsEyebrow}
          </p>
          <ol className="mt-4 w-full max-w-[640px] space-y-4">
            {c.steps.map((step) => (
              <li
                key={step.title}
                className="rounded-2xl bg-white/[0.025] p-5 ring-1 ring-white/10 backdrop-blur-md md:p-6"
              >
                <p className="text-[15px] font-semibold leading-snug text-white md:text-[16px]">
                  {step.title}
                </p>
                <p className="mt-2 text-[14px] leading-relaxed text-white/65">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>

          <Link
            href={homeHref}
            className="mt-12 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.04] px-5 py-2.5 text-sm font-medium text-white/85 backdrop-blur-md transition-colors hover:border-white/30 hover:bg-white/10"
          >
            {c.back}
          </Link>
        </div>
      </section>
    </main>
  );
}

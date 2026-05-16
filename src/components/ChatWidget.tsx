"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Turnstile, type TurnstileHandle } from "@/components/Turnstile";
import type { Locale } from "@/lib/i18n";

const EASE = [0.16, 1, 0.3, 1] as const;
const SESSION_KEY = "veritor_chat_session_id";

// Hidden on conversion-focused pages so the widget doesn't compete with
// the wizard / contact form. Mirrors the MobileCTA + WhatsAppFAB lists.
const HIDDEN_PATHS = [
  "/contact",
  "/get-offer",
  "/thanks",
  "/unsubscribe",
  "/privacy",
  "/terms",
];

type Role = "user" | "assistant";
type HandoffKind = "intent_to_sell" | "specialist" | "turn_cap";

type Message = {
  id: string;
  role: Role;
  content: string;
  streaming?: boolean;
  error?: boolean;
};

type Copy = {
  openLabel: string;
  closeLabel: string;
  title: string;
  subtitle: string;
  welcome: string;
  placeholder: string;
  send: string;
  thinking: string;
  errorGeneric: string;
  poweredBy: string;
  handoffSell: string;
  handoffSpecialist: string;
  handoffTurnCap: string;
  emailLabel: string;
  mcLabel: string;
  submitHandoff: string;
  handoffThanks: string;
};

const COPY: Record<Locale, Copy> = {
  en: {
    openLabel: "Open chat",
    closeLabel: "Close chat",
    title: "Jarvis",
    subtitle: "Veritor Group assistant",
    welcome:
      "I'm Jarvis. I can answer questions about how Veritor Group buys trucking LLCs, what we look at, and what the sale process looks like. What would you like to know?",
    placeholder: "Type your message…",
    send: "Send",
    thinking: "Jarvis is typing…",
    errorGeneric:
      "Something went wrong. Please try again or use the contact form.",
    poweredBy: "AI-assisted — for offers, contact Luka directly.",
    handoffSell:
      "Drop your email and MC number and Luka will reach out personally.",
    handoffSpecialist:
      "This is a question for a specialist. Leave your email and Luka will connect you with the right person.",
    handoffTurnCap:
      "We've covered a lot. Leave your email and Luka will follow up directly.",
    emailLabel: "Email",
    mcLabel: "MC number (optional)",
    submitHandoff: "Send to Luka",
    handoffThanks: "Got it — Luka will be in touch shortly.",
  },
  es: {
    openLabel: "Abrir chat",
    closeLabel: "Cerrar chat",
    title: "Jarvis",
    subtitle: "Asistente de Veritor Group",
    welcome:
      "Soy Jarvis. Puedo responder preguntas sobre cómo Veritor Group compra LLC de transporte, qué evaluamos y cómo es el proceso de venta. ¿Qué le gustaría saber?",
    placeholder: "Escriba su mensaje…",
    send: "Enviar",
    thinking: "Jarvis está escribiendo…",
    errorGeneric:
      "Algo salió mal. Por favor intente de nuevo o use el formulario de contacto.",
    poweredBy: "Asistido por IA — para ofertas, contacte a Luka directamente.",
    handoffSell:
      "Deje su correo y número MC y Luka le contactará personalmente.",
    handoffSpecialist:
      "Esto es para un especialista. Deje su correo y Luka le conectará.",
    handoffTurnCap:
      "Hemos cubierto bastante. Deje su correo y Luka le dará seguimiento directo.",
    emailLabel: "Correo",
    mcLabel: "Número MC (opcional)",
    submitHandoff: "Enviar a Luka",
    handoffThanks: "Recibido — Luka le contactará pronto.",
  },
  ru: {
    openLabel: "Открыть чат",
    closeLabel: "Закрыть чат",
    title: "Джарвис",
    subtitle: "Ассистент Veritor Group",
    welcome:
      "Я Джарвис. Могу ответить на вопросы о том, как Veritor Group покупает транспортные LLC, что мы смотрим и как идёт процесс продажи. Что вас интересует?",
    placeholder: "Введите сообщение…",
    send: "Отправить",
    thinking: "Джарвис печатает…",
    errorGeneric:
      "Что-то пошло не так. Попробуйте ещё раз или воспользуйтесь формой контакта.",
    poweredBy: "С участием ИИ — по офферам обращайтесь к Луке напрямую.",
    handoffSell:
      "Оставьте email и номер MC — Лука свяжется с вами лично.",
    handoffSpecialist:
      "Это вопрос для специалиста. Оставьте email — Лука сведёт вас с нужным человеком.",
    handoffTurnCap:
      "Мы много обсудили. Оставьте email — Лука свяжется напрямую.",
    emailLabel: "Email",
    mcLabel: "Номер MC (необязательно)",
    submitHandoff: "Отправить Луке",
    handoffThanks: "Принято — Лука скоро свяжется.",
  },
};

function generateUUID(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  // RFC 4122 v4 fallback.
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function shortId(): string {
  return Math.random().toString(36).slice(2, 10);
}

type Props = {
  /** Server-side Edge Config flag value, passed from the layout. */
  enabled: boolean;
  locale?: Locale;
};

export function ChatWidget({ enabled, locale = "en" }: Props) {
  const pathname = usePathname() ?? "/";
  const c = COPY[locale];
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [handoff, setHandoff] = useState<HandoffKind | null>(null);
  const [handoffSubmitted, setHandoffSubmitted] = useState(false);
  const [handoffEmail, setHandoffEmail] = useState("");
  const [handoffMc, setHandoffMc] = useState("");
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const sessionIdRef = useRef<string>("");
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const turnstileRef = useRef<TurnstileHandle | null>(null);

  // Locale prefix normalization for the hidden-paths check.
  const normalizedPath =
    pathname.replace(/^\/(es|ru)(?=\/|$)/, "") || "/";
  const hidden = HIDDEN_PATHS.some(
    (p) => normalizedPath === p || normalizedPath.startsWith(p + "/"),
  );

  // Persist sessionId in localStorage so a conversation survives reloads.
  useEffect(() => {
    if (!enabled) return;
    const existing = localStorage.getItem(SESSION_KEY);
    if (existing) {
      sessionIdRef.current = existing;
    } else {
      const id = generateUUID();
      localStorage.setItem(SESSION_KEY, id);
      sessionIdRef.current = id;
    }
  }, [enabled]);

  // Auto-scroll on new content.
  useEffect(() => {
    if (!scrollRef.current) return;
    scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, handoff]);

  // Focus input when panel opens.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 250);
      return () => clearTimeout(t);
    }
  }, [open]);

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;
    const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
    if (siteKey && !turnstileToken) {
      // Turnstile is wired but hasn't given us a token yet — fail quietly
      // so the user can retry once it loads.
      return;
    }

    const userMsg: Message = {
      id: shortId(),
      role: "user",
      content: text,
    };
    const assistantMsg: Message = {
      id: shortId(),
      role: "assistant",
      content: "",
      streaming: true,
    };
    setMessages((prev) => [...prev, userMsg, assistantMsg]);
    setInput("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          sessionId: sessionIdRef.current,
          turnstileToken: turnstileToken ?? "",
          locale,
        }),
      });

      if (!res.ok || !res.body) {
        const msg =
          res.status === 429
            ? "Slow down a moment — too many messages. Try again shortly."
            : c.errorGeneric;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantMsg.id
              ? { ...m, content: msg, streaming: false, error: true }
              : m,
          ),
        );
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let assistantText = "";
      let detectedHandoff: HandoffKind | null = null;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const frames = buf.split("\n\n");
        buf = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data: ")) continue;
          let event: { type: string; text?: string; kind?: HandoffKind; message?: string };
          try {
            event = JSON.parse(line.slice(6));
          } catch {
            continue;
          }
          if (event.type === "delta" && event.text) {
            assistantText += event.text;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? { ...m, content: assistantText }
                  : m,
              ),
            );
          } else if (event.type === "handoff" && event.kind) {
            detectedHandoff = event.kind;
          } else if (event.type === "error") {
            assistantText = event.message ?? c.errorGeneric;
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id
                  ? {
                      ...m,
                      content: assistantText || c.errorGeneric,
                      streaming: false,
                      error: true,
                    }
                  : m,
              ),
            );
          } else if (event.type === "done") {
            setMessages((prev) =>
              prev.map((m) =>
                m.id === assistantMsg.id ? { ...m, streaming: false } : m,
              ),
            );
          }
        }
      }

      // Final flush: if "done" wasn't received explicitly, still un-stream.
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id ? { ...m, streaming: false } : m,
        ),
      );

      if (detectedHandoff) setHandoff(detectedHandoff);
    } catch (err) {
      console.error("[chat] send error", err);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantMsg.id
            ? { ...m, content: c.errorGeneric, streaming: false, error: true }
            : m,
        ),
      );
    } finally {
      setSending(false);
      // Turnstile tokens are single-use. Reset the widget and clear our
      // cached token so the next send waits for a fresh one — without
      // this, message #2 in any session fails Turnstile verification.
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    }
  }, [input, sending, turnstileToken, locale, c.errorGeneric]);

  const submitHandoff = useCallback(async () => {
    const email = handoffEmail.trim();
    if (!email) return;
    // Send the contact details as a user message so the route persists
    // them through the same flow (server-side detectCapturedFields runs).
    const composed = handoffMc.trim()
      ? `Email: ${email}, MC ${handoffMc.trim()}`
      : `Email: ${email}`;
    setInput(composed);
    // Defer to next tick so setInput is applied before send reads it.
    setTimeout(() => {
      send();
      setHandoffSubmitted(true);
    }, 0);
  }, [handoffEmail, handoffMc, send]);

  if (!enabled || hidden) return null;

  const handoffMsg = handoff
    ? handoff === "intent_to_sell"
      ? c.handoffSell
      : handoff === "specialist"
        ? c.handoffSpecialist
        : c.handoffTurnCap
    : null;

  const siteKey = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";

  return (
    <>
      {/* Bubble — sits above WhatsApp FAB. WhatsApp FAB owns
          bottom-[calc(safe-area+88px)] mobile / bottom-6 desktop; we
          stack ~76px higher so they don't overlap. */}
      <AnimatePresence>
        {!open && (
          <motion.button
            key="chat-bubble"
            type="button"
            aria-label={c.openLabel}
            onClick={() => setOpen(true)}
            initial={{ y: 24, opacity: 0, scale: 0.85 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 24, opacity: 0, scale: 0.85 }}
            transition={{ duration: 0.5, ease: EASE }}
            whileHover={{ scale: 1.06 }}
            whileTap={{ scale: 0.94 }}
            className="group fixed right-4 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-[#ff8a1a] text-[#0a0a0b] shadow-[0_8px_30px_rgba(255,138,26,0.4)] ring-1 ring-black/10 transition-shadow hover:shadow-[0_12px_40px_rgba(255,138,26,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#ff8a1a] focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a0a0b] md:right-6 md:h-[60px] md:w-[60px] bottom-[calc(env(safe-area-inset-bottom,0px)+170px)] md:bottom-[88px]"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
              className="h-6 w-6 md:h-7 md:w-7"
            >
              <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
            </svg>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            role="dialog"
            aria-label={c.title}
            initial={{ y: 24, opacity: 0, scale: 0.97 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 16, opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="fixed z-40 flex flex-col overflow-hidden rounded-2xl bg-[#0a0a0b]/95 ring-1 ring-white/15 backdrop-blur-2xl shadow-[0_30px_60px_rgba(0,0,0,0.5)] inset-x-4 bottom-[calc(env(safe-area-inset-bottom,0px)+88px)] top-20 md:inset-auto md:right-6 md:bottom-6 md:top-auto md:h-[600px] md:w-[400px]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.03] px-4 py-3">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#ff8a1a]/15 text-[#ff8a1a] ring-1 ring-[#ff8a1a]/30">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-5 w-5"
                  >
                    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
                  </svg>
                </span>
                <div className="flex flex-col">
                  <p className="text-sm font-semibold text-white leading-tight">
                    {c.title}
                  </p>
                  <p className="text-[11px] text-white/50 leading-tight">
                    {c.subtitle}
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label={c.closeLabel}
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full text-white/60 transition-colors hover:bg-white/10 hover:text-white"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                  className="h-4 w-4"
                >
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Messages */}
            <div
              ref={scrollRef}
              className="flex-1 overflow-y-auto px-4 py-4"
            >
              {messages.length === 0 && (
                <div className="rounded-2xl bg-white/[0.04] p-3 text-[13.5px] leading-relaxed text-white/85 ring-1 ring-white/10">
                  {c.welcome}
                </div>
              )}
              <div className="flex flex-col gap-3">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-[13.5px] leading-relaxed ${
                        m.role === "user"
                          ? "bg-[#ff8a1a] text-[#0a0a0b]"
                          : m.error
                            ? "bg-red-500/15 text-red-200 ring-1 ring-red-500/30"
                            : "bg-white/[0.06] text-white/90 ring-1 ring-white/10"
                      }`}
                    >
                      {m.content || (m.streaming ? c.thinking : "")}
                      {m.streaming && m.content && (
                        <span className="ml-0.5 inline-block h-3 w-1.5 animate-pulse bg-white/70" />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Handoff capture */}
              {handoffMsg && !handoffSubmitted && (
                <div className="mt-4 rounded-2xl bg-[#ff8a1a]/10 p-4 ring-1 ring-[#ff8a1a]/30">
                  <p className="text-[13px] leading-relaxed text-white/90">
                    {handoffMsg}
                  </p>
                  <div className="mt-3 flex flex-col gap-2">
                    <input
                      type="email"
                      autoComplete="email"
                      value={handoffEmail}
                      onChange={(e) => setHandoffEmail(e.target.value)}
                      placeholder={c.emailLabel}
                      className="rounded-lg bg-white/[0.05] px-3 py-2 text-[13px] text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-[#ff8a1a]/60"
                    />
                    <input
                      type="text"
                      inputMode="numeric"
                      value={handoffMc}
                      onChange={(e) => setHandoffMc(e.target.value)}
                      placeholder={c.mcLabel}
                      className="rounded-lg bg-white/[0.05] px-3 py-2 text-[13px] text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-[#ff8a1a]/60"
                    />
                    <button
                      type="button"
                      onClick={submitHandoff}
                      disabled={!handoffEmail.trim() || sending}
                      className="mt-1 rounded-full bg-[#ff8a1a] px-4 py-2 text-[13px] font-semibold text-[#0a0a0b] transition-colors hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {c.submitHandoff}
                    </button>
                  </div>
                </div>
              )}

              {handoffSubmitted && (
                <div className="mt-4 rounded-2xl bg-emerald-500/10 p-3 text-[13px] text-emerald-200 ring-1 ring-emerald-500/30">
                  {c.handoffThanks}
                </div>
              )}
            </div>

            {/* Composer */}
            <div className="border-t border-white/10 bg-white/[0.02] px-3 py-3">
              <div className="flex items-end gap-2">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder={c.placeholder}
                  rows={1}
                  className="max-h-32 min-h-[40px] flex-1 resize-none rounded-2xl bg-white/[0.05] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-white placeholder:text-white/40 ring-1 ring-white/10 focus:outline-none focus:ring-2 focus:ring-[#ff8a1a]/60"
                />
                <button
                  type="button"
                  onClick={send}
                  disabled={!input.trim() || sending}
                  aria-label={c.send}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#ff8a1a] text-[#0a0a0b] transition-colors hover:bg-[#ffb371] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                    className="h-4 w-4"
                  >
                    <line x1="22" y1="2" x2="11" y2="13" />
                    <polygon points="22 2 15 22 11 13 2 9 22 2" />
                  </svg>
                </button>
              </div>
              <p className="mt-2 text-[10px] leading-snug text-white/35">
                {c.poweredBy}
              </p>
            </div>

            {/* Turnstile — invisible until challenged */}
            {siteKey && (
              <Turnstile
                ref={turnstileRef}
                siteKey={siteKey}
                onToken={(t) => setTurnstileToken(t)}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

# Coordination — Customer chat widget (Slice 1)

**Status:** Spec ready, awaiting Lukas's verification before build.
**Other agent (Jarvis) writes:** the content + contract spec.
**You (the MCDOT agent) write:** all the actual code in this repo.

## Where the spec lives

Authoritative spec — read this first and code against it:

```
C:\Users\Nitropc\Desktop\Veritor-Jarvis\docs\chat-widget-spec.md
```

Also pushed to:

```
https://github.com/<Veritor-Jarvis-remote>/blob/main/docs/chat-widget-spec.md
```

The plan that explains the *why* and ownership rationale:

```
C:\Users\Nitropc\Desktop\Veritor-Jarvis\plans\ACTIVE.md
```

## Ownership boundaries

| Repo | Owner | What's in scope |
|---|---|---|
| MCDOT (this repo) | You | All TS code, React component, Vercel Route Handler, DB module, env wiring, EDGE_CONFIG flag, deploy |
| Veritor-Jarvis | Jarvis | Spec content (system prompt, refusal patterns, handoff triggers, SQL schema, interface contract). No edits to this repo. |

Jarvis will NOT edit files in MCDOT for Slice 1. If the spec needs
changes mid-build, Jarvis updates `docs/chat-widget-spec.md` and pings
Lukas to relay; you re-read and apply.

## Files you create in this repo

| Path | What |
|---|---|
| `src/app/api/chat/route.ts` | Route Handler — SSE stream, validation, rate limit, history reconstruction from DB |
| `src/lib/chat/system-prompt.ts` | Exports `getSystemPrompt(locale)` — copy text verbatim from spec §4-6 |
| `src/lib/chat/handoff.ts` | `shouldHandoff(turnCount, lastUserMessage, locale)` and `detectCapturedFields(text)` — pure functions, patterns from spec §7-8 |
| `src/lib/db/chat.ts` | `ensureTable()` + `createSession()`, `getHistory(sessionId, limit)`, `appendMessage(sessionId, role, content, tokens)` — model on `src/lib/db/leads.ts` |
| `src/components/ChatWidget.tsx` | Floating bubble, SSE consumer, sessionId persisted in localStorage, locale-aware copy |
| Layout mounts | Add `<ChatWidget />` in the `(en)`, `(es)`, `(ru)` layouts behind Edge Config flag |

## Critical contract details (don't get wrong)

1. **Client sends ONE message, not an array.** Server reconstructs
   history from `chat_messages` keyed by `sessionId`. This is the
   anti-injection defense. See spec §1.
2. **Use a SEPARATE Anthropic key** (`ANTHROPIC_API_KEY_CHAT`) from
   anything else. Spend cap in Anthropic console.
3. **Persist on stream completion**, not per-delta. Use the text
   accumulated so far even if the client disconnects.
4. **Refusal text is brand voice — copy verbatim**, do not paraphrase
   the system prompts in spec §4-6.
5. **EDGE_CONFIG kill switch** checked both client- and server-side
   so a stale client can't keep hitting the endpoint after disable.

## Pre-flight (Lukas's to-do before merge)

- [ ] `ANTHROPIC_API_KEY_CHAT` set in Vercel env vars (Production +
      Preview + Development). Separate from any other Anthropic key.
- [ ] Anthropic console: monthly spend cap on the chat key
      (recommended $50/mo Slice 1).
- [ ] `TURNSTILE_SECRET_KEY` + `NEXT_PUBLIC_TURNSTILE_SITE_KEY` set.
- [ ] `IP_HASH_SECRET` set (any 32+ byte random string).
- [ ] Edge Config namespace has `chat_widget_enabled: true` to start.
- [ ] Lukas has reviewed refusal patterns in spec §4 and confirms
      they're complete for the business.

## Verification before merging your PR

Run the curl tests in spec §11 against your Vercel preview deploy.
Specifically confirm test #5 (the prompt-injection defense) by
inspecting your `route.ts` — confirm it never reads `messages` from
the body, only `message` (singular), and that history comes from the
DB query.

If anything in the spec is ambiguous or seems wrong, leave a comment
in this file under a `## Questions for Jarvis` heading; Lukas will
relay and Jarvis will respond by updating the spec.

## What's NOT in Slice 1 (don't scope-creep)

- Blog content RAG (Slice 2)
- Admin dashboard for chat sessions (Lukas queries Neon directly for now)
- Telegram alerts on captured emails (Slice 2)
- Real-time abuse detection beyond Turnstile + rate limit (defer until we see attacks)

See `plans/ACTIVE.md` § "Out of scope for Slice 1" in the Veritor-Jarvis
repo for the rationale.

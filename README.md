# Email Reply Drafter

Drafts context-aware email replies in **your tone**, with **3 variations** (short / medium / detailed) and a **rewrite loop**. Paste the email you received, get three on-voice drafts back, refine any of them with one click, then copy or open Gmail compose prefilled.

> MVP is a standalone web app. The real Gmail extension, Gmail API integration, and tone learning from your sent mail are **stretch goals** (see below).

---

## What it does (MVP)

- **Email input** — paste the email you received: subject + body + optional sender name + optional prior-thread context.
- **Tone learning (MVP: hand-authored)** — a single editable ToneProfile (style, sentence length, emoji on/off, sign-off). Persisted as a singleton-ish row. The stretch goal learns this from your sent mail via few-shot examples.
- **3 variation drafts** — for each email, three independent non-streaming LLM calls produce a **short** (1–3 sentences), **medium** (4–7 sentences), and **detailed** (2–3 paragraphs) reply. Same context, different length instruction.
- **Rewrite loop** — click *Rewrite* on any draft with optional free-text feedback ("make it more casual", "be more concise"). The LLM receives the feedback + the previous draft + the original email context and returns a revised draft. Repeat as many times as you like.
- **Inline insert to Gmail (MVP: `mailto`-style link)** — *Open in Gmail* opens the Gmail web compose view (`https://mail.google.com/mail/?view=cm&fs=1&…`) prefilled with the reply body. A *Copy to clipboard* button is also provided.
- **Quick replies library** — canned short replies for common cases ("Thanks, got it", "Will follow up by EOW", "Can we sync next week?"). Add your own; templates support `{{senderName}}` / `{{subject}}` placeholders.

### MVP scope vs. stretch goals

| Feature | MVP | Stretch |
| --- | --- | --- |
| Email source | Paste into the web app | Real Gmail extension (Plasmo) reading the open thread |
| Tone profile | One editable row, hand-authored | Learned from your sent mail via Gmail API few-shot examples |
| Reply language | English | Multi-language replies (detect inbound language, reply in kind) |
| Attachments | Ignored | Auto-attach relevant docs retrieved from a small corpus |
| "Insert into Gmail" | `mailto`/compose-URL link + copy button | Real Gmail compose insert via the extension |

---

## Features

- Three-length variation design — each variation is an **independent** LLM call so the drafts don't collapse toward one length and can be generated (eventually) in parallel.
- Tone profile is a structured, editable object — `buildTonePromptAddon` serializes it into a deterministic system-prompt block applied to every variation.
- Rewrite loop is a separate prompt from the initial draft prompt — the model treats the previous draft as a starting point to revise, not a blank slate.
- Quick replies support `{{placeholder}}` substitution; unknown placeholders are left intact so you can fill them in.
- Offline-friendly: a deterministic `MockProvider` keeps the whole app (and the test suite) runnable without an LLM key. Set `PKC_DISABLE_LLM=1` to force it.
- Local-first storage: Prisma + SQLite, one file at `db/custom.db`.

---

## Tech stack

- **Next.js 16** (App Router) + **TypeScript 5**
- **Tailwind CSS 4** + **shadcn/ui** (New York) + **Lucide** icons
- **Prisma 6** + **SQLite** (local-first)
- **z-ai-web-dev-sdk** for LLM completions (non-streaming `complete()` per variation)
- **bun test** for the unit suite
- **eslint-config-next** for lint

---

## Architecture

```
                       ┌─────────────────────────────────────────────┐
                       │                 Browser UI                   │
                       │   src/app/page.tsx  (3 tabs: Compose | Tone  │
                       │   | Quick replies)                            │
                       └───────────────┬─────────────────────────────┘
                                       │ fetch (relative paths)
                                       ▼
                ┌────────────────────────────────────────────────────┐
                │            Next.js Route Handlers (src/app/api)     │
                │  /api/drafts            POST (gen 3) | GET (list)  │
                │  /api/drafts/[id]       GET | DELETE                │
                │  /api/drafts/[id]/rewrite   POST                   │
                │  /api/drafts/[id]/copy      POST                   │
                │  /api/tone-profiles     GET (seed) | POST          │
                │  /api/tone-profiles/[id] PATCH | DELETE            │
                │  /api/quick-replies    GET (seed) | POST           │
                │  /api/quick-replies/[id] DELETE                   │
                │  /api/stats            GET                         │
                └───────┬──────────────────────────────┬─────────────┘
                        │                              │
            ┌───────────▼──────────┐        ┌──────────▼───────────┐
            │   src/lib (pure)      │        │   Prisma + SQLite    │
            │  tone-builder         │        │   db/custom.db       │
            │  draft-builder        │        │  Draft / ToneProfile │
            │  rewrite-builder      │        │  / QuickReply        │
            │  length-variations    │        └──────────────────────┘
            │  gmail-link-builder   │
            │  quick-reply-formatter│
            │  ai (ChatProvider)    │─── ZaiProvider ──► z-ai-web-dev-sdk
            │                       │─── MockProvider ──► deterministic echo
            └───────────────────────┘
```

Data flow for one "Generate":

```
form submit ─► POST /api/drafts
                 │  resolve ToneProfile (explicit id → default → seed)
                 │  for each of [short, medium, detailed]:
                 │    buildDraftPrompt(email, tone, spec) → {system, user}
                 │    ChatProvider.complete({system, messages:[user]}) → content
                 │  variations = [{length, content}, …]
                 │  db.draft.create({ …, variations: JSON.stringify(variations) })
                 ▼
            3 variation cards in the UI
                 │  Copy / Rewrite / Open in Gmail
                 ▼
            rewrite: POST /api/drafts/[id]/rewrite { variationIndex, feedback }
                 │  buildRewritePrompt(prevDraft, feedback, originalEmail, toneAddon)
                 │  ChatProvider.complete(...) → rewritten content
                 │  db.draft.update({ variations: JSON.stringify(newArr) })
```

---

## Setup

```bash
# 1. install deps
bun install

# 2. configure env (absolute DATABASE_URL recommended)
cp .env.example .env
# edit .env if you moved the project

# 3. create the SQLite db + generate the Prisma client
bun run db:push      # uses DATABASE_URL="$(pwd)/db/custom.db" inline

# 4. run the dev server
bun run dev
# open the app via the Preview Panel (the sandbox does NOT expose localhost:3000)
```

The dev server uses port 3000. In this sandbox you can't visit `localhost:3000` directly — use the **Preview Panel** (or "Open in New Tab") on the right.

### Tests

```bash
bun test
```

The suite is pure-function unit tests (`src/lib/__tests__/*`) plus a MockProvider-based test of the AI orchestration layer. No database or LLM key is required to run the tests.

---

## Environment variables

| Variable | Required | Default | Notes |
| --- | --- | --- | --- |
| `DATABASE_URL` | yes | `file:./db/custom.db` | Absolute path recommended. `package.json` `db:*` scripts inline `DATABASE_URL="$(pwd)/db/custom.db"` for cross-process reliability. |
| `PKC_DISABLE_LLM` | no | `0` | Set to `1` to force the deterministic `MockProvider` (useful for demos/tests without an LLM key). |
| (LLM config) | no | — | Consumed by `z-ai-web-dev-sdk` when present. When absent the app falls back to `MockProvider`. |

---

## Project structure

```
38-email-reply-drafter/
├── prisma/schema.prisma        # Draft / ToneProfile / QuickReply models
├── src/
│   ├── app/
│   │   ├── layout.tsx           # root layout + Toaster
│   │   ├── globals.css          # Tailwind 4 + shadcn tokens
│   │   ├── page.tsx             # 3-tab UI (the only user-visible route)
│   │   └── api/
│   │       ├── drafts/          # POST/GET, [id] GET/DELETE, [id]/rewrite, [id]/copy
│   │       ├── tone-profiles/   # GET/POST, [id] PATCH/DELETE
│   │       ├── quick-replies/   # GET/POST, [id] DELETE
│   │       └── stats/           # GET counts
│   ├── components/ui/           # shadcn/ui subset (button, card, input, …)
│   ├── hooks/use-toast.ts
│   └── lib/
│       ├── ai.ts               # ChatProvider + generateDraftVariations + rewriteDraft
│       ├── db.ts               # Prisma client singleton
│       ├── utils.ts            # cn()
│       ├── tone-builder.ts     # buildTonePromptAddon(profile)
│       ├── draft-builder.ts    # buildDraftPrompt(email, tone, length)
│       ├── rewrite-builder.ts  # buildRewritePrompt(prevDraft, feedback, email)
│       ├── length-variations.ts# getLengthSpecs() → short/medium/detailed
│       ├── gmail-link-builder.ts# buildGmailComposeUrl(to, subject, body)
│       ├── quick-reply-formatter.ts # formatQuickReply(body, vars)
│       └── __tests__/           # 7 test files, 35+ tests
├── package.json
├── tsconfig.json
├── next.config.ts
├── tailwind.config.ts
├── postcss.config.mjs
├── components.json
├── eslint.config.mjs
├── .env.example
├── LICENSE                     # MIT
└── README.md
```

---

## Case study

### 1. Why three *independent* LLM calls instead of one call that returns all three?

A single "give me short, medium, detailed" call is tempting (1/3 the latency, 1/3 the cost). But in practice the model tends to make the three lengths collapse toward each other — the "short" one gets verbose and the "detailed" one gets terse, because they're being written with awareness of each other. Three independent calls (same context, different length instruction) keep the lengths honest: the short draft never "knows" a detailed version exists, so it stays short. The cost is 3× latency and tokens; the payoff is three drafts that actually differ in length and detail, which is the whole point of offering a choice. The orchestration is structured so the three calls can be fired in parallel later with no prompt changes (`generateDraftVariations` already loops over independent specs).

### 2. Tone profiles as a structured, editable object

Rather than a free-text "tone" string, the tone profile is structured: `styleDescription`, `sentenceLength`, `useEmoji`, `signOff`. `buildTonePromptAddon` serializes this into a deterministic block appended to the system prompt. Two wins:

- **Determinism** — the same profile always produces the same prompt text, so drafts are reproducible and you can A/B profiles cleanly.
- **Emoji gating** — when `useEmoji` is false the prompt says *nothing* about emoji (not even "don't use emoji"). Instructing a model not to do something it wouldn't do anyway just puts the idea in its head. Omitting the instruction entirely is the cleaner nudge.

### 3. The rewrite loop as a *separate* prompt

The rewrite uses a different prompt than the initial draft. The initial-draft prompt says "write a reply"; the rewrite prompt says "here is a previous draft, here is feedback, here is the original email — revise." This frames the model as an editor of an existing artifact rather than re-deriving from scratch, which preserves what was already good about the draft (structure, sign-off, acknowledged points) while applying the feedback. Passing the original email back in keeps the rewrite grounded so the model doesn't drift off-context across many rewrite iterations.

### What I'd do differently

- **Real Gmail extension (Plasmo).** The MVP's paste-into-a-web-app flow adds friction. A Plasmo extension that reads the open Gmail thread (subject, body, sender, prior messages) and renders the three-draft panel inline next to the compose box is the natural home for this. The `mailto`/compose-URL link is a fine MVP bridge but it can't pre-fill the *recipient* reliably and can't insert into an existing thread.
- **Real tone learning from your sent mail.** Instead of hand-authoring a tone profile, pull N (say 20) of your recent sent replies via the Gmail API, embed them, and present them as few-shot examples in the system prompt ("here are replies in my voice: …"). The model would then match your actual cadence, sign-off, and emoji habits far better than a `friendly-professional` label ever could. The structured ToneProfile fields become learned priors instead of free-text guesses.
- **Multi-language replies.** Detect the inbound email's language and reply in the same language (or a user-chosen language). Cheap to add (one instruction line + a language detector) but high-value for anyone who corresponds across languages.
- **Auto-attach relevant docs.** If the inbound email references something you've written about (a doc, a previous proposal), retrieve it from a small corpus and offer to attach/inline it. Turns the drafter from "writes the body" into "writes the body + gathers the evidence."
- **Parallelise the three calls.** `generateDraftVariations` is sequential today for simplicity; `Promise.all` over the three specs would cut latency to ~max(call) with no prompt changes.
- **Streaming per card.** Non-streaming `complete()` is used so all three cards render at once and the draft persists atomically. Streaming each card as it arrives is a nicer UX once the calls are parallelised.

---

## Resume bullet

> Built **Email Reply Drafter** — a Next.js 16 + Prisma + z-ai-web-dev-sdk app that drafts context-aware email replies in an editable tone profile, generating **three length variations** (short/medium/detailed) via independent LLM calls and refining any of them through a feedback-driven **rewrite loop**; shipped with 35+ pure-function unit tests, a pluggable `ChatProvider` abstraction (ZAI + offline Mock), and a Gmail compose-URL bridge.

---

## License

MIT — see [LICENSE](./LICENSE).

---

## Push to GitHub

```bash
gh repo create email-reply-drafter --public --source=. --remote=origin --push
```

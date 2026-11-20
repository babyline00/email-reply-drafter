/**
 * Drafts collection routes.
 *
 * POST   /api/drafts          — generate 3 variations for an inbound email
 *                               (3 independent LLM calls), persist as a Draft.
 * GET    /api/drafts          — list recent drafts (newest first).
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { generateDraftVariations } from '@/lib/ai'
import type { ToneProfileInput } from '@/lib/tone-builder'

export const runtime = 'nodejs'

// ---------- default tone profile seeding ----------

async function ensureDefaultToneProfile() {
  const def = await db.toneProfile.findFirst({ where: { isDefault: true } })
  if (def) return def
  const any = await db.toneProfile.findFirst({ orderBy: { createdAt: 'asc' } })
  if (any) return any
  return db.toneProfile.create({
    data: {
      name: 'Default',
      styleDescription: 'friendly-professional',
      sentenceLength: 'medium',
      useEmoji: false,
      signOff: 'Best, [my name]',
      isDefault: true,
    },
  })
}

// ---------- serializer ----------

function safeParseVariations(s: string): { length: 'short' | 'medium' | 'detailed'; content: string }[] {
  try {
    const v = JSON.parse(s)
    if (Array.isArray(v)) return v
    return []
  } catch {
    return []
  }
}

function toApiDraft(d: {
  id: string
  emailSubject: string
  emailBody: string
  senderName: string | null
  threadContext: string | null
  variations: string
  toneId: string | null
  copyCount: number
  createdAt: Date
  updatedAt: Date
}) {
  return {
    id: d.id,
    emailSubject: d.emailSubject,
    emailBody: d.emailBody,
    senderName: d.senderName,
    threadContext: d.threadContext,
    variations: safeParseVariations(d.variations),
    toneId: d.toneId,
    copyCount: d.copyCount,
    createdAt: d.createdAt.toISOString(),
    updatedAt: d.updatedAt.toISOString(),
  }
}

// ---------- POST ----------

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const {
    emailSubject,
    emailBody,
    senderName,
    threadContext,
    toneProfileId,
    tonePresetId,
  } = body ?? {}

  if (typeof emailSubject !== 'string' || !emailSubject.trim()) {
    return NextResponse.json({ error: 'emailSubject is required' }, { status: 400 })
  }
  if (typeof emailBody !== 'string' || !emailBody.trim()) {
    return NextResponse.json({ error: 'emailBody is required' }, { status: 400 })
  }

  // Resolve tone profile: explicit id → default → seed one.
  let profile
  if (typeof toneProfileId === 'string' && toneProfileId.length > 0) {
    profile = await db.toneProfile.findUnique({ where: { id: toneProfileId } })
  }
  if (!profile) {
    profile = await ensureDefaultToneProfile()
  }

  const tone: ToneProfileInput = {
    name: profile.name,
    styleDescription: profile.styleDescription,
    sentenceLength: profile.sentenceLength,
    useEmoji: profile.useEmoji,
    signOff: profile.signOff,
  }

  try {
    const variations = await generateDraftVariations(
      { subject: emailSubject, body: emailBody, senderName, threadContext },
      tone,
    )

    const draft = await db.draft.create({
      data: {
        emailSubject,
        emailBody,
        senderName: senderName ?? null,
        threadContext: threadContext ?? null,
        tonePresetId: typeof tonePresetId === 'string' ? tonePresetId : null,
        variations: JSON.stringify(variations),
        toneId: profile.id,
      },
    })

    return NextResponse.json(toApiDraft(draft), { status: 201 })
  } catch (e) {
    return NextResponse.json(
      { error: 'Draft generation failed', detail: (e as Error).message },
      { status: 500 },
    )
  }
}

// ---------- GET (list) ----------

export async function GET() {
  const drafts = await db.draft.findMany({
    orderBy: { createdAt: 'desc' },
    take: 50,
  })
  return NextResponse.json(drafts.map(toApiDraft))
}

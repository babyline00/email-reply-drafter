/**
 * Rewrite a single variation of a draft.
 *
 * POST /api/drafts/[id]/rewrite — body: { variationIndex, feedback }
 *
 * Loads the draft, takes the variation at `variationIndex`, runs rewriteDraft
 * with the original email context + the user's tone profile + the feedback,
 * and persists the new variations array. Returns the updated draft.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { rewriteDraft } from '@/lib/ai'
import type { ToneProfileInput } from '@/lib/tone-builder'

export const runtime = 'nodejs'

function safeParseVariations(s: string) {
  try {
    const v = JSON.parse(s)
    if (Array.isArray(v)) return v
    return []
  } catch {
    return []
  }
}

function toApiDraft(d: any) {
  return {
    id: d.id,
    emailSubject: d.emailSubject,
    emailBody: d.emailBody,
    senderName: d.senderName,
    threadContext: d.threadContext,
    variations: safeParseVariations(d.variations),
    toneId: d.toneId,
    copyCount: d.copyCount,
    createdAt: d.createdAt instanceof Date ? d.createdAt.toISOString() : d.createdAt,
    updatedAt: d.updatedAt instanceof Date ? d.updatedAt.toISOString() : d.updatedAt,
  }
}

export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params

  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const variationIndex = Number(body?.variationIndex)
  const feedback = typeof body?.feedback === 'string' ? body.feedback : ''

  if (!Number.isInteger(variationIndex) || variationIndex < 0) {
    return NextResponse.json({ error: 'variationIndex must be a non-negative integer' }, { status: 400 })
  }

  const draft = await db.draft.findUnique({ where: { id } })
  if (!draft) return NextResponse.json({ error: 'Draft not found' }, { status: 404 })

  const variations = safeParseVariations(draft.variations)
  if (variationIndex >= variations.length) {
    return NextResponse.json({ error: 'variationIndex out of range' }, { status: 400 })
  }

  const prevDraft = variations[variationIndex].content ?? ''

  // Resolve tone profile (optional — keeps the rewrite on-voice).
  let tone: ToneProfileInput | undefined
  if (draft.toneId) {
    const profile = await db.toneProfile.findUnique({ where: { id: draft.toneId } })
    if (profile) {
      tone = {
        name: profile.name,
        styleDescription: profile.styleDescription,
        sentenceLength: profile.sentenceLength,
        useEmoji: profile.useEmoji,
        signOff: profile.signOff,
      }
    }
  }

  try {
    const rewritten = await rewriteDraft(
      prevDraft,
      feedback,
      {
        subject: draft.emailSubject,
        body: draft.emailBody,
        senderName: draft.senderName,
        threadContext: draft.threadContext,
      },
      tone,
    )

    variations[variationIndex] = {
      ...variations[variationIndex],
      content: rewritten,
    }

    const updated = await db.draft.update({
      where: { id },
      data: { variations: JSON.stringify(variations) },
    })

    return NextResponse.json(toApiDraft(updated))
  } catch (e) {
    return NextResponse.json(
      { error: 'Rewrite failed', detail: (e as Error).message },
      { status: 500 },
    )
  }
}

/**
 * Single draft routes.
 *
 * GET    /api/drafts/[id]   — fetch one draft (with parsed variations).
 * DELETE /api/drafts/[id]   — delete a draft.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

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

export async function GET(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  const draft = await db.draft.findUnique({ where: { id } })
  if (!draft) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(toApiDraft(draft))
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    await db.draft.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

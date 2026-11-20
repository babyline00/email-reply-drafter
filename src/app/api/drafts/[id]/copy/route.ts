/**
 * Increment a draft's copy counter (lightweight stats signal).
 *
 * POST /api/drafts/[id]/copy — body ignored. Returns the new copyCount.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function POST(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    const updated = await db.draft.update({
      where: { id },
      data: { copyCount: { increment: 1 } },
    })
    return NextResponse.json({ ok: true, copyCount: updated.copyCount })
  } catch {
    return NextResponse.json({ error: 'Draft not found' }, { status: 404 })
  }
}

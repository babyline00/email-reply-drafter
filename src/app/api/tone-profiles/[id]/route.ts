/**
 * Single tone profile routes.
 *
 * PATCH   /api/tone-profiles/[id] — update fields of a profile.
 * DELETE  /api/tone-profiles/[id] — delete a profile.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function toApiProfile(p: any) {
  return {
    id: p.id,
    name: p.name,
    styleDescription: p.styleDescription,
    sentenceLength: p.sentenceLength,
    useEmoji: p.useEmoji,
    signOff: p.signOff,
    isDefault: p.isDefault,
    createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
  }
}

export async function PATCH(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const data: Record<string, unknown> = {}
  if (typeof body?.name === 'string') data.name = body.name
  if (typeof body?.styleDescription === 'string') data.styleDescription = body.styleDescription
  if (typeof body?.sentenceLength === 'string') data.sentenceLength = body.sentenceLength
  if (typeof body?.useEmoji === 'boolean') data.useEmoji = body.useEmoji
  if (typeof body?.signOff === 'string') data.signOff = body.signOff
  if (typeof body?.isDefault === 'boolean') data.isDefault = body.isDefault

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No updatable fields provided' }, { status: 400 })
  }

  // If promoting to default, clear the existing default.
  if (data.isDefault === true) {
    await db.toneProfile.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
  }

  try {
    const updated = await db.toneProfile.update({ where: { id }, data })
    return NextResponse.json(toApiProfile(updated))
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

export async function DELETE(_req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params
  try {
    await db.toneProfile.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
}

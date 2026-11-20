/**
 * Tone profile collection routes.
 *
 * GET   /api/tone-profiles — list all profiles. Seeds a default profile row
 *                            on first call so the Tone tab always has
 *                            something editable.
 * POST  /api/tone-profiles — create a new profile.
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

async function ensureDefaultProfile() {
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

export async function GET() {
  // Seed if empty so the UI always has a default profile to edit.
  await ensureDefaultProfile()
  const profiles = await db.toneProfile.findMany({ orderBy: { createdAt: 'asc' } })
  return NextResponse.json(profiles.map(toApiProfile))
}

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = typeof body?.name === 'string' ? body.name : ''
  const styleDescription = typeof body?.styleDescription === 'string' ? body.styleDescription : ''
  const sentenceLength = typeof body?.sentenceLength === 'string' ? body.sentenceLength : 'medium'
  const useEmoji = Boolean(body?.useEmoji)
  const signOff = typeof body?.signOff === 'string' ? body.signOff : null
  const isDefault = Boolean(body?.isDefault)

  if (!name.trim() || !styleDescription.trim()) {
    return NextResponse.json({ error: 'name and styleDescription are required' }, { status: 400 })
  }

  // If this new profile is the default, unset any existing default first.
  if (isDefault) {
    await db.toneProfile.updateMany({ where: { isDefault: true }, data: { isDefault: false } })
  }

  const profile = await db.toneProfile.create({
    data: { name, styleDescription, sentenceLength, useEmoji, signOff, isDefault },
  })
  return NextResponse.json(toApiProfile(profile), { status: 201 })
}

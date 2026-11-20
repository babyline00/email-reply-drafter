/**
 * Quick reply collection routes.
 *
 * GET   /api/quick-replies — list all canned replies. Seeds a handful of
 *                            starter replies on first call.
 * POST  /api/quick-replies — create a new quick reply.
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

function toApiQuick(q: any) {
  return {
    id: q.id,
    name: q.name,
    body: q.body,
    category: q.category,
    createdAt: q.createdAt instanceof Date ? q.createdAt.toISOString() : q.createdAt,
  }
}

const SEED_QUICK_REPLIES = [
  {
    name: 'Thanks, got it',
    body: "Thanks {{senderName}}, got it — I'll take a look shortly.",
    category: 'acknowledge',
  },
  {
    name: 'Will follow up by EOW',
    body: 'Thanks {{senderName}}. I\'ll follow up by end of week with details.',
    category: 'follow-up',
  },
  {
    name: 'Can we sync next week?',
    body: 'Hi {{senderName}}, can we sync next week to discuss? Let me know what day works for you.',
    category: 'follow-up',
  },
  {
    name: 'No thanks for now',
    body: 'Thanks {{senderName}}, but I\'ll pass on this one for now.',
    category: 'decline',
  },
]

async function ensureSeedQuickReplies() {
  const count = await db.quickReply.count()
  if (count > 0) return
  await db.quickReply.createMany({ data: SEED_QUICK_REPLIES })
}

export async function GET() {
  await ensureSeedQuickReplies()
  const items = await db.quickReply.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(items.map(toApiQuick))
}

export async function POST(req: Request) {
  let body: any
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const name = typeof body?.name === 'string' ? body.name : ''
  const b = typeof body?.body === 'string' ? body.body : ''
  const category = typeof body?.category === 'string' && body.category.length > 0 ? body.category : 'general'

  if (!name.trim() || !b.trim()) {
    return NextResponse.json({ error: 'name and body are required' }, { status: 400 })
  }

  const created = await db.quickReply.create({ data: { name, body: b, category } })
  return NextResponse.json(toApiQuick(created), { status: 201 })
}

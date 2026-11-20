/**
 * Aggregate stats for the dashboard header.
 *
 * GET /api/stats — { drafts, toneProfiles, quickReplies }
 */

import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const runtime = 'nodejs'

export async function GET() {
  const [drafts, toneProfiles, quickReplies] = await Promise.all([
    db.draft.count(),
    db.toneProfile.count(),
    db.quickReply.count(),
  ])
  return NextResponse.json({ drafts, toneProfiles, quickReplies })
}

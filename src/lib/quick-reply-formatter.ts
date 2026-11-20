/**
 * Quick-reply template formatter.
 *
 * Quick replies are canned short replies the user can insert with one click
 * ("Thanks, got it", "Will follow up by EOW", ...). Templates may contain
 * `{{variable}}` placeholders that get substituted with values from the
 * current email context (sender name, subject, etc.) at insert time.
 *
 * Unknown placeholders are left intact (not blanked) so the user can see what
 * wasn't substituted and fill it in manually.
 *
 * Example: formatQuickReply('Thanks {{senderName}}', { senderName: 'Sam' })
 *       -> 'Thanks Sam'
 */

export function formatQuickReply(body: string, vars: Record<string, string>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (match, key: string) => {
    if (Object.prototype.hasOwnProperty.call(vars, key)) {
      return String(vars[key])
    }
    // Leave unknown placeholders intact so the user can fill them in.
    return match
  })
}

/**
 * Build the variable map typically used when inserting a quick reply —
 * derived from the inbound email context. Frontends can extend this with
 * user-specific vars (e.g. {{myName}}) before calling formatQuickReply.
 */
export function buildQuickReplyVars(email: {
  senderName?: string | null
  subject?: string | null
  myName?: string | null
}): Record<string, string> {
  const vars: Record<string, string> = {}
  if (email.senderName) vars.senderName = email.senderName
  if (email.subject) vars.subject = email.subject
  if (email.myName) vars.myName = email.myName
  return vars
}

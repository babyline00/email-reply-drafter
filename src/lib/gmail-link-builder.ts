/**
 * Gmail compose URL builder.
 *
 * For the MVP we don't ship a real Gmail extension (that's a stretch goal).
 * Instead, "Open in Gmail" opens the Gmail web compose view prefilled with
 * the reply body via the public `https://mail.google.com/mail/?view=cm&fs=1`
 * endpoint. Empty fields are omitted so we don't pollute the URL with `to=&`
 * noise.
 *
 * Note: Gmail uses `su` (not `subject`) for the subject query param.
 */

export interface GmailComposeUrlInput {
  to?: string
  subject?: string
  body?: string
}

/**
 * Positional-arg overload kept for ergonomic call sites and for the test
 * suite. Prefer the object form in new code.
 */
export function buildGmailComposeUrl(to: string, subject: string, body: string): string
export function buildGmailComposeUrl(input: GmailComposeUrlInput): string
export function buildGmailComposeUrl(
  toOrInput: string | GmailComposeUrlInput,
  subject?: string,
  body?: string,
): string {
  let to: string | undefined
  if (typeof toOrInput === 'string') {
    to = toOrInput
  } else {
    to = toOrInput.to
    subject = toOrInput.subject
    body = toOrInput.body
  }

  const params = new URLSearchParams()
  params.set('view', 'cm')
  params.set('fs', '1')
  if (to && to.length > 0) params.set('to', to)
  if (subject && subject.length > 0) params.set('su', subject)
  if (body && body.length > 0) params.set('body', body)

  return `https://mail.google.com/mail/?${params.toString()}`
}

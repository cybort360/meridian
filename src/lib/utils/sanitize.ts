import { JSDOM } from "jsdom"
import createDOMPurify from "dompurify"

// DOMPurify needs a DOM; on the server we give it a jsdom window. Reused across
// calls so we don't spin up a window per request.
const { window } = new JSDOM("")
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const purify = createDOMPurify(window as any)

// Strip all HTML/markup from user-supplied text before persisting it. Defends
// against stored XSS in fields that are later rendered (invoice titles, buyer
// names, descriptions). Returns a trimmed, tag-free string.
export function sanitizeText(input: string): string {
  return purify.sanitize(input, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] }).trim()
}

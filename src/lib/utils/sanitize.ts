// Strip all HTML/markup from user-supplied text before persisting it. Defends
// against stored XSS in fields that are later rendered (invoice titles, buyer
// names, descriptions). Returns a trimmed, tag-free string.
//
// Implemented without jsdom/DOMPurify on purpose: those pull in a transitive
// ESM-only dependency (@exodus/bytes via html-encoding-sniffer) that crashes
// the Vercel Node runtime with ERR_REQUIRE_ESM. These fields are plain text -
// removing every tag and stray angle bracket is sufficient and keeps the
// serverless bundle lean. Values are additionally escaped by React at render.
export function sanitizeText(input: string): string {
  return input
    // Drop script/style blocks entirely, including their contents.
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    // Strip any remaining tags.
    .replace(/<[^>]*>/g, "")
    // Neutralize stray angle brackets so nothing can re-form a tag downstream.
    .replace(/[<>]/g, "")
    .trim()
}

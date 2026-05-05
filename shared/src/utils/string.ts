export function isStringEmpty(str: string | undefined | null): boolean {
  if (typeof str !== "string") return true;
  return str.trim().length === 0;
}

export function toTitleCase(str: string): string {
  if (!str || !/[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(str)) return str;
  return str
    .trim()
    .toLowerCase()
    .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}

/** Strip WhatsApp JID domain suffixes from any raw string. */
export function sanitizeJid(raw: string): string {
  return raw.replace(/@(s\.whatsapp\.net|g\.us|c\.us)$/i, "").trim();
}

/** Strip JID suffixes and title-case a display name. */
export function sanitizeName(raw: string): string {
  return toTitleCase(sanitizeJid(raw));
}

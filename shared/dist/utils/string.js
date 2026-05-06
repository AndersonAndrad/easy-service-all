"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isStringEmpty = isStringEmpty;
exports.toTitleCase = toTitleCase;
exports.sanitizeJid = sanitizeJid;
exports.sanitizeName = sanitizeName;
function isStringEmpty(str) {
    if (typeof str !== "string")
        return true;
    return str.trim().length === 0;
}
function toTitleCase(str) {
    if (!str || !/[a-zA-ZÀ-ÖØ-öø-ÿ]/.test(str))
        return str;
    return str
        .trim()
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, (c) => c.toUpperCase());
}
/** Strip WhatsApp JID domain suffixes from any raw string. */
function sanitizeJid(raw) {
    return raw.replace(/@(s\.whatsapp\.net|g\.us|c\.us)$/i, "").trim();
}
/** Strip JID suffixes and title-case a display name. */
function sanitizeName(raw) {
    return toTitleCase(sanitizeJid(raw));
}

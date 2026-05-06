"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseCreatedAt = parseCreatedAt;
exports.parseDate = parseDate;
function parseCreatedAt(o) {
    const v = o.createdAt ?? o.created_at;
    if (typeof v === "string" && v.length > 0) {
        const d = new Date(v);
        if (!Number.isNaN(d.getTime()))
            return d;
    }
    if (typeof v === "number" && Number.isFinite(v))
        return new Date(v);
    return new Date();
}
function parseDate(o, ...keys) {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "string" && v.length > 0) {
            const d = new Date(v);
            if (!Number.isNaN(d.getTime()))
                return d;
        }
        if (typeof v === "number" && Number.isFinite(v))
            return new Date(v);
    }
    return new Date();
}

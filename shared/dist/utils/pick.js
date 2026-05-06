"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pickStr = pickStr;
exports.pickNum = pickNum;
exports.pickId = pickId;
function pickStr(o, keys, fallback = "") {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "string" && v.length > 0)
            return v;
    }
    return fallback;
}
function pickNum(o, keys, fallback = 0) {
    for (const k of keys) {
        const v = o[k];
        if (typeof v === "number" && Number.isFinite(v))
            return v;
    }
    return fallback;
}
function pickId(o) {
    for (const k of ["_id", "id"]) {
        const v = o[k];
        if (typeof v === "string" && v.length > 0)
            return v;
        if (typeof v === "number" && Number.isFinite(v))
            return String(v);
        if (v && typeof v === "object" && "$oid" in v) {
            const oid = v.$oid;
            if (typeof oid === "string" && oid.length > 0)
                return oid;
        }
    }
    return "";
}

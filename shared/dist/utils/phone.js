"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizePhoneDigits = normalizePhoneDigits;
function normalizePhoneDigits(phone) {
    return phone.replace(/\D/g, "");
}

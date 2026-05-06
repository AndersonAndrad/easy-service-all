"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.authHeaders = authHeaders;
exports.authConfig = authConfig;
function authHeaders(accessToken) {
    return {
        Accept: "application/json",
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
    };
}
function authConfig(token) {
    return { headers: authHeaders(token) };
}

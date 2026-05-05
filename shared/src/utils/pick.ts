export function pickStr(o: Record<string, unknown>, keys: string[], fallback = ""): string {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
  }
  return fallback;
}

export function pickNum(o: Record<string, unknown>, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
  }
  return fallback;
}

export function pickId(o: Record<string, unknown>): string {
  for (const k of ["_id", "id"]) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) return v;
    if (typeof v === "number" && Number.isFinite(v)) return String(v);
    if (v && typeof v === "object" && "$oid" in (v as Record<string, unknown>)) {
      const oid = (v as Record<string, unknown>).$oid;
      if (typeof oid === "string" && oid.length > 0) return oid;
    }
  }
  return "";
}

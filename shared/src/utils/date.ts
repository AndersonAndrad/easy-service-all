export function parseCreatedAt(o: Record<string, unknown>): Date {
  const v = o.createdAt ?? o.created_at;
  if (typeof v === "string" && v.length > 0) {
    const d = new Date(v);
    if (!Number.isNaN(d.getTime())) return d;
  }
  if (typeof v === "number" && Number.isFinite(v)) return new Date(v);
  return new Date();
}

export function parseDate(o: Record<string, unknown>, ...keys: string[]): Date {
  for (const k of keys) {
    const v = o[k];
    if (typeof v === "string" && v.length > 0) {
      const d = new Date(v);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (typeof v === "number" && Number.isFinite(v)) return new Date(v);
  }
  return new Date();
}

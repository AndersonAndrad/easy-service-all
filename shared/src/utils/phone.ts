export function normalizePhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

import { parsePhoneNumber } from "libphonenumber-js";

export function normalizePhone(input: string) {
  try {
    const parsed = parsePhoneNumber(input, "US");
    if (!parsed || !parsed.isValid()) {
      return null;
    }
    return {
      e164: parsed.format("E.164"), // +13141592658 (for backend)
      national: parsed.format("NATIONAL"), // (314) 1592658
      digits: parsed.nationalNumber.toString(), // 3141592658 (for Supabase/SMS)
    };
  } catch {
    return null;
  }
}

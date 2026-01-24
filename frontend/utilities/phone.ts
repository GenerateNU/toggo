import { parsePhoneNumber } from "libphonenumber-js";

export function normalizePhone(input: string) {
  try {
    const parsed = parsePhoneNumber(input, "US");
    if (!parsed || !parsed.isValid()) {
      return null;
    }
    return {
      e164: parsed.format("E.164"), // +16172128890 (for backend)
      national: parsed.format("NATIONAL"), // (617) 212-8890
      digits: parsed.nationalNumber.toString(), // 6172128890 (for Supabase/SMS)
    };
  } catch {
    return null;
  }
}

/**
 * First token of a display name for greetings (e.g. "Ada Lovelace" → "Ada").
 */
export function getFirstName(
  fullName: string | null | undefined,
): string | null {
  if (!fullName?.trim()) return null;
  const first = fullName.trim().split(/\s+/)[0];
  return first ?? null;
}

export function getGreetingName(fullName: string | null | undefined): string {
  return getFirstName(fullName) ?? "there";
}

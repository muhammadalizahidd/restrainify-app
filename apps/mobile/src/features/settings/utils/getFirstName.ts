/**
 * Extract the user's first name from full name, email, or display name.
 * This utility is used by UI components that display personalized greetings.
 */
export function getFirstName(
  fullName?: string | null,
  email?: string | null,
  displayName?: string | null
): string | undefined {
  const name = fullName || displayName;
  if (name && name.trim()) {
    const first = name.trim().split(/\s+/)[0];
    if (first) return first;
  }
  if (email && email.trim()) {
    const local = email.trim().split("@")[0];
    if (local) {
      const firstChunk = local.split(/[._-]/)[0];
      if (firstChunk) {
        return firstChunk.charAt(0).toUpperCase() + firstChunk.slice(1);
      }
      return local;
    }
  }
  return undefined;
}

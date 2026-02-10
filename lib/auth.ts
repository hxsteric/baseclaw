export function extractFidFromToken(token: string): number | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1]));
    return payload.sub ? Number(payload.sub) : null;
  } catch {
    return null;
  }
}

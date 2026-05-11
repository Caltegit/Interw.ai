export function formatDecisionAuthor(
  name?: string | null,
  at?: string | null,
): string | null {
  const cleanName = name?.trim();
  if (!cleanName) return null;
  if (!at) return `Par ${cleanName}`;
  try {
    const date = new Date(at).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    return `Par ${cleanName} · le ${date}`;
  } catch {
    return `Par ${cleanName}`;
  }
}

export interface SimpleMessageItem {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  is_follow_up?: boolean;
}

interface SimpleMessageListProps {
  messages: SimpleMessageItem[];
  aiPersonaName?: string | null;
  maxHeight?: number;
}

/**
 * Liste de messages simple (non virtualisée) pour la lecture publique d'un rapport.
 */
export function SimpleMessageList({
  messages,
  aiPersonaName,
  maxHeight = 600,
}: SimpleMessageListProps) {
  return (
    <div className="overflow-y-auto" style={{ maxHeight: `${maxHeight}px` }}>
      {messages.map((m) => (
        <div key={m.id} className="px-4 py-3 border-b last:border-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-medium">
              {m.role === "ai" ? `🤖 ${aiPersonaName || "IA"}` : "👤 Candidat"}
            </span>
            <span className="text-xs text-muted-foreground">
              {new Date(m.timestamp).toLocaleTimeString("fr-FR", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
              })}
            </span>
            {m.is_follow_up && (
              <span className="text-[10px] uppercase tracking-wide text-primary font-medium">
                Relance
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{m.content}</p>
        </div>
      ))}
    </div>
  );
}

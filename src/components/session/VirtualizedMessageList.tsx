import { useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

export interface MessageItem {
  id: string;
  role: string;
  content: string;
  timestamp: string;
}

interface VirtualizedMessageListProps {
  messages: MessageItem[];
  aiPersonaName?: string | null;
  activeIndex: number | null;
  onSelect: (index: number) => void;
  /** Hauteur max du conteneur (px). Par défaut 600. */
  maxHeight?: number;
  /** Hauteur estimée d'un message (px). Par défaut 84. */
  estimateSize?: number;
}

/**
 * Liste de messages virtualisée via @tanstack/react-virtual.
 * Ne rend que les éléments visibles : reste fluide même au-delà de 1000 messages.
 */
export function VirtualizedMessageList({
  messages,
  aiPersonaName,
  activeIndex,
  onSelect,
  maxHeight = 600,
  estimateSize = 84,
}: VirtualizedMessageListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan: 6,
  });

  return (
    <div
      ref={parentRef}
      className="overflow-y-auto"
      style={{ maxHeight: `${maxHeight}px` }}
    >
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: "100%",
          position: "relative",
        }}
      >
        {virtualizer.getVirtualItems().map((vItem) => {
          const m = messages[vItem.index];
          const isActive = activeIndex === vItem.index;
          return (
            <div
              key={m.id}
              data-index={vItem.index}
              ref={virtualizer.measureElement}
              className={`px-4 py-3 border-b transition-colors hover:bg-muted/50 cursor-pointer ${
                isActive ? "bg-primary/5" : ""
              }`}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${vItem.start}px)`,
              }}
              onClick={() => onSelect(vItem.index)}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">
                  {m.role === "ai"
                    ? `🤖 ${aiPersonaName || "IA"}`
                    : "👤 Candidat"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {new Date(m.timestamp).toLocaleTimeString("fr-FR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </div>
              <p className="text-sm leading-relaxed">{m.content}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

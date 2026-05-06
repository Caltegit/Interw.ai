import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { NetworkTier } from "@/hooks/useNetworkQuality";

interface NetworkQualityIndicatorProps {
  tier: NetworkTier;
  measuredKbps: number | null;
  effectiveType: string | null;
  className?: string;
}

const LABELS: Record<NetworkTier, string> = {
  good: "Excellente",
  degraded: "Moyenne",
  poor: "Faible",
};

const COLOR_CLASS: Record<NetworkTier, string> = {
  good: "text-success",
  degraded: "text-warning",
  poor: "text-destructive",
};

const ACTIVE_BARS: Record<NetworkTier, number> = {
  good: 3,
  degraded: 2,
  poor: 1,
};

export default function NetworkQualityIndicator({
  tier,
  measuredKbps,
  effectiveType,
  className,
}: NetworkQualityIndicatorProps) {
  const active = ACTIVE_BARS[tier];
  const color = COLOR_CLASS[tier];

  const tooltip = [
    `Connexion : ${LABELS[tier]}`,
    measuredKbps != null ? `Débit estimé : ${Math.round(measuredKbps)} kbps` : null,
    effectiveType ? `Réseau : ${effectiveType.toUpperCase()}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div
            className={`inline-flex items-center gap-1.5 select-none ${className ?? ""}`}
            data-testid="network-quality-indicator"
            aria-label={`Qualité de connexion : ${LABELS[tier]}`}
          >
            <span className="flex items-end gap-0.5" aria-hidden="true">
              {[1, 2, 3].map((i) => (
                <span
                  key={i}
                  className={`w-1 rounded-sm transition-colors ${
                    i <= active ? `bg-current ${color}` : "bg-muted-foreground/25"
                  }`}
                  style={{ height: `${4 + i * 3}px` }}
                />
              ))}
            </span>
            <span className={`text-[10px] sm:text-xs font-medium ${color}`}>
              {LABELS[tier]}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="whitespace-pre-line text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

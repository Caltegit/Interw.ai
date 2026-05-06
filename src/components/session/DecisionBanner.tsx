import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Check,
  X,
  HelpCircle,
  MoreHorizontal,
  RefreshCw,
  Share2,
  Copy,
  Download,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type RecruiterDecision = "none" | "shortlisted" | "rejected" | "second_opinion";

interface DecisionBannerProps {
  candidateName: string;
  jobTitle?: string | null;
  durationLabel?: string;
  videoAnswersCount: number;
  fitScore: number | null;
  recommendation?: string | null;
  headline?: string | null;
  rankLabel?: string | null;
  decision: RecruiterDecision;
  onDecisionChange: (d: RecruiterDecision) => void;
  isDecisionPending?: boolean;
  shareUrl?: string | null;
  onShare?: () => void;
  onCopyShare?: () => void;
  copied?: boolean;
  onDownloadVideos?: () => void;
  canDownloadVideos?: boolean;
  onRegenerate?: () => void;
  isRegenerating?: boolean;
  isShareLoading?: boolean;
  readOnly?: boolean;
}

const recoConfig: Record<string, { label: string; tone: string }> = {
  strong_yes: { label: "Fortement recommandé", tone: "bg-success text-success-foreground" },
  yes: { label: "Recommandé", tone: "bg-success/85 text-success-foreground" },
  maybe: { label: "À étudier", tone: "bg-warning text-warning-foreground" },
  no: { label: "Non retenu", tone: "bg-destructive text-destructive-foreground" },
};

const decisionConfig: Record<RecruiterDecision, { label: string; tone: string }> = {
  none: { label: "Aucune décision", tone: "bg-muted text-muted-foreground" },
  shortlisted: { label: "Présélectionné", tone: "bg-success text-success-foreground" },
  rejected: { label: "Rejeté", tone: "bg-destructive text-destructive-foreground" },
  second_opinion: { label: "2e avis demandé", tone: "bg-warning text-warning-foreground" },
};

function fitColor(score: number | null) {
  if (score === null) return "text-muted-foreground";
  if (score >= 75) return "text-success";
  if (score >= 55) return "text-warning";
  return "text-destructive";
}

export function DecisionBanner(props: DecisionBannerProps) {
  const {
    candidateName,
    jobTitle,
    durationLabel,
    videoAnswersCount,
    fitScore,
    recommendation,
    headline,
    rankLabel,
    decision,
    onDecisionChange,
    isDecisionPending,
    shareUrl,
    onShare,
    onCopyShare,
    copied,
    onDownloadVideos,
    canDownloadVideos,
    onRegenerate,
    isRegenerating,
    isShareLoading,
    readOnly,
  } = props;

  const reco = recommendation ? recoConfig[recommendation] : null;
  const meta = [jobTitle, durationLabel, `${videoAnswersCount} réponse${videoAnswersCount > 1 ? "s" : ""}`]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="sticky top-0 z-30 border-primary/20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="flex flex-col gap-4 p-4 md:p-5 lg:flex-row lg:items-center">
        {/* Score circle */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex flex-col items-center justify-center rounded-2xl border bg-muted/40 p-3 min-w-[88px]">
            <span className={cn("text-3xl font-bold leading-none tabular-nums", fitColor(fitScore))}>
              {fitScore !== null ? fitScore : "—"}
            </span>
            <span className="mt-1 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
              Fit poste
            </span>
          </div>
          <div className="lg:hidden">
            <h2 className="text-base font-semibold leading-tight">{candidateName}</h2>
            <p className="text-xs text-muted-foreground">{meta}</p>
          </div>
        </div>

        {/* Main info */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="hidden lg:block">
            <h2 className="text-lg font-semibold leading-tight">{candidateName}</h2>
            <p className="text-xs text-muted-foreground">{meta}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {reco && <Badge className={reco.tone}>{reco.label}</Badge>}
            {rankLabel && (
              <Badge variant="outline" className="font-normal">
                {rankLabel}
              </Badge>
            )}
            {!readOnly && (
              <Badge className={decisionConfig[decision].tone} variant="outline">
                {decisionConfig[decision].label}
              </Badge>
            )}
          </div>
          {headline && (
            <p className="text-sm font-medium leading-snug text-foreground">« {headline} »</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <DecisionButton
            active={decision === "shortlisted"}
            onClick={() => onDecisionChange(decision === "shortlisted" ? "none" : "shortlisted")}
            disabled={isDecisionPending}
            tone="success"
            icon={Check}
            label="Présélectionner"
          />
          <DecisionButton
            active={decision === "second_opinion"}
            onClick={() =>
              onDecisionChange(decision === "second_opinion" ? "none" : "second_opinion")
            }
            disabled={isDecisionPending}
            tone="warning"
            icon={HelpCircle}
            label="2e avis"
          />
          <DecisionButton
            active={decision === "rejected"}
            onClick={() => onDecisionChange(decision === "rejected" ? "none" : "rejected")}
            disabled={isDecisionPending}
            tone="destructive"
            icon={X}
            label="Rejeter"
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9 w-9 p-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              {shareUrl ? (
                <DropdownMenuItem onClick={onCopyShare}>
                  {copied ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copied ? "Lien copié" : "Copier le lien de partage"}
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem onClick={onShare} disabled={isShareLoading}>
                  <Share2 className="mr-2 h-4 w-4" />
                  {isShareLoading ? "Génération…" : "Créer un lien de partage"}
                </DropdownMenuItem>
              )}
              {canDownloadVideos && (
                <DropdownMenuItem onClick={onDownloadVideos}>
                  <Download className="mr-2 h-4 w-4" />
                  Télécharger les vidéos
                </DropdownMenuItem>
              )}
              {onRegenerate && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onRegenerate} disabled={isRegenerating}>
                    {isRegenerating ? (
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Sparkles className="mr-2 h-4 w-4" />
                    )}
                    {isRegenerating ? "Régénération…" : "Régénérer le rapport"}
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}

function DecisionButton({
  active,
  onClick,
  disabled,
  tone,
  icon: Icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  tone: "success" | "warning" | "destructive";
  icon: typeof Check;
  label: string;
}) {
  const toneClass = active
    ? tone === "success"
      ? "bg-success text-success-foreground hover:bg-success/90 border-success"
      : tone === "warning"
      ? "bg-warning text-warning-foreground hover:bg-warning/90 border-warning"
      : "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive"
    : "";

  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className={cn("h-9 gap-1", toneClass)}
    >
      <Icon className="h-4 w-4" />
      <span className="hidden sm:inline">{label}</span>
    </Button>
  );
}

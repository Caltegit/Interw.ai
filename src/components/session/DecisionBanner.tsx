import { useState, type ReactNode } from "react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
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
  Mail,
  Trash2,
  Clock,
  ThumbsUp,
  Linkedin,
  FileText,
  UserCog,
  MicOff,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { formatDecisionAuthor } from "@/lib/decisionAuthor";

export type RecruiterDecision = "none" | "in_progress" | "shortlisted" | "rejected" | "second_opinion" | "accepted";

interface DecisionBannerProps {
  candidateName: string;
  candidateEmail?: string | null;
  jobTitle?: string | null;
  projectTitle?: string | null;
  durationLabel?: string;
  videoAnswersCount: number;
  createdAt?: string | null;
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
  onEmail?: () => void;
  onDelete?: () => void;
  readOnly?: boolean;
  decisionByName?: string | null;
  decisionAt?: string | null;
  linkedinUrl?: string | null;
  cvUrl?: string | null;
  cvFilename?: string | null;
  onEditLinks?: () => void;
  audioFailed?: boolean;
  videoSlot?: ReactNode;
  videoSlotWidth?: number;
}

const recoConfig: Record<string, { label: string; tone: string }> = {
  strong_yes: { label: "Fortement recommandé", tone: "bg-success text-success-foreground hover:bg-success" },
  yes: { label: "Recommandé", tone: "bg-success/85 text-success-foreground hover:bg-success/85" },
  maybe: { label: "À étudier", tone: "bg-warning text-warning-foreground hover:bg-warning" },
  no: { label: "Non retenu", tone: "bg-destructive text-destructive-foreground hover:bg-destructive" },
};

const decisionConfig: Record<RecruiterDecision, { label: string; tone: string }> = {
  none: { label: "Aucune décision", tone: "bg-muted text-muted-foreground" },
  rejected: { label: "Non", tone: "bg-destructive text-destructive-foreground" },
  second_opinion: { label: "À discuter", tone: "bg-warning text-warning-foreground" },
  shortlisted: { label: "Retenu", tone: "bg-success text-success-foreground" },
  in_progress: { label: "RDV", tone: "bg-info text-info-foreground" },
  accepted: { label: "Oui", tone: "bg-success-strong text-success-strong-foreground" },
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
    candidateEmail,
    jobTitle,
    projectTitle,
    durationLabel,
    videoAnswersCount,
    createdAt,
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
    onEmail,
    onDelete,
    readOnly,
    decisionByName,
    decisionAt,
    linkedinUrl,
    cvUrl,
    cvFilename,
    onEditLinks,
    audioFailed,
    videoSlot,
    videoSlotWidth = 320,
  } = props;

  const openCv = async () => {
    if (!cvUrl) return;
    try {
      const { data, error } = await supabase.storage
        .from("candidate-cvs")
        .createSignedUrl(cvUrl, 60);
      if (error || !data?.signedUrl) throw error;
      window.open(data.signedUrl, "_blank", "noopener");
    } catch {
      // silently ignore
    }
  };

  const reco = recommendation ? recoConfig[recommendation] : null;
  const authorTooltip = formatDecisionAuthor(decisionByName, decisionAt);
  const relativeDate = createdAt
    ? formatDistanceToNow(new Date(createdAt), { addSuffix: true, locale: fr }).replace("environ ", "")
    : null;

  const rawLabels = [jobTitle, projectTitle].filter(Boolean) as string[];
  const labels: string[] = [];
  rawLabels.forEach((l) => {
    if (!labels.some((existing) => existing.includes(l) || l.includes(existing))) {
      labels.push(l);
    } else if (labels.length > 0 && l.includes(labels[0])) {
      // Si le nouveau label est plus complet, on remplace
      labels[0] = l;
    }
  });
  const fullJobLabel = labels.join(" — ");

  const meta = [
    fullJobLabel,
    durationLabel,
    `${videoAnswersCount} réponse${videoAnswersCount > 1 ? "s" : ""}`,
    relativeDate,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Card className="border-primary/20 bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className={cn("flex flex-col gap-3 p-3", videoSlot ? "lg:flex-row lg:items-stretch" : "lg:flex-row lg:items-start")}>
        {/* Score circle + reco + actions */}
        <div className="flex shrink-0 items-start gap-4">
          <div className="flex flex-col items-center gap-1.5 min-w-[72px]">
            {!readOnly && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-56">
                  <DropdownMenuItem onClick={onShare}>
                    <Share2 className="mr-2 h-4 w-4" />
                    Partager ce rapport
                  </DropdownMenuItem>
                  {onEmail && (
                    <DropdownMenuItem onClick={onEmail}>
                      <Mail className="mr-2 h-4 w-4" />
                      Envoyer un e-mail
                    </DropdownMenuItem>
                  )}
                  {onEditLinks && (
                    <DropdownMenuItem onClick={onEditLinks}>
                      <UserCog className="mr-2 h-4 w-4" />
                      Ajouter LinkedIn / CV
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
                  {canDownloadVideos && (
                    <DropdownMenuItem onClick={onDownloadVideos}>
                      <Download className="mr-2 h-4 w-4" />
                      Télécharger les vidéos
                    </DropdownMenuItem>
                  )}
                  {onDelete && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={onDelete}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Supprimer
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            {audioFailed ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex w-full flex-col items-center justify-center rounded-xl border border-destructive/40 bg-destructive/10 px-2 py-1.5">
                    <MicOff className="h-7 w-7 text-destructive" />
                    <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-destructive">
                      Audio KO
                    </span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>Audio défaillant — note non calculée</TooltipContent>
              </Tooltip>
            ) : (
              <div className="flex w-full flex-col items-center justify-center rounded-xl border bg-muted/40 px-2 py-1.5">
                <span className={cn("text-2xl font-bold leading-none tabular-nums", fitColor(fitScore))}>
                  {fitScore !== null ? fitScore : "—"}
                </span>
                <span className="mt-0.5 text-[9px] font-medium uppercase tracking-wide text-muted-foreground">
                  Fit poste
                </span>
              </div>
            )}
            {reco && !audioFailed && <Badge className={cn(reco.tone, "w-full justify-center px-1.5 py-0.5 text-[10px] hover:bg-inherit")}>{reco.label}</Badge>}
          </div>
          <div className="lg:hidden min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base font-semibold leading-tight truncate">{candidateName}</h2>
              <CandidateLinkIcons
                linkedinUrl={linkedinUrl}
                cvUrl={cvUrl}
                cvFilename={cvFilename}
                onOpenCv={openCv}
                onAddLinks={onEditLinks}
              />
            </div>
            {candidateEmail && (
              <p className="text-xs text-muted-foreground truncate">{candidateEmail}</p>
            )}
            <p className="text-xs text-muted-foreground">{meta}</p>
          </div>
        </div>

        {/* Main info */}
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="hidden lg:block min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="text-base font-semibold leading-tight truncate">{candidateName}</h2>
              <CandidateLinkIcons
                linkedinUrl={linkedinUrl}
                cvUrl={cvUrl}
                cvFilename={cvFilename}
                onOpenCv={openCv}
                onAddLinks={onEditLinks}
              />
            </div>
            {candidateEmail && (
              <p className="text-xs text-muted-foreground truncate">{candidateEmail}</p>
            )}
            <p className="text-xs text-muted-foreground">{meta}</p>
          </div>
          {!readOnly && (
            <div className="flex flex-wrap items-center gap-2">
              <DecisionButton
                active={decision === "rejected"}
                onClick={() => onDecisionChange(decision === "rejected" ? "none" : "rejected")}
                disabled={isDecisionPending}
                tone="destructive"
                icon={X}
                label="Non"
                tooltip={decision === "rejected" ? authorTooltip : null}
              />
              <DecisionButton
                active={decision === "second_opinion"}
                onClick={() =>
                  onDecisionChange(decision === "second_opinion" ? "none" : "second_opinion")
                }
                disabled={isDecisionPending}
                tone="warning"
                icon={HelpCircle}
                label="À discuter"
                tooltip={decision === "second_opinion" ? authorTooltip : null}
              />
              <DecisionButton
                active={decision === "shortlisted"}
                onClick={() => onDecisionChange(decision === "shortlisted" ? "none" : "shortlisted")}
                disabled={isDecisionPending}
                tone="success"
                icon={Check}
                label="Retenu"
                tooltip={decision === "shortlisted" ? authorTooltip : null}
              />
              <DecisionButton
                active={decision === "in_progress"}
                onClick={() => onDecisionChange(decision === "in_progress" ? "none" : "in_progress")}
                disabled={isDecisionPending}
                tone="info"
                icon={Clock}
                label="RDV"
                tooltip={decision === "in_progress" ? authorTooltip : null}
              />
              <DecisionButton
                active={decision === "accepted"}
                onClick={() => onDecisionChange(decision === "accepted" ? "none" : "accepted")}
                disabled={isDecisionPending}
                tone="success-strong"
                icon={ThumbsUp}
                label="Oui"
                tooltip={decision === "accepted" ? authorTooltip : null}
              />
            </div>
          )}
          {headline && (
            <p className="text-sm font-medium leading-snug text-foreground">« {headline} »</p>
          )}
        </div>
        {videoSlot && (
          <div
            className="w-full shrink-0 lg:w-[var(--ds-video-w)]"
            style={{ ["--ds-video-w" as any]: `${videoSlotWidth}px` }}
          >
            {videoSlot}
          </div>
        )}
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
  tooltip,
}: {
  active: boolean;
  onClick: () => void;
  disabled?: boolean;
  tone: "success" | "success-strong" | "warning" | "destructive" | "info";
  icon: typeof Check;
  label: string;
  tooltip?: string | null;
}) {
  const toneClass = active
    ? tone === "success"
      ? "bg-success text-success-foreground hover:bg-success/90 border-success"
      : tone === "success-strong"
      ? "bg-success-strong text-success-strong-foreground hover:bg-success-strong/90 border-success-strong"
      : tone === "warning"
      ? "bg-warning text-warning-foreground hover:bg-warning/90 border-warning"
      : tone === "info"
      ? "bg-info text-info-foreground hover:bg-info/90 border-info"
      : "bg-destructive text-destructive-foreground hover:bg-destructive/90 border-destructive"
    : "";

  const button = (
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

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent>{tooltip}</TooltipContent>
      </Tooltip>
    );
  }
  return button;
}

function CandidateLinkIcons({
  linkedinUrl,
  cvUrl,
  cvFilename,
  onOpenCv,
  onAddLinks,
}: {
  linkedinUrl?: string | null;
  cvUrl?: string | null;
  cvFilename?: string | null;
  onOpenCv: () => void;
  onAddLinks?: () => void;
}) {
  const hasLinkedin = !!linkedinUrl;
  const hasCv = !!cvUrl;
  return (
    <div className="flex shrink-0 items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          {hasLinkedin ? (
            <a
              href={linkedinUrl!}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-6 w-6 items-center justify-center rounded text-[#0A66C2] hover:bg-muted"
              aria-label="Profil LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </a>
          ) : (
            <button
              type="button"
              onClick={onAddLinks}
              disabled={!onAddLinks}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 hover:bg-muted hover:text-foreground/70 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-muted-foreground/40"
              aria-label="Ajouter le profil LinkedIn"
            >
              <Linkedin className="h-4 w-4" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {hasLinkedin
            ? "Ouvrir le profil LinkedIn"
            : onAddLinks
              ? "Ajouter le profil LinkedIn"
              : "LinkedIn non renseigné"}
        </TooltipContent>
      </Tooltip>
      <Tooltip>
        <TooltipTrigger asChild>
          {hasCv ? (
            <button
              type="button"
              onClick={onOpenCv}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-primary hover:bg-muted"
              aria-label="Ouvrir le CV"
            >
              <FileText className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={onAddLinks}
              disabled={!onAddLinks}
              className="inline-flex h-6 w-6 items-center justify-center rounded text-muted-foreground/40 hover:bg-muted hover:text-foreground/70 disabled:cursor-default disabled:hover:bg-transparent disabled:hover:text-muted-foreground/40"
              aria-label="Ajouter le CV"
            >
              <FileText className="h-4 w-4" />
            </button>
          )}
        </TooltipTrigger>
        <TooltipContent>
          {hasCv
            ? (cvFilename ?? "Ouvrir le CV")
            : onAddLinks
              ? "Ajouter le CV"
              : "CV non renseigné"}
        </TooltipContent>
      </Tooltip>
    </div>
  );
}

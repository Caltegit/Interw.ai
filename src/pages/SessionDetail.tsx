import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { ArrowLeft, Loader2, VideoOff, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/lib/queryClient";
import {
  useSessionDetail,
  useUpdateRecruiterNotes,
  useCreateReportShare,
  useUpdateRecruiterDecision,
  useRegenerateReport,
  type RecruiterDecision,
} from "@/hooks/queries/useSessionDetail";
import { useProjectAverages } from "@/hooks/queries/useProjectAverages";
import { CandidateLinksDialog } from "@/components/session/CandidateLinksDialog";
import { ShareReportDialog } from "@/components/session/ShareReportDialog";
import { BulkEmailDialog } from "@/components/project/BulkEmailDialog";
import { SessionReportView } from "@/components/session/SessionReportView";
import { RegenerateReportDialog } from "@/components/session/RegenerateReportDialog";

import { useCopilot } from "@/contexts/CopilotContext";

export default function SessionDetail() {
  const { open: copilotOpen } = useCopilot();
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { data, isLoading } = useSessionDetail(id);
  const session = data?.session ?? null;
  const incomingReport = data?.report ?? null;
  const lastReportRef = useRef<typeof incomingReport>(null);
  const lastReportSessionIdRef = useRef<string | undefined>(undefined);
  if (lastReportSessionIdRef.current !== id) {
    lastReportSessionIdRef.current = id;
    lastReportRef.current = null;
  }
  if (incomingReport) {
    lastReportRef.current = incomingReport;
  }
  const report = incomingReport ?? lastReportRef.current;
  const messages = data?.messages ?? [];
  const shareUrl = data?.shareUrl ?? null;
  const shareExpiresAt = data?.shareExpiresAt ?? null;

  const [recruiterNotes, setRecruiterNotes] = useState("");
  const lastServerNoteRef = useRef<string | null>(null);
  const noteDirtyRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [linksOpen, setLinksOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenStartedAt, setRegenStartedAt] = useState<string | null>(null);

  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const updateNotes = useUpdateRecruiterNotes(id);
  const createShare = useCreateReportShare(id);
  const updateDecision = useUpdateRecruiterDecision(id);
  const regenerate = useRegenerateReport(id);
  const { data: projectAverages } = useProjectAverages(session?.project_id);

  const candidateMessagesWithMedia = messages.filter(
    (m: any) => m.role === "candidate" && (m.video_segment_url || m.audio_segment_url),
  );

  useEffect(() => {
    if (!session?.id) return;
    const server = session.recruiter_note ?? "";
    if (lastServerNoteRef.current === null) {
      lastServerNoteRef.current = server;
      setRecruiterNotes(server);
      return;
    }
    if (server !== lastServerNoteRef.current && !noteDirtyRef.current) {
      lastServerNoteRef.current = server;
      setRecruiterNotes(server);
    }
  }, [session?.id, session?.recruiter_note]);

  useEffect(() => {
    if (!session?.id || !noteDirtyRef.current) return;
    if (recruiterNotes === (lastServerNoteRef.current ?? "")) return;
    const t = setTimeout(() => {
      updateNotes.mutate(
        { notes: recruiterNotes },
        {
          onSuccess: () => {
            lastServerNoteRef.current = recruiterNotes;
            noteDirtyRef.current = false;
          },
        },
      );
    }, 1000);
    return () => clearTimeout(t);
  }, [recruiterNotes, session?.id]);

  const handleShare = () => setShareOpen(true);

  const generateShareLink = async () => {
    if (!report?.id || !user) return;
    try {
      await createShare.mutateAsync({ reportId: report.id, userId: user.id });
    } catch (e: any) {
      toast({ title: "Erreur", description: e.message, variant: "destructive" });
    }
  };

  const copyShareUrl = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const candidateVideos = messages.filter((m: any) => m.role === "candidate" && m.video_segment_url);

  const handleDecision = (d: RecruiterDecision) => {
    if (!user) return;
    updateDecision.mutate({ decision: d, userId: user.id }, {
      onSuccess: () => {
        if (d === "none") toast({ title: "Décision annulée." });
        else if (d === "in_progress") toast({ title: "Candidat en cours." });
        else if (d === "shortlisted") toast({ title: "Candidat retenu." });
        else if (d === "rejected") toast({ title: "Candidat noté Non." });
        else if (d === "second_opinion") toast({ title: "Candidat à discuter." });
        else if (d === "accepted") toast({ title: "Candidat accepté." });
      },
      onError: (e: any) => toast({ title: "Erreur", description: e.message, variant: "destructive" }),
    });
  };

  const handleRegenerate = () => {
    const startedAt = new Date().toISOString();
    setRegenStartedAt(startedAt);
    setRegenOpen(true);
    regenerate.mutate(undefined, {
      onError: (e: any) => {
        setRegenOpen(false);
        toast({ title: "Erreur", description: e.message, variant: "destructive" });
      },
    });
  };


  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }
  if (!session) return <p>Session introuvable.</p>;

  const handleDeleteSession = async () => {
    if (!id || deleting) return;
    setDeleting(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("delete-session", {
        body: { session_id: id },
      });
      if (error || (result as any)?.error) {
        throw new Error((result as any)?.error || error?.message || "Erreur inconnue");
      }
      toast({ title: "Session supprimée." });
      navigate(`/projects/${session.project_id}`);
    } catch (e: any) {
      toast({ title: "Suppression impossible", description: e.message ?? String(e), variant: "destructive" });
      setDeleting(false);
    }
  };

  if (candidateMessagesWithMedia.length === 0 && session.status === "completed") {
    return (
      <div className="space-y-4">
        <Button variant="ghost" size="sm" asChild className="-ml-2">
          <Link to={`/projects/${session.project_id}`}>
            <ArrowLeft className="mr-1 h-4 w-4" /> Retour au projet
          </Link>
        </Button>

        <Card>
          <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
            <div className="rounded-full bg-muted p-4">
              <VideoOff className="h-8 w-8 text-muted-foreground" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">Aucun enregistrement disponible</h2>
              <p className="text-sm text-muted-foreground">
                {session.candidate_name} a terminé l'entretien sans qu'aucune réponse vidéo ou audio
                ne soit enregistrée. Aucun rapport ne peut être généré.
              </p>
            </div>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm" disabled={deleting}>
                  <Trash2 className="mr-1 h-4 w-4" /> Supprimer la session
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Cette action est irréversible. La session, ses messages et son rapport éventuel
                    seront définitivement supprimés.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Annuler</AlertDialogCancel>
                  <AlertDialogAction
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    onClick={handleDeleteSession}
                  >
                    {deleting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Suppression…</> : "Supprimer"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </CardContent>
        </Card>
      </div>
    );
  }

  const decision = (session.recruiter_decision ?? "none") as RecruiterDecision;

  return (
    <div className="flex flex-col gap-4">
      <BulkEmailDialog
        open={emailOpen}
        onOpenChange={setEmailOpen}
        recipients={[{
          id: session.id,
          candidate_name: session.candidate_name,
          candidate_email: session.candidate_email,
        }]}
        projectTitle={session.projects?.title ?? ""}
      />

      <CandidateLinksDialog
        open={linksOpen}
        onOpenChange={setLinksOpen}
        sessionId={session.id}
        candidateName={session.candidate_name ?? null}
        initialJobTitle={(session as any).candidate_job_title ?? null}
        initialLinkedinUrl={(session as any).candidate_linkedin_url ?? null}
        initialCvUrl={(session as any).candidate_cv_url ?? null}
        initialCvFilename={(session as any).candidate_cv_filename ?? null}
        initialCoverLetterUrl={(session as any).candidate_cover_letter_url ?? null}
        initialCoverLetterFilename={(session as any).candidate_cover_letter_filename ?? null}
        onSaved={() => queryClient.invalidateQueries({ queryKey: queryKeys.session(id!) })}
      />

      <ShareReportDialog
        open={shareOpen}
        onOpenChange={setShareOpen}
        shareUrl={shareUrl}
        shareExpiresAt={shareExpiresAt}
        isGenerating={createShare.isPending}
        onGenerate={generateShareLink}
      />

      <AlertDialog open={deleteOpen} onOpenChange={(o) => !deleting && setDeleteOpen(o)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette session ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est irréversible. La session, ses messages et son rapport éventuel seront définitivement supprimés.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(e) => { e.preventDefault(); handleDeleteSession(); }}
              disabled={deleting}
            >
              {deleting ? <><Loader2 className="mr-1 h-4 w-4 animate-spin" /> Suppression…</> : "Supprimer"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <SessionReportView
        session={session}
        report={report}
        messages={messages}
        projectAverages={projectAverages}
        sessionId={id}
        copilotOpen={copilotOpen}
        decision={decision}
        onDecisionChange={handleDecision}
        isDecisionPending={updateDecision.isPending}
        shareUrl={shareUrl}
        onShare={handleShare}
        onCopyShare={copyShareUrl}
        copied={copied}
        isShareLoading={createShare.isPending}
        canDownloadVideos={candidateVideos.length > 0 || !!session.video_recording_url}
        onDownloadVideos={() => window.open(`/sessions/${id}/export`, "_blank", "noopener")}
        onRegenerate={report ? handleRegenerate : undefined}
        isRegenerating={regenerate.isPending || regenOpen}
        onEmail={session.candidate_email ? () => setEmailOpen(true) : undefined}
        onEditLinks={() => setLinksOpen(true)}
        onDelete={() => setDeleteOpen(true)}
        onOpenStats={session.project_id ? () => navigate(`/projects/${session.project_id}/stats`) : undefined}
        recruiterNotes={recruiterNotes}
        onRecruiterNotesChange={(v) => { noteDirtyRef.current = true; setRecruiterNotes(v); }}
      />

      <RegenerateReportDialog
        open={regenOpen}
        onOpenChange={setRegenOpen}
        sessionId={id}
        startedAt={regenStartedAt}
      />
    </div>
  );
}


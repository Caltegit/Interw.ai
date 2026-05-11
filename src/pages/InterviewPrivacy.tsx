import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import CandidateLayout from "@/components/CandidateLayout";
import ConsentContent from "@/components/interview/ConsentContent";
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
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Loader2, ShieldCheck, Trash2, CheckCircle2 } from "lucide-react";

export default function InterviewPrivacy() {
  const { token } = useParams();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [project, setProject] = useState<{ job_title?: string | null; title?: string | null } | null>(null);
  const [orgName, setOrgName] = useState<string>("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleted, setDeleted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!token) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      const { data } = await supabase
        .from("sessions")
        .select("id, projects:projects!inner(title, job_title, organizations:organizations(name))")
        .eq("token", token)
        .maybeSingle();
      if (cancelled) return;
      if (!data) {
        setNotFound(true);
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const p = (data as any).projects;
        setProject({ job_title: p?.job_title, title: p?.title });
        setOrgName(p?.organizations?.name || "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleDelete = async () => {
    if (!token) return;
    setDeleting(true);
    try {
      const { data, error } = await supabase.functions.invoke("candidate-self-delete", {
        body: { token },
      });
      if (error) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let serverMsg = (error as any)?.message ?? "";
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const ctx = (error as any)?.context;
          if (ctx?.text) {
            const txt = await ctx.text();
            try {
              const parsed = JSON.parse(txt);
              serverMsg = parsed?.error || serverMsg;
            } catch {
              if (txt) serverMsg = txt;
            }
          }
        } catch {
          // ignore
        }
        console.error("[candidate-self-delete] failed", error, serverMsg);
        throw new Error(serverMsg || "Erreur inconnue");
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = data as any;
      if (!result?.success) {
        const msg = result?.error || "La suppression a échoué.";
        console.error("[candidate-self-delete] non-success", result);
        throw new Error(msg);
      }
      setDeleted(true);
      setStep(0);
      toast({
        title: "Données supprimées",
        description: "Toutes les données liées à votre entretien ont été effacées.",
      });
    } catch (e) {
      toast({
        title: "Suppression impossible",
        description: e instanceof Error ? e.message : "Veuillez réessayer plus tard.",
        variant: "destructive",
      });
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <CandidateLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </CandidateLayout>
    );
  }

  if (notFound) {
    return (
      <CandidateLayout>
        <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
          <h1 className="text-2xl font-bold">Lien invalide ou expiré</h1>
          <p className="text-muted-foreground">
            Ce lien ne correspond à aucune session connue. Vos données ont peut-être déjà été supprimées.
          </p>
          <Button asChild>
            <Link to="/">Retour à l'accueil</Link>
          </Button>
        </div>
      </CandidateLayout>
    );
  }

  if (deleted) {
    return (
      <CandidateLayout>
        <div className="max-w-2xl mx-auto p-6 text-center space-y-4">
          <CheckCircle2 className="h-12 w-12 text-success mx-auto" />
          <h1 className="text-2xl font-bold">Vos données ont été supprimées</h1>
          <p className="text-muted-foreground">
            Toutes les données liées à votre entretien (vidéos, audios, transcription, rapport) ont été
            définitivement effacées de nos serveurs. Cette action est irréversible.
          </p>
        </div>
      </CandidateLayout>
    );
  }

  return (
    <CandidateLayout>
      <div className="max-w-3xl mx-auto p-6 space-y-8">
        <header className="space-y-2">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold">Mes données personnelles</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Retrouvez ici les conditions de traitement de vos données et l'option pour les supprimer
            définitivement.
          </p>
        </header>

        <section className="rounded-lg border bg-card p-6">
          <ConsentContent
            jobTitle={project?.job_title || project?.title || ""}
            orgName={orgName}
          />
        </section>

        <section className="rounded-lg border border-destructive/40 bg-destructive/5 p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Trash2 className="h-5 w-5 text-destructive" />
            <h2 className="text-lg font-semibold">Supprimer définitivement mes données</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Cette action efface immédiatement et de façon irréversible : vos enregistrements vidéo et audio,
            la transcription écrite de vos réponses, le rapport d'évaluation et toutes les métadonnées de votre
            session. Le recruteur n'aura plus accès à votre candidature.
          </p>
          <Button
            variant="destructive"
            onClick={() => setStep(1)}
            disabled={deleting}
            data-testid="candidate-self-delete-button"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Supprimer toutes mes données
          </Button>
        </section>
      </div>

      <AlertDialog open={step === 1} onOpenChange={(o) => !o && setStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Êtes-vous sûr(e) ?</AlertDialogTitle>
            <AlertDialogDescription>
              Cette action est définitive. Toutes les données liées à votre entretien seront effacées de nos
              serveurs et ne pourront pas être restaurées.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction onClick={() => setStep(2)}>Continuer</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={step === 2} onOpenChange={(o) => !o && setStep(0)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmation finale</AlertDialogTitle>
            <AlertDialogDescription>
              Confirmez-vous la suppression définitive de toutes vos données ?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Suppression…
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Supprimer définitivement
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </CandidateLayout>
  );
}

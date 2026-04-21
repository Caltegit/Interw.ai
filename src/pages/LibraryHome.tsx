import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ClipboardList, MessageSquare, ListChecks, Mic, Mail, ArrowRight, LucideIcon } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

type LibraryKey = "interviews" | "questions" | "criteria" | "intros" | "emails";

interface LibraryItem {
  key: LibraryKey;
  title: string;
  description: string;
  icon: LucideIcon;
  url: string;
  table: "interview_templates" | "question_templates" | "criteria_templates" | "intro_templates" | "email_template_overrides";
  iconClass: string;
}

const ITEMS: LibraryItem[] = [
  {
    key: "interviews",
    title: "Entretiens types",
    description: "Modèles d'entretiens prêts à dupliquer pour lancer un projet en quelques secondes.",
    icon: ClipboardList,
    url: "/library/interviews",
    table: "interview_templates",
    iconClass: "bg-primary/10 text-primary",
  },
  {
    key: "questions",
    title: "Questions",
    description: "Vos questions réutilisables (texte, audio, vidéo) avec niveau de relance et indications.",
    icon: MessageSquare,
    url: "/library/questions",
    table: "question_templates",
    iconClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  },
  {
    key: "criteria",
    title: "Critères d'évaluation",
    description: "Critères pondérés réutilisables avec ancrages de notation pour homogénéiser vos rapports.",
    icon: ListChecks,
    url: "/library/criteria",
    table: "criteria_templates",
    iconClass: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  },
  {
    key: "intros",
    title: "Intros",
    description: "Messages d'accueil audio ou vidéo joués au candidat avant l'entretien.",
    icon: Mic,
    url: "/library/intros",
    table: "intro_templates",
    iconClass: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  },
  {
    key: "emails",
    title: "Emails",
    description: "Modèles d'emails personnalisés pour l'invitation, le rappel et l'envoi des résultats.",
    icon: Mail,
    url: "/library/emails",
    table: "email_template_overrides",
    iconClass: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  },
];

export default function LibraryHome() {
  const { user } = useAuth();
  const [counts, setCounts] = useState<Record<LibraryKey, number | null>>({
    interviews: null,
    questions: null,
    criteria: null,
    intros: null,
    emails: null,
  });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data: orgId } = await supabase.rpc("get_user_organization_id", { _user_id: user.id });
      if (!orgId || cancelled) return;

      const results = await Promise.all(
        ITEMS.map((item) =>
          supabase
            .from(item.table)
            .select("*", { count: "exact", head: true })
            .eq("organization_id", orgId)
            .then(({ count }) => ({ key: item.key, count: count ?? 0 })),
        ),
      );
      if (cancelled) return;

      setCounts((prev) => {
        const next = { ...prev };
        results.forEach((r) => {
          next[r.key] = r.count;
        });
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Bibliothèque</h1>
        <p className="mt-2 text-muted-foreground">
          Réutilisez vos modèles pour gagner du temps et garder une qualité constante d'un entretien à l'autre.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((item) => {
          const Icon = item.icon;
          const count = counts[item.key];
          return (
            <Link key={item.key} to={item.url} className="group">
              <Card className="h-full transition-all hover:border-primary hover:shadow-md group-hover:scale-[1.01]">
                <CardContent className="flex h-full flex-col gap-4 p-6">
                  <div className="flex items-start justify-between">
                    <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${item.iconClass}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    {count === null ? (
                      <Skeleton className="h-5 w-12 rounded-full" />
                    ) : (
                      <Badge variant="secondary">
                        {count} {count > 1 ? "éléments" : "élément"}
                      </Badge>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="font-semibold">{item.title}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{item.description}</p>
                  </div>
                  <div className="flex items-center text-sm font-medium text-primary">
                    Ouvrir
                    <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

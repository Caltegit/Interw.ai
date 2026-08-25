import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  useAddCriterionToLibrary,
  useAddCriterionToProject,
  useAddQuestionToLibrary,
  useAddQuestionToProject,
  useCopilotMessages,
  useCreateCopilotThread,
  useSendCopilotMessage,
  type CopilotMode,
  type CriterionSuggestion,
  type QuestionSuggestion,
} from "@/hooks/queries/useCopilot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Check, Library, Plus, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";

import type { CopilotOpenContext } from "@/contexts/CopilotContext";

interface Props {
  projectId: string;
  userId: string | null;
  mode: CopilotMode;
  sessionId?: string | null;
  candidateName?: string | null;
  openedContext?: CopilotOpenContext | null;
  threadId: string | null;
  onCreatedThread: (id: string) => void;
}

const SUGGESTIONS_ANALYSIS = [
  "Quels sont les 3 candidats les plus prometteurs ?",
  "Compare les deux meilleurs candidats sur leurs forces.",
  "Quels candidats ont des points de vigilance ?",
];

const SUGGESTIONS_DESIGN = [
  "Propose-moi 5 questions pour ce poste.",
  "Mes questions couvrent-elles bien tous les critères ?",
  "Suggère 3 critères d'évaluation manquants.",
  "Améliore la formulation de mes questions actuelles.",
];

function suggestionsForCandidate(name: string): string[] {
  return [
    `Quels sont les points forts et faiblesses de ${name} ?`,
    `Rédige 5 questions de relance à poser à ${name} en second entretien.`,
    `Quels axes approfondir sur le profil de ${name} ?`,
    `Compare ${name} à la moyenne des autres candidats du poste.`,
  ];
}

interface EmptyStateCopy {
  suggestions: string[];
  title: string;
  hint: string;
  placeholder: string;
}

function emptyStateFor(
  ctx: CopilotOpenContext | null | undefined,
  mode: CopilotMode,
  sessionId: string | null | undefined,
  candidateLabel: string,
): EmptyStateCopy {
  if (sessionId || ctx?.kind === "session") {
    return {
      suggestions: suggestionsForCandidate(candidateLabel),
      title: `Approfondir le profil de ${candidateLabel}`,
      hint: "Le copilote s'appuie sur le rapport d'évaluation de ce candidat.",
      placeholder: `Posez une question sur ${candidateLabel}…`,
    };
  }
  switch (ctx?.kind) {
    case "projects-list":
      return {
        suggestions: [
          "Quels postes ont le plus de candidats à départager ?",
          "Sur quels postes manque-t-il des critères d'évaluation ?",
          "Résume l'avancement de mes postes en cours.",
        ],
        title: "Vue d'ensemble de vos postes",
        hint: "Le copilote analyse l'ensemble de vos postes et candidats.",
        placeholder: "Posez une question sur vos postes…",
      };
    case "compare":
      return {
        suggestions: [
          "Quelles différences clés entre les candidats sélectionnés ?",
          "Lequel recommander pour un second entretien et pourquoi ?",
          "Quel profil correspond le mieux aux critères prioritaires ?",
        ],
        title: "Comparer les candidats",
        hint: "Le copilote compare les profils du poste en cours.",
        placeholder: "Posez une question de comparaison…",
      };
    case "stats":
      return {
        suggestions: [
          "Quels critères discriminent le plus les candidats ?",
          "Identifie les tendances sur les soft skills.",
          "Quelle question génère les réponses les plus pauvres ?",
        ],
        title: "Lire les statistiques du poste",
        hint: "Le copilote s'appuie sur les évaluations agrégées.",
        placeholder: "Posez une question sur les statistiques…",
      };
    case "project-edit":
      return {
        suggestions: SUGGESTIONS_DESIGN,
        title: "Co-construire l'entretien",
        hint: "Le copilote connaît vos questions et critères, et peut en proposer de nouveaux.",
        placeholder: "Posez une question sur la conception de l'entretien…",
      };
    case "public-page":
      return {
        suggestions: [
          "Rédige une description attractive du poste.",
          "Propose un titre accrocheur pour cette annonce.",
          "Quels avantages mettre en avant ?",
        ],
        title: "Améliorer la page publique",
        hint: "Le copilote vous aide à rédiger une annonce engageante.",
        placeholder: "Posez une question sur la page publique…",
      };
    case "library":
      return {
        suggestions: [
          "Propose 5 nouvelles questions à ajouter à ma bibliothèque.",
          "Quels critères génériques manque-t-il dans mes ressources ?",
          "Suggère des questions adaptées à un poste commercial.",
        ],
        title: "Enrichir vos ressources",
        hint: "Le copilote vous aide à étoffer votre bibliothèque.",
        placeholder: "Posez une question sur vos ressources…",
      };
    case "project-detail":
      return {
        suggestions: SUGGESTIONS_ANALYSIS,
        title: "Analyser les candidats du poste",
        hint: "Le copilote s'appuie sur les rapports d'évaluation déjà générés.",
        placeholder: "Posez une question sur les candidats…",
      };
    default:
      return {
        suggestions: mode === "design" ? SUGGESTIONS_DESIGN : SUGGESTIONS_ANALYSIS,
        title: mode === "design" ? "Co-construisez votre entretien avec l'IA" : "Posez une question sur les candidats du poste",
        hint:
          mode === "design"
            ? "Le copilote connaît vos questions et critères, et peut en proposer de nouveaux."
            : "Le copilote s'appuie sur les rapports d'évaluation déjà générés.",
        placeholder: mode === "design" ? "Posez une question sur la conception de l'entretien…" : "Posez une question sur les candidats…",
      };
  }
}



type SuggestionBlock =
  | { kind: "questions"; items: QuestionSuggestion[] }
  | { kind: "criteria"; items: CriterionSuggestion[] };

interface Parsed {
  text: string;
  blocks: SuggestionBlock[];
}

function parseAssistantContent(content: string): Parsed {
  const blocks: SuggestionBlock[] = [];
  const re = /```json\s*([\s\S]*?)```/g;
  const text = content.replace(re, (_match, raw) => {
    try {
      const json = JSON.parse(String(raw).trim());
      if (json?.type === "questions_suggestion" && Array.isArray(json.items)) {
        blocks.push({ kind: "questions", items: json.items });
        return "";
      }
      if (json?.type === "criteria_suggestion" && Array.isArray(json.items)) {
        blocks.push({ kind: "criteria", items: json.items });
        return "";
      }
    } catch {
      // ignore parse failure, keep block visible
      return _match;
    }
    return _match;
  });
  return { text: text.trim(), blocks };
}

export function CopilotChatWindow({ projectId, userId, mode, sessionId = null, candidateName = null, openedContext = null, threadId, onCreatedThread }: Props) {
  const { data: messages = [], isLoading } = useCopilotMessages(threadId);
  const create = useCreateCopilotThread();
  const send = useSendCopilotMessage();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, send.isPending]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [threadId]);

  const handleSubmit = async (text: string) => {
    if (!userId || !text.trim()) return;
    let activeId = threadId;
    try {
      if (!activeId) {
        const t = await create.mutateAsync({ projectId, userId, mode, sessionId });
        activeId = t.id;
        onCreatedThread(t.id);
      }
      setInput("");
      await send.mutateAsync({ threadId: activeId, userMessage: text });
    } catch (e: any) {
      toast.error(e?.message || "Erreur lors de l'envoi");
      setInput(text);
    }
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(input);
    }
  };

  const isSending = send.isPending || create.isPending;
  const hasMessages = messages.length > 0;
  const candidateLabel = candidateName?.trim() || "ce candidat";
  const empty = useMemo(
    () => emptyStateFor(openedContext, mode, sessionId, candidateLabel),
    [openedContext, mode, sessionId, candidateLabel],
  );
  const { suggestions, title, hint, placeholder } = empty;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {!hasMessages && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">{title}</p>
            <p className="text-xs text-muted-foreground">{hint}</p>

            <div className="mt-2 flex flex-col gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => handleSubmit(s)}
                  disabled={isSending}
                  className="rounded-md border bg-card px-3 py-2 text-left text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-4">
          {messages.map((m) => (
            <MessageBubble
              key={m.id}
              role={m.role}
              content={m.content}
              projectId={projectId}
              userId={userId}
            />
          ))}
          {isSending && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span className="inline-flex h-2 w-2 animate-pulse rounded-full bg-primary" />
              Réflexion…
            </div>
          )}
        </div>
      </div>

      <div className="border-t bg-background p-3">
        <div className="flex items-end gap-2">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            rows={2}
            className="min-h-[60px] resize-none text-sm"
            disabled={isSending}
          />
          <Button
            type="button"
            size="icon"
            onClick={() => handleSubmit(input)}
            disabled={isSending || !input.trim()}
            aria-label="Envoyer"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          Entrée pour envoyer · Maj+Entrée pour aller à la ligne
        </p>
      </div>
    </div>
  );
}


function MessageBubble({
  role,
  content,
  projectId,
  userId,
}: {
  role: string;
  content: string;
  projectId: string;
  userId: string | null;
}) {
  const isUser = role === "user";
  const parsed = useMemo(() => (isUser ? null : parseAssistantContent(content)), [content, isUser]);

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] space-y-2 rounded-lg px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <>
            {parsed?.text && (
              <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-table:text-xs">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{parsed.text}</ReactMarkdown>
              </div>
            )}
            {parsed?.blocks.map((b, i) =>
              b.kind === "questions" ? (
                <QuestionsActions
                  key={i}
                  items={b.items}
                  projectId={projectId}
                  userId={userId}
                />
              ) : (
                <CriteriaActions
                  key={i}
                  items={b.items}
                  projectId={projectId}
                  userId={userId}
                />
              ),
            )}
          </>
        )}
      </div>
    </div>
  );
}

function useProjectOrgId(projectId: string) {
  const [orgId, setOrgId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    supabase
      .from("projects")
      .select("organization_id")
      .eq("id", projectId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setOrgId((data as any)?.organization_id ?? null);
      });
    return () => {
      cancelled = true;
    };
  }, [projectId]);
  return orgId;
}

function QuestionsActions({
  items,
  projectId,
  userId,
}: {
  items: QuestionSuggestion[];
  projectId: string;
  userId: string | null;
}) {
  const addToProject = useAddQuestionToProject();
  const addToLibrary = useAddQuestionToLibrary();
  const orgId = useProjectOrgId(projectId);
  const [done, setDone] = useState<Record<number, "project" | "library">>({});

  return (
    <div className="space-y-2 pt-1">
      {items.map((q, i) => (
        <div key={i} className="rounded-md border bg-background/60 p-2">
          {q.title && <p className="text-xs font-semibold">{q.title}</p>}
          <p className="text-xs">{q.content}</p>
          {q.rationale && (
            <p className="mt-1 text-[11px] italic text-muted-foreground">{q.rationale}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={addToProject.isPending || done[i] === "project"}
              onClick={async () => {
                try {
                  await addToProject.mutateAsync({ projectId, q });
                  setDone((d) => ({ ...d, [i]: "project" }));
                  toast.success("Question ajoutée au poste");
                } catch (e: any) {
                  toast.error(e?.message || "Erreur");
                }
              }}
            >
              {done[i] === "project" ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              Ajouter au poste
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              disabled={!orgId || !userId || addToLibrary.isPending || done[i] === "library"}
              onClick={async () => {
                if (!orgId || !userId) return;
                try {
                  await addToLibrary.mutateAsync({ organizationId: orgId, userId, q });
                  setDone((d) => ({ ...d, [i]: "library" }));
                  toast.success("Question enregistrée dans les ressources");
                } catch (e: any) {
                  toast.error(e?.message || "Erreur");
                }
              }}
            >
              <Library className="h-3 w-3" /> Ressources
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

function CriteriaActions({
  items,
  projectId,
  userId,
}: {
  items: CriterionSuggestion[];
  projectId: string;
  userId: string | null;
}) {
  const addToProject = useAddCriterionToProject();
  const addToLibrary = useAddCriterionToLibrary();
  const orgId = useProjectOrgId(projectId);
  const [done, setDone] = useState<Record<number, "project" | "library">>({});

  return (
    <div className="space-y-2 pt-1">
      {items.map((c, i) => (
        <div key={i} className="rounded-md border bg-background/60 p-2">
          <p className="text-xs font-semibold">
            {c.label}
            {typeof c.weight === "number" && (
              <span className="ml-1 font-normal text-muted-foreground">(poids {c.weight})</span>
            )}
          </p>
          {c.description && <p className="text-xs">{c.description}</p>}
          {c.rationale && (
            <p className="mt-1 text-[11px] italic text-muted-foreground">{c.rationale}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Button
              size="sm"
              variant="outline"
              className="h-7 gap-1 text-xs"
              disabled={addToProject.isPending || done[i] === "project"}
              onClick={async () => {
                try {
                  await addToProject.mutateAsync({ projectId, c });
                  setDone((d) => ({ ...d, [i]: "project" }));
                  toast.success("Critère ajouté au poste");
                } catch (e: any) {
                  toast.error(e?.message || "Erreur");
                }
              }}
            >
              {done[i] === "project" ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
              Ajouter au poste
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-7 gap-1 text-xs"
              disabled={!orgId || !userId || addToLibrary.isPending || done[i] === "library"}
              onClick={async () => {
                if (!orgId || !userId) return;
                try {
                  await addToLibrary.mutateAsync({ organizationId: orgId, userId, c });
                  setDone((d) => ({ ...d, [i]: "library" }));
                  toast.success("Critère enregistré dans les ressources");
                } catch (e: any) {
                  toast.error(e?.message || "Erreur");
                }
              }}
            >
              <Library className="h-3 w-3" /> Ressources
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

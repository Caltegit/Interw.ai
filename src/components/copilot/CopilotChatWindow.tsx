import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useCopilotMessages, useCreateCopilotThread, useSendCopilotMessage } from "@/hooks/queries/useCopilot";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  projectId: string;
  userId: string | null;
  threadId: string | null;
  onCreatedThread: (id: string) => void;
}

const SUGGESTIONS = [
  "Quels sont les 3 candidats les plus prometteurs ?",
  "Compare les deux meilleurs candidats sur leurs forces.",
  "Quels candidats ont des points de vigilance ?",
];

export function CopilotChatWindow({ projectId, userId, threadId, onCreatedThread }: Props) {
  const { data: messages = [], isLoading } = useCopilotMessages(threadId);
  const create = useCreateCopilotThread();
  const send = useSendCopilotMessage(threadId);
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
        const t = await create.mutateAsync({ projectId, userId });
        activeId = t.id;
        onCreatedThread(t.id);
      }
      setInput("");
      // Force le hook à pointer sur le bon thread après création
      await send.mutateAsync({ userMessage: text });
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

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4">
        {!hasMessages && !isLoading && (
          <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
            <Sparkles className="h-8 w-8 text-primary" />
            <p className="text-sm font-medium">Posez une question sur les candidats du projet</p>
            <p className="text-xs text-muted-foreground">
              Le copilote s'appuie sur les rapports d'évaluation déjà générés.
            </p>
            <div className="mt-2 flex flex-col gap-2">
              {SUGGESTIONS.map((s) => (
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
            <MessageBubble key={m.id} role={m.role} content={m.content} />
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
            placeholder="Posez votre question…"
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

function MessageBubble({ role, content }: { role: string; content: string }) {
  const isUser = role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[90%] rounded-lg px-3 py-2 text-sm",
          isUser ? "bg-primary text-primary-foreground" : "bg-muted text-foreground",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none dark:prose-invert prose-p:my-1 prose-headings:my-2 prose-ul:my-1 prose-ol:my-1 prose-table:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

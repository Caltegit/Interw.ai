import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
import { FeedbackStatusBadge, FeedbackStatus } from "@/components/feedback/FeedbackStatusBadge";
import { FeedbackStatusSelect } from "@/components/feedback/FeedbackStatusSelect";
import { ArrowLeft, Send, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Thread {
  id: string;
  subject: string;
  status: FeedbackStatus;
  user_id: string;
  created_at: string;
}

interface Message {
  id: string;
  thread_id: string;
  author_id: string;
  author_role: "user" | "super_admin";
  content: string;
  created_at: string;
  read_by_recipient_at: string | null;
}

// Détecte une URL d'image dans le contenu d'un message
const IMG_REGEX = /(https?:\/\/\S+\.(?:jpg|jpeg|png|webp|gif))/gi;

function renderMessageContent(content: string) {
  const parts: Array<{ type: "text" | "image"; value: string }> = [];
  let lastIndex = 0;
  const matches = [...content.matchAll(IMG_REGEX)];
  for (const m of matches) {
    const idx = m.index ?? 0;
    if (idx > lastIndex) {
      const text = content.slice(lastIndex, idx).trim();
      if (text) parts.push({ type: "text", value: text });
    }
    parts.push({ type: "image", value: m[0] });
    lastIndex = idx + m[0].length;
  }
  if (lastIndex < content.length) {
    const text = content.slice(lastIndex).trim();
    if (text) parts.push({ type: "text", value: text });
  }
  if (parts.length === 0) parts.push({ type: "text", value: content });
  return parts;
}

export default function FeedbackThread() {
  const { threadId } = useParams<{ threadId: string }>();
  const { user } = useAuth();
  const { isSuperAdmin } = useSuperAdmin();
  const navigate = useNavigate();
  const [thread, setThread] = useState<Thread | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [authorName, setAuthorName] = useState<string>("");
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!threadId || !user) return;

    const fetchAll = async () => {
      const { data: t } = await supabase.from("feedback_threads").select("*").eq("id", threadId).single();
      if (!t) return;
      setThread(t as Thread);

      const { data: m } = await supabase
        .from("feedback_messages")
        .select("*")
        .eq("thread_id", threadId)
        .order("created_at", { ascending: true });
      setMessages((m ?? []) as Message[]);

      if (isSuperAdmin) {
        const { data: prof } = await supabase
          .from("profiles")
          .select("full_name, email")
          .eq("user_id", (t as Thread).user_id)
          .maybeSingle();
        if (prof) setAuthorName(prof.full_name || prof.email);
      }

      const expectedOtherRole = isSuperAdmin ? "user" : "super_admin";
      await supabase
        .from("feedback_messages")
        .update({ read_by_recipient_at: new Date().toISOString() })
        .eq("thread_id", threadId)
        .eq("author_role", expectedOtherRole)
        .is("read_by_recipient_at", null);
    };

    fetchAll();

    const channel = supabase
      .channel(`feedback-thread-${threadId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "feedback_messages", filter: `thread_id=eq.${threadId}` },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [threadId, user, isSuperAdmin]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    if (!reply.trim() || !threadId || !user) return;
    setSending(true);
    const { error } = await supabase.from("feedback_messages").insert({
      thread_id: threadId,
      author_id: user.id,
      author_role: isSuperAdmin ? "super_admin" : "user",
      content: reply.trim(),
    });
    setSending(false);
    if (error) {
      toast.error("Envoi impossible");
      return;
    }
    setReply("");
  };

  const handleStatusChange = async (next: FeedbackStatus) => {
    if (!thread) return;
    const previous = thread.status;
    setThread({ ...thread, status: next });
    const { error } = await supabase
      .from("feedback_threads")
      .update({ status: next })
      .eq("id", thread.id);
    if (error) {
      setThread({ ...thread, status: previous });
      toast.error("Mise à jour impossible");
      return;
    }
    toast.success("Statut mis à jour");
  };

  const handleDelete = async () => {
    if (!thread) return;
    setDeleting(true);
    // Supprimer d'abord les messages, puis le thread
    const { error: msgErr } = await supabase
      .from("feedback_messages")
      .delete()
      .eq("thread_id", thread.id);
    if (msgErr) {
      setDeleting(false);
      toast.error("Suppression impossible");
      return;
    }
    const { error: threadErr } = await supabase
      .from("feedback_threads")
      .delete()
      .eq("id", thread.id);
    setDeleting(false);
    if (threadErr) {
      toast.error("Suppression impossible");
      return;
    }
    toast.success("Feedback supprimé");
    navigate("/feedback");
  };

  if (!thread) {
    return <div className="container mx-auto max-w-3xl p-6 text-muted-foreground">Chargement…</div>;
  }

  return (
    <div className="container mx-auto max-w-3xl space-y-4">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/feedback"><ArrowLeft className="h-4 w-4" /> Retour</Link>
      </Button>

      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold">{thread.subject}</h1>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {isSuperAdmin ? (
              <FeedbackStatusSelect value={thread.status} onChange={handleStatusChange} />
            ) : (
              <FeedbackStatusBadge status={thread.status} />
            )}
            {isSuperAdmin && authorName && (
              <span className="text-sm text-muted-foreground">de {authorName}</span>
            )}
          </div>
        </div>
        {isSuperAdmin && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm" className="text-destructive hover:text-destructive">
                <Trash2 className="h-4 w-4" />
                Supprimer
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer ce feedback ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action est irréversible. Le fil et tous ses messages seront définitivement supprimés.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>Annuler</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  {deleting ? "Suppression…" : "Supprimer"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      <Card className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {messages.map((m) => {
          const mine = m.author_id === user?.id;
          const parts = renderMessageContent(m.content);
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 space-y-2 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className="text-xs opacity-70">
                  {m.author_role === "super_admin" ? "Équipe Interw.ai" : "Utilisateur"} ·{" "}
                  {format(new Date(m.created_at), "d MMM HH:mm", { locale: fr })}
                </p>
                {parts.map((p, i) =>
                  p.type === "image" ? (
                    <a key={i} href={p.value} target="_blank" rel="noopener noreferrer" className="block">
                      <img
                        src={p.value}
                        alt="Pièce jointe"
                        className="max-h-64 rounded-md border border-border/30"
                      />
                    </a>
                  ) : (
                    <p key={i} className="whitespace-pre-wrap text-sm">{p.value}</p>
                  ),
                )}
              </div>
            </div>
          );
        })}
        <div ref={endRef} />
      </Card>

      <div className="flex gap-2">
        <Textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="Votre réponse…"
          rows={3}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
              e.preventDefault();
              handleSend();
            }
          }}
        />
        <Button onClick={handleSend} disabled={sending || !reply.trim()} size="icon" className="h-auto">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

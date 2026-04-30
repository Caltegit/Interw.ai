import { useEffect, useRef, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSuperAdmin } from "@/hooks/useSuperAdmin";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Send } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

interface Thread {
  id: string;
  subject: string;
  status: "open" | "resolved";
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

      // Marque comme lus les messages venant de l'autre partie
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

  const toggleStatus = async () => {
    if (!thread) return;
    const next = thread.status === "open" ? "resolved" : "open";
    const { error } = await supabase
      .from("feedback_threads")
      .update({ status: next })
      .eq("id", thread.id);
    if (error) {
      toast.error("Mise à jour impossible");
      return;
    }
    setThread({ ...thread, status: next });
    toast.success(next === "resolved" ? "Marqué comme résolu" : "Rouvert");
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
        <div>
          <h1 className="text-2xl font-bold">{thread.subject}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant={thread.status === "open" ? "default" : "secondary"}>
              {thread.status === "open" ? "Ouvert" : "Résolu"}
            </Badge>
            {isSuperAdmin && authorName && (
              <span className="text-sm text-muted-foreground">de {authorName}</span>
            )}
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={toggleStatus}>
          {thread.status === "open" ? "Marquer résolu" : "Rouvrir"}
        </Button>
      </div>

      <Card className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
        {messages.map((m) => {
          const mine = m.author_id === user?.id;
          return (
            <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[80%] rounded-lg p-3 ${mine ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                <p className="text-xs opacity-70 mb-1">
                  {m.author_role === "super_admin" ? "Équipe Interw.ai" : "Utilisateur"} ·{" "}
                  {format(new Date(m.created_at), "d MMM HH:mm", { locale: fr })}
                </p>
                <p className="whitespace-pre-wrap text-sm">{m.content}</p>
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

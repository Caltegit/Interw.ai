import { useState, useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Plus, Trash2, Pencil, Search, BookOpen, X, Check, Mic, Video, Square, Play, Pause, Type } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface QuestionTemplate {
  id: string;
  title: string;
  content: string;
  category: string | null;
  follow_up_enabled: boolean;
  max_follow_ups: number;
  organization_id: string;
  created_by: string;
  type: string;
  audio_url: string | null;
  video_url: string | null;
}

const CATEGORIES = ["Motivation", "Technique", "Soft skills", "Situationnel", "Culture fit", "Leadership"];

interface QuestionLibraryManagerProps {
  orgId: string;
}

function MediaRecorderInline({
  type,
  audioUrl,
  videoUrl,
  onMediaReady,
}: {
  type: "audio" | "video";
  audioUrl: string | null;
  videoUrl: string | null;
  onMediaReady: (blob: Blob, previewUrl: string) => void;
}) {
  const { toast } = useToast();
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(type === "audio" ? audioUrl : videoUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const previewStreamRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (recording && type === "video" && previewStreamRef.current && streamRef.current) {
      previewStreamRef.current.srcObject = streamRef.current;
      previewStreamRef.current.play().catch(() => {});
    }
  }, [recording, type]);

  const startRecording = async () => {
    try {
      const constraints = type === "audio" ? { audio: true } : { audio: true, video: true };
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      const mimeType = type === "audio" ? "audio/webm" : "video/webm";
      const mr = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mr;
      chunksRef.current = [];

      mr.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mr.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        if (previewStreamRef.current) previewStreamRef.current.srcObject = null;
        const blob = new Blob(chunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
        onMediaReady(blob, url);
      };
      mr.start(500);
      setRecording(true);
    } catch {
      toast({
        title: "Erreur",
        description: `Impossible d'accéder au ${type === "audio" ? "micro" : "caméra"}.`,
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    setRecording(false);
  };

  if (recording && type === "video") {
    return (
      <div className="space-y-2">
        <video
          ref={previewStreamRef}
          muted
          autoPlay
          playsInline
          className="w-full max-w-xs rounded-lg border border-border bg-black"
          style={{ minHeight: "120px" }}
        />
        <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
          <Square className="mr-1 h-3 w-3" /> Stop
        </Button>
      </div>
    );
  }

  if (recording) {
    return (
      <div className="flex items-center gap-2">
        <span className="flex items-center gap-1 text-xs text-destructive">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-destructive" /> Enregistrement...
        </span>
        <Button type="button" variant="destructive" size="sm" onClick={stopRecording}>
          <Square className="mr-1 h-3 w-3" /> Stop
        </Button>
      </div>
    );
  }

  if (previewUrl) {
    if (type === "audio") {
      return (
        <div className="flex items-center gap-2">
          <audio ref={audioRef} src={previewUrl} onEnded={() => setIsPlaying(false)} className="hidden" />
          <span className="text-xs text-muted-foreground">🎤 Audio enregistré</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={async () => {
              if (!audioRef.current) return;
              if (isPlaying) {
                audioRef.current.pause();
                setIsPlaying(false);
              } else {
                await audioRef.current.play();
                setIsPlaying(true);
              }
            }}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={startRecording}>
            Ré-enregistrer
          </Button>
        </div>
      );
    }
    return (
      <div className="space-y-1">
        <video
          ref={videoRef}
          src={previewUrl}
          onEnded={() => setIsPlaying(false)}
          playsInline
          className="w-full max-w-xs rounded-lg border border-border"
        />
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">🎬 Vidéo enregistrée</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 px-2"
            onClick={async () => {
              if (!videoRef.current) return;
              if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
              } else {
                await videoRef.current.play();
                setIsPlaying(true);
              }
            }}
          >
            {isPlaying ? <Pause className="h-3 w-3" /> : <Play className="h-3 w-3" />}
          </Button>
          <Button type="button" variant="outline" size="sm" className="h-7 px-2 text-xs" onClick={startRecording}>
            Ré-enregistrer
          </Button>
        </div>
      </div>
    );
  }

  return (
    <Button type="button" variant="outline" size="sm" onClick={startRecording}>
      {type === "audio" ? (
        <>
          <Mic className="mr-1 h-3 w-3" /> Enregistrer audio
        </>
      ) : (
        <>
          <Video className="mr-1 h-3 w-3" /> Enregistrer vidéo
        </>
      )}
    </Button>
  );
}

export function QuestionLibraryManager({ orgId }: QuestionLibraryManagerProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [templates, setTemplates] = useState<QuestionTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState<string>("all");

  // Add form
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newCategory, setNewCategory] = useState<string>("");
  const [newFollowUp, setNewFollowUp] = useState(true);
  const [newType, setNewType] = useState<string>("written");
  const [newMediaBlob, setNewMediaBlob] = useState<Blob | null>(null);
  const [adding, setAdding] = useState(false);
  const [showForm, setShowForm] = useState(false);

  // Edit
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editFollowUp, setEditFollowUp] = useState(true);

  const fetchTemplates = async () => {
    const { data, error } = await supabase
      .from("question_templates")
      .select("*")
      .eq("organization_id", orgId)
      .order("created_at", { ascending: false });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setTemplates(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (orgId) fetchTemplates();
  }, [orgId]);

  const uploadMedia = async (blob: Blob, type: "audio" | "video"): Promise<string | null> => {
    const ext = "webm";
    const path = `question-templates/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("media").upload(path, blob, {
      contentType: type === "audio" ? "audio/webm" : "video/webm",
    });
    if (error) {
      toast({ title: "Erreur upload", description: error.message, variant: "destructive" });
      return null;
    }
    const { data: urlData } = supabase.storage.from("media").getPublicUrl(path);
    return urlData.publicUrl;
  };

  const handleAdd = async () => {
    if (!user) return;
    if (newType === "written" && !newContent.trim()) return;
    if ((newType === "audio" || newType === "video") && !newMediaBlob && !newContent.trim()) return;

    setAdding(true);

    let audioUrl: string | null = null;
    let videoUrl: string | null = null;

    if (newMediaBlob) {
      const url = await uploadMedia(newMediaBlob, newType as "audio" | "video");
      if (!url) {
        setAdding(false);
        return;
      }
      if (newType === "audio") audioUrl = url;
      else videoUrl = url;
    }

    const { error } = await supabase.from("question_templates").insert({
      title: newTitle.trim(),
      content: newContent.trim() || (newType === "audio" ? "Question audio" : "Question vidéo"),
      category: newCategory || null,
      follow_up_enabled: newFollowUp,
      max_follow_ups: newFollowUp ? 2 : 0,
      organization_id: orgId,
      created_by: user.id,
      type: newType,
      audio_url: audioUrl,
      video_url: videoUrl,
    });
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setNewTitle("");
      setNewContent("");
      setNewCategory("");
      setNewFollowUp(true);
      setNewType("written");
      setNewMediaBlob(null);
      setShowForm(false);
      fetchTemplates();
      toast({ title: "Question ajoutée à la bibliothèque !" });
    }
    setAdding(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("question_templates").delete().eq("id", id);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setTemplates((t) => t.filter((q) => q.id !== id));
    }
  };

  const startEdit = (t: QuestionTemplate) => {
    setEditingId(t.id);
    setEditContent(t.content);
    setEditCategory(t.category || "");
    setEditFollowUp(t.follow_up_enabled);
  };

  const handleSaveEdit = async () => {
    if (!editingId || !editContent.trim()) return;
    const { error } = await supabase
      .from("question_templates")
      .update({
        content: editContent.trim(),
        category: editCategory || null,
        follow_up_enabled: editFollowUp,
        max_follow_ups: editFollowUp ? 2 : 0,
      })
      .eq("id", editingId);
    if (error) {
      toast({ title: "Erreur", description: error.message, variant: "destructive" });
    } else {
      setEditingId(null);
      fetchTemplates();
    }
  };

  const filtered = templates.filter((t) => {
    const matchSearch = !search || t.content.toLowerCase().includes(search.toLowerCase());
    const matchCat = filterCategory === "all" || t.category === filterCategory;
    return matchSearch && matchCat;
  });

  const categories = [...new Set(templates.map((t) => t.category).filter(Boolean))] as string[];

  const typeLabel = (type: string) => {
    if (type === "audio") return "🎤 Audio";
    if (type === "video") return "🎬 Vidéo";
    return "✏️ Écrite";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <BookOpen className="h-5 w-5" /> Bibliothèque de questions
        </CardTitle>
        <CardDescription>Créez vos questions types ({templates.length})</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search & Filter */}
        <div className="flex gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes</SelectItem>
              {categories.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setShowForm(!showForm)}>
            <Plus className="mr-1 h-4 w-4" /> Ajouter
          </Button>
        </div>

        {/* Add form */}
        {showForm && (
          <div className="rounded-lg border p-4 space-y-3 bg-muted/30">
            {/* Type selector */}
            <div>
              <Label className="text-xs mb-1.5 block">Type de question</Label>
              <ToggleGroup
                type="single"
                value={newType}
                onValueChange={(v) => {
                  if (v) {
                    setNewType(v);
                    setNewMediaBlob(null);
                  }
                }}
              >
                <ToggleGroupItem value="written" className="text-xs gap-1">
                  <Type className="h-3.5 w-3.5" /> Écrite
                </ToggleGroupItem>
                <ToggleGroupItem value="audio" className="text-xs gap-1">
                  <Mic className="h-3.5 w-3.5" /> Audio
                </ToggleGroupItem>
                <ToggleGroupItem value="video" className="text-xs gap-1">
                  <Video className="h-3.5 w-3.5" /> Vidéo
                </ToggleGroupItem>
              </ToggleGroup>
            </div>

            <Input
              placeholder={
                newType === "written" ? "Texte de la question..." : "Description / titre de la question (optionnel)..."
              }
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
            />

            {/* Media recorder for audio/video */}
            {(newType === "audio" || newType === "video") && (
              <MediaRecorderInline
                type={newType as "audio" | "video"}
                audioUrl={null}
                videoUrl={null}
                onMediaReady={(blob) => setNewMediaBlob(blob)}
              />
            )}

            <div className="flex gap-2 items-end flex-wrap">
              <div className="flex-1 min-w-[150px]">
                <Label className="text-xs">Catégorie</Label>
                <Select value={newCategory} onValueChange={setNewCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir..." />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={newFollowUp} onCheckedChange={setNewFollowUp} id="new-followup" />
                <Label htmlFor="new-followup" className="text-xs cursor-pointer">
                  Relance IA
                </Label>
              </div>
              <Button
                size="sm"
                onClick={handleAdd}
                disabled={
                  adding ||
                  (newType === "written" && !newContent.trim()) ||
                  ((newType === "audio" || newType === "video") && !newMediaBlob && !newContent.trim())
                }
              >
                {adding ? "Ajout..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        )}

        {/* List */}
        {loading ? (
          <p className="text-sm text-muted-foreground">Chargement...</p>
        ) : filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {templates.length === 0 ? "Aucune question dans la bibliothèque." : "Aucun résultat."}
          </p>
        ) : (
          <div className="space-y-2">
            {filtered.map((t) => (
              <div key={t.id} className="rounded-lg border p-3 flex items-start gap-2">
                {editingId === t.id ? (
                  <div className="flex-1 space-y-2">
                    <Input value={editContent} onChange={(e) => setEditContent(e.target.value)} />
                    <div className="flex gap-2 items-end flex-wrap">
                    <Select value={editCategory || "_none"} onValueChange={(v) => setEditCategory(v === "_none" ? "" : v)}>
                        <SelectTrigger className="w-[150px]">
                          <SelectValue placeholder="Catégorie" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="_none">Aucune</SelectItem>
                          {CATEGORIES.map((c) => (
                            <SelectItem key={c} value={c}>
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="flex items-center gap-2">
                        <Switch checked={editFollowUp} onCheckedChange={setEditFollowUp} />
                        <Label className="text-xs">Relance</Label>
                      </div>
                      <Button size="icon" variant="ghost" onClick={handleSaveEdit}>
                        <Check className="h-4 w-4 text-primary" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => setEditingId(null)}>
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm">{t.content}</p>
                      <div className="flex gap-1.5 mt-1 flex-wrap">
                        <Badge variant="outline" className="text-xs">
                          {typeLabel(t.type)}
                        </Badge>
                        {t.category && (
                          <Badge variant="secondary" className="text-xs">
                            {t.category}
                          </Badge>
                        )}
                        {t.follow_up_enabled && (
                          <Badge variant="outline" className="text-xs">
                            Relance IA
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => startEdit(t)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

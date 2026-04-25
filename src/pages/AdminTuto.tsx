import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

const VIDEO_URL =
  "https://qxszgsxdktnwqabsdfvw.supabase.co/storage/v1/object/public/tutorials/tutoriel-creation-session.mp4";

export default function AdminTuto() {
  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold">Tutoriel — Création d'une session</h1>
          <p className="text-muted-foreground">Vidéo de présentation du parcours de création.</p>
        </div>
        <Button asChild>
          <a href={VIDEO_URL} download="tutoriel-creation-session.mp4">
            <Download className="mr-2 h-4 w-4" />
            Télécharger le MP4
          </a>
        </Button>
      </div>

      <div className="rounded-lg overflow-hidden border bg-black">
        <video
          src={VIDEO_URL}
          controls
          playsInline
          className="w-full h-auto"
        />
      </div>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import TiptapLink from "@tiptap/extension-link";

export default function ProjectPublicPage() {
  const { slugPublic } = useParams<{ slugPublic: string }>();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<{
    content: any;
    cover_image_url: string | null;
    seo_title: string | null;
    seo_description: string | null;
    project: { title: string; slug: string | null; organization_id: string | null } | null;
    org: { name: string; logo_url: string | null } | null;
  } | null>(null);

  useEffect(() => {
    if (!slugPublic) return;
    (async () => {
      const { data: page } = await supabase
        .from("project_public_pages")
        .select("content, cover_image_url, seo_title, seo_description, project_id")
        .eq("slug_public", slugPublic)
        .eq("enabled", true)
        .maybeSingle();

      if (!page) {
        setData(null);
        setLoading(false);
        return;
      }

      const { data: proj } = await supabase
        .from("projects")
        .select("title, slug, organization_id")
        .eq("id", page.project_id)
        .maybeSingle();

      let org = null;
      if (proj?.organization_id) {
        const { data: o } = await supabase
          .from("organizations")
          .select("name, logo_url")
          .eq("id", proj.organization_id)
          .maybeSingle();
        org = o;
      }

      setData({ ...page, project: proj, org });
      setLoading(false);
    })();
  }, [slugPublic]);

  useEffect(() => {
    if (data?.seo_title || data?.project?.title) {
      document.title = data?.seo_title || data?.project?.title || "Annonce";
    }
    if (data?.seo_description) {
      let m = document.querySelector('meta[name="description"]');
      if (!m) {
        m = document.createElement("meta");
        m.setAttribute("name", "description");
        document.head.appendChild(m);
      }
      m.setAttribute("content", data.seo_description);
    }
  }, [data]);

  const editor = useEditor(
    {
      editable: false,
      extensions: [StarterKit, Image, TiptapLink],
      content: data?.content && Object.keys(data.content).length ? data.content : "<p></p>",
    },
    [data?.content],
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-2 p-6 text-center">
        <h1 className="text-2xl font-bold">Page introuvable</h1>
        <p className="text-muted-foreground">Cette annonce n'est pas disponible.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto flex items-center gap-3 px-4 py-3">
          {data.org?.logo_url && <img src={data.org.logo_url} alt="" className="h-8 w-8 rounded object-contain" />}
          <span className="font-medium">{data.org?.name}</span>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-8">
        {data.cover_image_url && (
          <img src={data.cover_image_url} alt="" className="mb-6 w-full rounded-lg object-cover max-h-80" />
        )}
        <h1 className="text-3xl font-bold mb-6">{data.project?.title}</h1>

        <article className="prose prose-sm sm:prose max-w-none">
          <EditorContent editor={editor} />
        </article>

        {data.project?.slug && (
          <div className="mt-10 flex justify-center">
            <Button size="lg" asChild>
              <Link to={`/session/${data.project.slug}`}>Postuler à cet entretien</Link>
            </Button>
          </div>
        )}
      </main>

      <div className="sticky bottom-0 border-t bg-background/90 backdrop-blur md:hidden">
        {data.project?.slug && (
          <div className="container mx-auto p-3">
            <Button className="w-full" asChild>
              <Link to={`/session/${data.project.slug}`}>Postuler à cet entretien</Link>
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

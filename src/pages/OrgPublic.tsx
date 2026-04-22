import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Building2, Briefcase, ArrowRight } from "lucide-react";

interface Org {
  id: string;
  name: string;
  logo_url: string | null;
  slug: string;
}

interface Project {
  id: string;
  title: string;
  job_title: string;
  description: string;
  slug: string | null;
}

export default function OrgPublic() {
  const { slug } = useParams<{ slug: string }>();
  const [org, setOrg] = useState<Org | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!slug) return;
    (async () => {
      const { data: orgData } = await supabase
        .from("organizations")
        .select("id, name, logo_url, slug")
        .eq("slug", slug)
        .maybeSingle();

      if (!orgData) {
        setNotFound(true);
        setLoading(false);
        return;
      }
      setOrg(orgData as Org);

      const { data: projectsData } = await supabase
        .from("projects")
        .select("id, title, job_title, description, slug")
        .eq("organization_id", orgData.id)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setProjects((projectsData as Project[]) || []);
      setLoading(false);
    })();
  }, [slug]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Chargement…</div>;
  }

  if (notFound || !org) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
        <Building2 className="h-12 w-12 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Organisation introuvable</h1>
        <p className="text-muted-foreground">Cette page n'existe pas ou n'est plus active.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b">
        <div className="container mx-auto px-4 py-8 flex flex-col items-center gap-4 text-center">
          {org.logo_url ? (
            <img src={org.logo_url} alt={org.name} className="h-16 w-16 rounded-lg object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-lg bg-primary/10 flex items-center justify-center">
              <Building2 className="h-8 w-8 text-primary" />
            </div>
          )}
          <div>
            <h1 className="text-3xl font-bold">{org.name}</h1>
            <p className="text-muted-foreground mt-1">Découvrez nos opportunités</p>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-10 max-w-4xl">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Briefcase className="h-5 w-5" /> Postes ouverts ({projects.length})
        </h2>

        {projects.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Aucun poste ouvert pour le moment.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {projects.map((p) => (
              <Card key={p.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <CardTitle className="text-lg">{p.title}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {p.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3">{p.description}</p>
                  )}
                  {p.slug && (
                    <Button asChild size="sm">
                      <Link to={`/session/${p.slug}`}>
                        Postuler <ArrowRight className="ml-2 h-4 w-4" />
                      </Link>
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      <footer className="border-t mt-12 py-6 text-center text-sm text-muted-foreground">
        Propulsé par <a href="https://interw.ai" className="font-medium hover:text-foreground">Interw.ai</a>
      </footer>
    </div>
  );
}

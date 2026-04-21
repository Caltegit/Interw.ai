import { ReactNode, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface CandidateLayoutProps {
  children: ReactNode;
  /** If true, uses a minimal header (e.g. during interview) */
  minimal?: boolean;
}

export default function CandidateLayout({ children, minimal = false }: CandidateLayoutProps) {
  const params = useParams();
  const slug = (params as any).slug as string | undefined;
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [orgName, setOrgName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    if (!slug) {
      setLogoUrl(null);
      setOrgName("");
      return;
    }
    (async () => {
      // Try to find the org via the project slug → organizations.logo_url
      const { data: project } = await supabase
        .from("projects")
        .select("organization_id, organizations:organization_id(name, logo_url)")
        .eq("slug", slug)
        .maybeSingle();
      if (cancelled) return;
      const org = (project as any)?.organizations;
      if (org) {
        setLogoUrl(org.logo_url ?? null);
        setOrgName(org.name ?? "");
      } else {
        // Fallback: maybe slug is an org slug directly
        const { data: orgRow } = await supabase
          .from("organizations")
          .select("name, logo_url")
          .eq("slug", slug)
          .maybeSingle();
        if (cancelled) return;
        setLogoUrl(orgRow?.logo_url ?? null);
        setOrgName(orgRow?.name ?? "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return (
    <div className="candidate-layout min-h-screen flex flex-col relative overflow-hidden">
      <div className="candidate-bg-grid" aria-hidden="true" />
      <div className="candidate-hero-glow" aria-hidden="true" />

      <header
        className={`candidate-header sticky top-0 z-40 flex items-center justify-between ${
          minimal ? "py-2.5 px-4" : "py-3 px-5 sm:px-6"
        }`}
      >
        {/* Org logo only — nothing if no logo. Non-cliquable en mode minimal (entretien en cours). */}
        <div className="flex items-center gap-2 min-h-[28px] pointer-events-none select-none">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt={orgName ? `Logo ${orgName}` : "Logo organisation"}
              className="h-7 w-auto max-w-[160px] object-contain"
              draggable={false}
            />
          ) : null}
        </div>

        <div
          className="hidden sm:flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
          style={{
            borderColor: "hsl(var(--l-border))",
            color: "hsl(var(--l-fg) / 0.7)",
            background: "hsl(var(--l-bg-elev) / 0.5)",
          }}
        >
          <ShieldCheck className="h-3.5 w-3.5" style={{ color: "hsl(var(--l-accent))" }} />
          <span>Entretien sécurisé</span>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-8 relative z-10">{children}</main>

      <footer
        className="candidate-footer text-center text-[11px] py-3 relative z-10"
        style={{ opacity: 0.5 }}
      >
        Propulsé par <span className="font-medium">Interw.ai</span>
      </footer>
    </div>
  );
}

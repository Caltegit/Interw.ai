import { ReactNode, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import logoMorning from "@/assets/logo-morning-white.webp";

interface CandidateLayoutProps {
  children: ReactNode;
  /** If true, uses a minimal header (e.g. during interview) */
  minimal?: boolean;
}

export default function CandidateLayout({ children, minimal = false }: CandidateLayoutProps) {
  const { slug } = useParams<{ slug?: string }>();
  const [orgLogoUrl, setOrgLogoUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    let cancelled = false;
    (async () => {
      const { data: project } = await supabase
        .from("projects")
        .select("organization_id")
        .eq("slug", slug)
        .maybeSingle();
      if (!project?.organization_id || cancelled) return;
      const { data: org } = await supabase
        .from("organizations")
        .select("logo_url")
        .eq("id", project.organization_id)
        .maybeSingle();
      if (!cancelled && org?.logo_url) setOrgLogoUrl(org.logo_url);
    })();
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const logoSrc = orgLogoUrl ?? logoMorning;

  return (
    <div className="candidate-layout min-h-screen flex flex-col">
      {/* Header with Morning logo */}
      <header className={`candidate-header flex items-center ${minimal ? "justify-center py-3 px-4" : "justify-between py-5 px-6"}`}>
        <img
          src={logoSrc}
          alt="Logo"
          className={minimal ? "h-6 object-contain" : "h-8 object-contain"}
        />
        {!minimal && (
          <span className="candidate-header-tagline text-sm font-light tracking-wide opacity-70">
            Recrutement
          </span>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 flex items-center justify-center px-4 pb-8">
        {children}
      </main>

      {/* Footer */}
      {!minimal && (
        <footer className="candidate-footer text-center py-4 px-4">
          <p className="text-xs opacity-50">
            © {new Date().getFullYear()} Morning · Propulsé par InterviewAI
          </p>
        </footer>
      )}
    </div>
  );
}

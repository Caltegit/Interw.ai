import { ReactNode } from "react";
import { Sparkles, ShieldCheck } from "lucide-react";

interface CandidateLayoutProps {
  children: ReactNode;
  /** If true, uses a minimal header (e.g. during interview) */
  minimal?: boolean;
}

export default function CandidateLayout({ children, minimal = false }: CandidateLayoutProps) {
  return (
    <div className="candidate-layout min-h-screen flex flex-col relative overflow-hidden">
      <div className="candidate-bg-grid" aria-hidden="true" />
      <div className="candidate-hero-glow" aria-hidden="true" />

      <header
        className={`candidate-header sticky top-0 z-40 flex items-center justify-between ${
          minimal ? "py-2.5 px-4" : "py-3 px-5 sm:px-6"
        }`}
      >
        <a href="/" className="flex items-center gap-2 group">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{
              background: "linear-gradient(135deg, hsl(var(--l-accent)), hsl(var(--l-accent-2)))",
              boxShadow: "0 4px 12px -4px hsl(var(--l-accent) / 0.6)",
            }}
          >
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <span className="text-sm font-semibold tracking-tight">Interw.ai</span>
        </a>

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

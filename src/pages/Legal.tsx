import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function Legal() {
  useEffect(() => {
    document.title = "Mentions légales — Interw.ai";
  }, []);

  return (
    <div className="landing-root min-h-screen">
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "hsl(var(--l-bg) / 0.7)", borderBottom: "1px solid hsl(var(--l-border))" }}>
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "linear-gradient(135deg, hsl(var(--l-accent)), hsl(var(--l-accent-2)))" }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Interw.ai</span>
          </Link>
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm" style={{ color: "hsl(var(--l-fg-dim))" }}>
            <ArrowLeft className="h-3.5 w-3.5" /> Retour
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-16">
        <h1 className="text-4xl font-semibold landing-gradient-text">Mentions légales</h1>
        <div className="mt-10 space-y-8 text-sm leading-relaxed" style={{ color: "hsl(var(--l-fg-dim))" }}>
          <section>
            <h2 className="text-lg font-semibold text-white">Éditeur du site</h2>
            <p className="mt-2">
              Interw.ai — service en cours d'édition.<br />
              Pour toute information : <a href="mailto:hello@interw.ai" className="underline">hello@interw.ai</a>
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Hébergement</h2>
            <p className="mt-2">
              Le site et les données sont hébergés dans l'Union européenne par notre fournisseur d'infrastructure cloud.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Propriété intellectuelle</h2>
            <p className="mt-2">
              L'ensemble des contenus (textes, visuels, logos) reste la propriété d'Interw.ai. Toute reproduction sans autorisation est interdite.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Contact</h2>
            <p className="mt-2">
              Pour toute question relative aux présentes mentions, écrivez-nous à <a href="mailto:hello@interw.ai" className="underline">hello@interw.ai</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

import { Link } from "react-router-dom";
import { useEffect } from "react";
import { Sparkles, ArrowLeft } from "lucide-react";

export default function Privacy() {
  useEffect(() => {
    document.title = "Confidentialité & RGPD — Interw.ai";
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
        <h1 className="text-4xl font-semibold landing-gradient-text">Confidentialité & RGPD</h1>
        <p className="mt-4 text-sm" style={{ color: "hsl(var(--l-fg-dim))" }}>
          Dernière mise à jour : {new Date().toLocaleDateString("fr-FR", { year: "numeric", month: "long" })}
        </p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed" style={{ color: "hsl(var(--l-fg-dim))" }}>
          <section>
            <h2 className="text-lg font-semibold text-white">Notre engagement</h2>
            <p className="mt-2">
              Interw.ai est conçu pour respecter le Règlement Général sur la Protection des Données (RGPD).
              Les données candidats appartiennent au recruteur et sont hébergées dans l'Union européenne.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Données collectées</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Identité du candidat (nom, adresse électronique).</li>
              <li>Enregistrements vidéo et audio de la session, transcription.</li>
              <li>Évaluations et notes générées par l'IA.</li>
              <li>Données techniques minimales (date, navigateur).</li>
            </ul>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Consentement</h2>
            <p className="mt-2">
              Avant chaque session, le candidat reçoit une information claire et donne son consentement explicite avant tout enregistrement.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Conservation</h2>
            <p className="mt-2">
              La durée de conservation est paramétrable par le recruteur, dans les limites légales applicables au recrutement.
            </p>
          </section>
          <section>
            <h2 className="text-lg font-semibold text-white">Vos droits</h2>
            <p className="mt-2">
              Accès, rectification, effacement, portabilité, opposition : pour exercer vos droits, écrivez à <a href="mailto:hello@interw.ai" className="underline">hello@interw.ai</a>.
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}

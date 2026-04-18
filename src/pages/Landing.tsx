import { useEffect } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import {
  ArrowRight,
  Brain,
  CalendarClock,
  CheckCircle2,
  ClipboardList,
  LineChart,
  Library,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";

const CONTACT_EMAIL = "hello@interw.ai";
const CONTACT_SUBJECT = "Demande de démo Interw.ai";
const CONTACT_BODY = "Bonjour,\n\nJe souhaiterais planifier une démo d'Interw.ai.\n\nMerci !";

function handleContactClick(e: React.MouseEvent<HTMLAnchorElement>) {
  e.preventDefault();
  const subject = encodeURIComponent(CONTACT_SUBJECT);
  const body = encodeURIComponent(CONTACT_BODY);
  const mailto = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}&su=${subject}&body=${body}`;

  // Try the default mail client
  window.location.href = mailto;

  // Fallback: if no mail handler, the page stays visible — open Gmail web compose
  setTimeout(() => {
    if (!document.hidden) {
      window.open(gmail, "_blank", "noopener,noreferrer");
      navigator.clipboard?.writeText(CONTACT_EMAIL).catch(() => {});
      toast({
        title: "Email copié",
        description: `Écrivez-nous à ${CONTACT_EMAIL}`,
      });
    }
  }, 600);
}

export default function Landing() {
  const { session, loading } = useAuth();

  useEffect(() => {
    document.title = "Interw.ai — Entretiens vidéo IA pour le recrutement";
    const desc = "Interw.ai automatise vos entretiens de présélection : entretien vidéo conversationnel mené par une IA, scoring objectif, rapports détaillés.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, []);

  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing-root min-h-screen">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-md" style={{ background: "hsl(var(--l-bg) / 0.7)", borderBottom: "1px solid hsl(var(--l-border))" }}>
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-md" style={{ background: "linear-gradient(135deg, hsl(var(--l-accent)), hsl(var(--l-accent-2)))" }}>
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Interw.ai</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm md:flex" style={{ color: "hsl(var(--l-fg-dim))" }}>
            <a href="#features" className="hover:text-white transition-colors">Fonctionnalités</a>
            <a href="#how" className="hover:text-white transition-colors">Comment ça marche</a>
            <a href="#why" className="hover:text-white transition-colors">Pourquoi Interw</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm hover:text-white transition-colors" style={{ color: "hsl(var(--l-fg-dim))" }}>
              Connexion
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} onClick={handleContactClick} className="landing-btn-primary inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium">
              Demander une démo <ArrowRight className="h-3.5 w-3.5" />
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="landing-bg-grid absolute inset-0 -z-10" />
        <div className="landing-hero-glow absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-6 pt-24 pb-28 text-center md:pt-32 md:pb-36">
          <div className="landing-fade-up inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "hsl(var(--l-border))", color: "hsl(var(--l-fg-dim))" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--l-accent))" }} />
            Plateforme d'entretien IA pour les RH
          </div>
          <h1 className="landing-fade-up landing-delay-1 mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[1.05] md:text-7xl">
            <span className="landing-gradient-text">Présélectionnez 10× plus vite.</span>
            <br />
            <span className="landing-accent-text">Avec un entretien IA.</span>
          </h1>
          <p className="landing-fade-up landing-delay-2 mx-auto mt-6 max-w-2xl text-base md:text-lg" style={{ color: "hsl(var(--l-fg-dim))" }}>
            Interw.ai mène des entretiens vidéo conversationnels à la place de vos recruteurs.
            Scoring objectif, rapports détaillés, expérience candidat soignée.
          </p>
          <div className="landing-fade-up landing-delay-3 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={`mailto:${CONTACT_EMAIL}`} onClick={handleContactClick} className="landing-btn-primary inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium">
              Demander une démo <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/login" className="landing-btn-ghost inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium">
              Se connecter
            </Link>
          </div>

          {/* Mock product card */}
          <div className="landing-fade-up landing-delay-3 mx-auto mt-20 max-w-4xl">
            <div className="landing-card overflow-hidden text-left shadow-2xl">
              <div className="flex items-center gap-1.5 border-b px-4 py-3 landing-divider">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                <span className="ml-3 text-xs" style={{ color: "hsl(var(--l-fg-dim))" }}>interw.ai/interview</span>
              </div>
              <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
                <div className="aspect-video rounded-lg" style={{ background: "linear-gradient(135deg, hsl(var(--l-accent) / 0.2), hsl(var(--l-accent-2) / 0.15))", border: "1px solid hsl(var(--l-border))" }}>
                  <div className="flex h-full items-center justify-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full" style={{ background: "hsl(var(--l-accent) / 0.3)" }}>
                      <Video className="h-7 w-7" />
                    </div>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wider" style={{ color: "hsl(var(--l-fg-dim))" }}>Question 2 / 5</div>
                  <p className="text-sm leading-relaxed">
                    « Pouvez-vous me décrire un projet où vous avez dû gérer un conflit dans votre équipe ? »
                  </p>
                  <div className="space-y-2 pt-3">
                    {["Communication", "Leadership", "Esprit d'équipe"].map((c) => (
                      <div key={c} className="flex items-center justify-between rounded-md px-3 py-2 text-xs" style={{ background: "hsl(var(--l-bg-elev))", border: "1px solid hsl(var(--l-border))" }}>
                        <span>{c}</span>
                        <span style={{ color: "hsl(var(--l-accent))" }}>évalué</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why */}
      <section id="why" className="border-t landing-divider">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--l-accent))" }}>
                Le problème
              </div>
              <h2 className="mt-3 text-3xl md:text-4xl">
                <span className="landing-gradient-text">La présélection vous coûte des heures.</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed" style={{ color: "hsl(var(--l-fg-dim))" }}>
                Les recruteurs passent en moyenne 23 minutes par candidat en entretien téléphonique.
                Multiplié par 50 candidatures, c'est une semaine entière par poste.
                Et les biais inconscients restent inévitables.
              </p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { k: "10×", v: "plus rapide qu'un entretien téléphonique" },
                { k: "100%", v: "des candidats évalués sur les mêmes critères" },
                { k: "24/7", v: "vos candidats passent l'entretien quand ils veulent" },
                { k: "0", v: "biais lié à la fatigue du recruteur" },
              ].map((s) => (
                <div key={s.k} className="landing-card p-5">
                  <div className="text-3xl font-semibold landing-accent-text">{s.k}</div>
                  <div className="mt-2 text-sm" style={{ color: "hsl(var(--l-fg-dim))" }}>{s.v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t landing-divider">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--l-accent))" }}>
              Fonctionnalités
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl landing-gradient-text">
              Tout ce qu'il faut pour recruter mieux.
            </h2>
            <p className="mt-4 text-base" style={{ color: "hsl(var(--l-fg-dim))" }}>
              Une suite complète, pensée pour les équipes RH modernes.
            </p>
          </div>

          <div className="mt-14 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: Brain, title: "Entretien IA conversationnel", desc: "Une IA mène l'entretien, pose des questions de suivi pertinentes et adapte le ton à chaque candidat." },
              { icon: LineChart, title: "Scoring automatique", desc: "Chaque réponse est notée selon vos critères d'évaluation. Transparent, objectif, reproductible." },
              { icon: ClipboardList, title: "Rapports détaillés", desc: "Synthèse exécutive, points forts, axes d'amélioration, recommandation. Prêt à partager." },
              { icon: Library, title: "Bibliothèque de questions", desc: "Réutilisez vos meilleures questions et vos critères entre projets. Capitalisez sur votre expertise." },
              { icon: Video, title: "Enregistrement vidéo", desc: "Revoyez les moments clés avec les transcripts horodatés. Partagez avec vos managers." },
              { icon: ShieldCheck, title: "RGPD natif", desc: "Hébergement européen, consentement explicite, durée de conservation paramétrable." },
            ].map((f) => (
              <div key={f.title} className="landing-card p-6 transition-transform hover:-translate-y-1">
                <div className="flex h-9 w-9 items-center justify-center rounded-md" style={{ background: "hsl(var(--l-accent) / 0.15)", color: "hsl(var(--l-accent))" }}>
                  <f.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "hsl(var(--l-fg-dim))" }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="border-t landing-divider">
        <div className="mx-auto max-w-6xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--l-accent))" }}>
              Comment ça marche
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl landing-gradient-text">
              Trois étapes. Aucun setup compliqué.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", icon: ClipboardList, title: "Créez votre projet", desc: "Définissez le poste, vos questions, vos critères de scoring. Quelques minutes suffisent." },
              { n: "02", icon: CalendarClock, title: "Envoyez le lien", desc: "Vos candidats reçoivent un lien unique. Ils passent l'entretien depuis leur navigateur, quand ils veulent." },
              { n: "03", icon: CheckCircle2, title: "Recevez les rapports", desc: "Une note globale, une recommandation, et tous les détails. Décidez en quelques minutes." },
            ].map((s) => (
              <div key={s.n} className="landing-card relative p-6">
                <div className="text-xs font-mono" style={{ color: "hsl(var(--l-fg-dim))" }}>{s.n}</div>
                <div className="mt-4 flex h-9 w-9 items-center justify-center rounded-md" style={{ background: "hsl(var(--l-accent) / 0.15)", color: "hsl(var(--l-accent))" }}>
                  <s.icon className="h-4 w-4" />
                </div>
                <h3 className="mt-4 text-base font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "hsl(var(--l-fg-dim))" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t landing-divider">
        <div className="mx-auto max-w-4xl px-6 py-28 text-center">
          <h2 className="text-4xl font-semibold md:text-5xl landing-gradient-text">
            Prêt à transformer vos entretiens ?
          </h2>
          <p className="mx-auto mt-5 max-w-xl text-base" style={{ color: "hsl(var(--l-fg-dim))" }}>
            Réservez une démo de 20 minutes. On vous montre comment Interw.ai s'intègre à votre process.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a href={`mailto:${CONTACT_EMAIL}`} onClick={handleContactClick} className="landing-btn-primary inline-flex h-11 items-center gap-2 rounded-md px-6 text-sm font-medium">
              Demander une démo <ArrowRight className="h-4 w-4" />
            </a>
            <Link to="/login" className="landing-btn-ghost inline-flex h-11 items-center gap-2 rounded-md px-6 text-sm font-medium">
              Se connecter
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t landing-divider">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs md:flex-row" style={{ color: "hsl(var(--l-fg-dim))" }}>
          <div className="flex items-center gap-2">
            <div className="flex h-5 w-5 items-center justify-center rounded" style={{ background: "linear-gradient(135deg, hsl(var(--l-accent)), hsl(var(--l-accent-2)))" }}>
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span>© {new Date().getFullYear()} Interw.ai — Tous droits réservés</span>
          </div>
          <div className="flex items-center gap-5">
            <a href={`mailto:${CONTACT_EMAIL}`} onClick={handleContactClick} className="hover:text-white transition-colors">Contact</a>
            <a href="#" className="hover:text-white transition-colors">Mentions légales</a>
            <a href="#" className="hover:text-white transition-colors">RGPD</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

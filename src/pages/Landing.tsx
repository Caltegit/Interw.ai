import { useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DemoRequestDialog from "@/components/landing/DemoRequestDialog";
import candidateView from "@/assets/landing-candidate-view.jpg";
import {
  ArrowRight,
  Brain,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronDown,
  ClipboardList,
  Clock,
  LineChart,
  Library,
  Quote,
  ShieldCheck,
  Sparkles,
  Star,
  Play,
  Volume2,
  Video,
  X,
} from "lucide-react";

function HeroProductMock() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showVideo, setShowVideo] = useState(false);
  const [hasUnmuted, setHasUnmuted] = useState(false);
  const [ended, setEnded] = useState(false);
  const startedRef = useRef(false);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.4) {
          if (!startedRef.current) {
            startedRef.current = true;
            setShowVideo(true);
          }
          videoRef.current?.play().catch(() => {});
        } else if (startedRef.current) {
          videoRef.current?.pause();
        }
      },
      { threshold: [0, 0.4, 0.6] },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const enableSound = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    v.volume = 1;
    setHasUnmuted(true);
    v.play().catch(() => {});
  };

  return (
    <div
      ref={containerRef}
      className="relative aspect-video overflow-hidden rounded-lg"
      style={{ border: "1px solid hsl(var(--l-border))" }}
    >
      <img
        src={candidateView}
        alt="Aperçu de la vue candidat pendant un entretien Interw.ai"
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
        style={{ opacity: showVideo ? 0 : 1 }}
      />
      <video
        ref={videoRef}
        src="/demo-interwai-20s.mp4"
        poster={candidateView}
        muted
        playsInline
        preload="metadata"
        controls={ended}
        onEnded={() => setEnded(true)}
        className="absolute inset-0 h-full w-full object-cover transition-opacity duration-300"
        style={{ opacity: showVideo ? 1 : 0 }}
      />
      <div className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-md bg-black/50 px-2 py-1 text-[11px] backdrop-blur-md">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-red-400" /> En direct
      </div>
    </div>
  );
}

export default function Landing() {
  const { session, loading } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const openDemo = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setDemoOpen(true);
  };

  useEffect(() => {
    document.title = "Interw.ai — Sessions vidéo IA pour le recrutement";
    const desc = "Interw.ai automatise vos entretiens de présélection : sessions vidéo conversationnelles menées par une IA, notation objective et rapports détaillés.";
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
            <a href="#how" className="hover:text-white transition-colors">Fonctionnement</a>
            <a href="#pricing" className="hover:text-white transition-colors">Tarifs</a>
            <a href="#faq" className="hover:text-white transition-colors">Questions</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm hover:text-white transition-colors" style={{ color: "hsl(var(--l-fg-dim))" }}>
              Se connecter
            </Link>
            <button type="button" onClick={openDemo} className="landing-btn-primary inline-flex h-9 items-center gap-1.5 rounded-md px-3.5 text-sm font-medium">
              Demander une démo <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="landing-bg-grid absolute inset-0 -z-10" />
        <div className="landing-hero-glow absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-6 pt-12 pb-28 text-center md:pt-16 md:pb-36">
          <div className="landing-fade-up inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs" style={{ borderColor: "hsl(var(--l-border))", color: "hsl(var(--l-fg-dim))" }}>
            <span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(var(--l-accent))" }} />
            L'outil d'entretien IA pour les équipes de recrutement
          </div>
          <h1 className="landing-fade-up landing-delay-1 mx-auto mt-6 max-w-4xl text-5xl font-semibold leading-[1.05] md:text-7xl">
            <span className="landing-gradient-text">Fini les entretiens<br />inutiles.</span>
            <br />
            <span className="landing-accent-text">Évaluez les candidats,<br />pas leur CV.</span>
          </h1>
          <p className="landing-fade-up landing-delay-2 mx-auto mt-6 max-w-2xl text-base md:text-lg" style={{ color: "hsl(var(--l-fg-dim))" }}>
            Gagnez un temps précieux : l'IA vous épaule pour mener les premiers entretiens, évalue chaque candidat selon vos critères et vous livre un rapport clair.
          </p>
          <div className="landing-fade-up landing-delay-3 mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={openDemo} className="landing-btn-primary inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium">
              Demander une démo <ArrowRight className="h-4 w-4" />
            </button>
            <Link to="/login" className="landing-btn-ghost inline-flex h-11 items-center gap-2 rounded-md px-5 text-sm font-medium">
              Se connecter
            </Link>
          </div>
          <div className="landing-fade-up landing-delay-3 mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs" style={{ color: "hsl(var(--l-fg-dim))" }}>
            <span className="inline-flex items-center gap-1.5"><Check className="h-3.5 w-3.5" style={{ color: "hsl(var(--l-accent))" }} /> RGPD</span>
            <span className="inline-flex items-center gap-1.5"><ShieldCheck className="h-3.5 w-3.5" style={{ color: "hsl(var(--l-accent))" }} /> EU Cloud</span>
            <span className="inline-flex items-center gap-1.5"><Clock className="h-3.5 w-3.5" style={{ color: "hsl(var(--l-accent))" }} /> 10min Setup</span>
          </div>

          {/* Mock product card */}
          <div className="landing-fade-up landing-delay-3 mx-auto mt-20 max-w-4xl">
            <div className="landing-card overflow-hidden text-left shadow-2xl">
              <div className="flex items-center gap-1.5 border-b px-4 py-3 landing-divider">
                <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/70" />
                <span className="h-2.5 w-2.5 rounded-full bg-green-400/70" />
                <span className="ml-3 text-xs" style={{ color: "hsl(var(--l-fg-dim))" }}>Session en cours...</span>
              </div>
              <div className="grid gap-6 p-6 md:grid-cols-[1fr_280px]">
                <HeroProductMock />
                <div className="space-y-3">
                  <div className="text-xs uppercase tracking-wider" style={{ color: "hsl(var(--l-fg-dim))" }}>Question 2 / 5</div>
                  <p className="text-sm leading-relaxed">
                    « Pouvez-vous me décrire un projet où vous avez dû gérer un conflit dans votre équipe ? »
                  </p>
                  <div className="space-y-2 pt-3">
                    {[
                      { c: "Communication", v: "8.5" },
                      { c: "Leadership", v: "7.2" },
                      { c: "Esprit d'équipe", v: "9.0" },
                    ].map((c) => (
                      <div key={c.c} className="flex items-center justify-between rounded-md px-3 py-2 text-xs" style={{ background: "hsl(var(--l-bg-elev))", border: "1px solid hsl(var(--l-border))" }}>
                        <span>{c.c}</span>
                        <span className="font-mono" style={{ color: "hsl(var(--l-accent))" }}>{c.v}/10</span>
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
        <div className="mx-auto max-w-6xl px-6 pt-5 pb-24">
          <div className="grid gap-12 md:grid-cols-2 md:items-center">
            <div>
              <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--l-accent))" }}>
                Le constat
              </div>
              <h2 className="mt-3 text-3xl md:text-4xl">
                <span className="landing-gradient-text">La présélection vous coûte des heures.</span>
              </h2>
              <p className="mt-5 text-base leading-relaxed" style={{ color: "hsl(var(--l-fg-dim))" }}>
                Vos recruteurs passent en moyenne 23 minutes par candidat en entretien téléphonique de présélection.
                Pour 50 candidatures, cela représente près d'une semaine entière par poste.
                Et les biais inconscients restent difficiles à éviter.
              </p>
              <div className="mt-6 inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs" style={{ background: "hsl(var(--l-accent) / 0.1)", color: "hsl(var(--l-fg))", border: "1px solid hsl(var(--l-accent) / 0.3)" }}>
                <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(var(--l-accent))" }} />
                Avec Interw.ai, vous ne lisez plus que les meilleurs profils.
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { k: "10×", v: "plus rapide qu'un entretien téléphonique" },
                { k: "100 %", v: "des candidats évalués sur les mêmes critères" },
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

      {/* Tutoriel — création d'une session */}
      <section className="border-t landing-divider">
        <div className="mx-auto max-w-5xl px-6 py-14">
          <p className="text-center text-xs uppercase tracking-wider" style={{ color: "hsl(var(--l-fg-dim))" }}>
            {"\n"}
          </p>
          <div
            className="mt-8 overflow-hidden rounded-lg"
            style={{ background: "hsl(var(--l-bg-elev) / 0.5)", border: "1px solid hsl(var(--l-border))" }}
          >
            <TutoVideo />
          </div>
        </div>
      </section>

      {/* Témoignage */}
      <section className="border-t landing-divider">
        <div className="mx-auto max-w-4xl px-6 py-20">
          <div className="landing-card relative p-8 md:p-12">
            <Quote className="absolute right-6 top-6 h-10 w-10" style={{ color: "hsl(var(--l-accent) / 0.25)" }} />
            <div className="flex items-center gap-1" style={{ color: "hsl(var(--l-accent))" }}>
              {[0, 1, 2, 3, 4].map((i) => <Star key={i} className="h-4 w-4 fill-current" />)}
            </div>
            <p className="mt-5 text-xl leading-relaxed md:text-2xl">
              « On reçoit plus de 100 candidatures par offre. Interw.ai fait la présélection en une nuit
              et nous remet un classement clair. On gagne deux jours par recrutement. »
            </p>
            <div className="mt-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold text-white" style={{ background: "linear-gradient(135deg, hsl(var(--l-accent)), hsl(var(--l-accent-2)))" }}>
                CM
              </div>
              <div>
                <div className="text-sm font-medium">Claire M.</div>
                <div className="text-xs" style={{ color: "hsl(var(--l-fg-dim))" }}>Responsable recrutement · cabinet de conseil</div>
              </div>
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
              { icon: Brain, title: "Entretien IA conversationnel", desc: "L'IA mène l'entretien, pose des questions de relance pertinentes et adapte son ton à chaque candidat." },
              { icon: LineChart, title: "Notation automatique", desc: "Chaque réponse est notée selon vos critères d'évaluation. Transparente, objective, reproductible." },
              { icon: ClipboardList, title: "Rapports détaillés", desc: "Synthèse, points forts, axes d'amélioration, recommandation. Prêt à partager avec vos managers." },
              { icon: Library, title: "Bibliothèque de questions", desc: "Réutilisez vos meilleures questions et critères entre projets. Capitalisez sur votre expertise." },
              { icon: Video, title: "Enregistrement vidéo", desc: "Revoyez les moments clés grâce aux transcriptions horodatées. Partagez les extraits importants." },
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
              Fonctionnement
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl landing-gradient-text">
              Trois étapes. Aucune installation.
            </h2>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              { n: "01", icon: ClipboardList, title: "Créez votre projet", desc: "Définissez le poste, les questions et les critères d'évaluation. Quelques minutes suffisent." },
              { n: "02", icon: CalendarClock, title: "Envoyez le lien", desc: "Vos candidats reçoivent un lien unique. Ils passent l'entretien depuis leur navigateur, à leur rythme." },
              { n: "03", icon: CheckCircle2, title: "Recevez les rapports", desc: "Une note globale, une recommandation et tous les détails. Décidez en quelques minutes." },
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

      {/* Comparatif */}
      <section className="border-t landing-divider">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--l-accent))" }}>
              Comparatif
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl landing-gradient-text">
              Présélection traditionnelle ou Interw.ai ?
            </h2>
          </div>

          <div className="mt-12 overflow-hidden rounded-2xl" style={{ border: "1px solid hsl(var(--l-border))" }}>
            <div className="grid grid-cols-3 text-sm">
              <div className="p-4 font-medium" style={{ background: "hsl(var(--l-bg-elev))" }}> </div>
              <div className="p-4 text-center font-medium" style={{ background: "hsl(var(--l-bg-elev))", color: "hsl(var(--l-fg-dim))" }}>
                Téléphone / visio
              </div>
              <div className="p-4 text-center font-semibold" style={{ background: "hsl(var(--l-accent) / 0.12)" }}>
                Interw.ai
              </div>
            </div>
            {[
              { l: "Temps par candidat", a: "20-30 minutes", b: "0 minute pour vous" },
              { l: "Disponibilité", a: "Heures de bureau", b: "24/7" },
              { l: "Critères d'évaluation", a: "Variables", b: "Identiques pour tous" },
              { l: "Biais inconscients", a: "Présents", b: "Réduits" },
              { l: "Rapport partageable", a: "À rédiger", b: "Généré automatiquement" },
              { l: "Coût marginal", a: "Élevé", b: "Faible" },
            ].map((row, idx) => (
              <div key={row.l} className="grid grid-cols-3 text-sm" style={{ borderTop: "1px solid hsl(var(--l-border))", background: idx % 2 === 1 ? "hsl(var(--l-bg-elev) / 0.4)" : "transparent" }}>
                <div className="p-4">{row.l}</div>
                <div className="flex items-center justify-center gap-2 p-4 text-center" style={{ color: "hsl(var(--l-fg-dim))" }}>
                  <X className="h-4 w-4 text-red-400/70" /> {row.a}
                </div>
                <div className="flex items-center justify-center gap-2 p-4 text-center">
                  <Check className="h-4 w-4" style={{ color: "hsl(var(--l-accent))" }} /> {row.b}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t landing-divider">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="mx-auto max-w-2xl text-center">
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--l-accent))" }}>
              Tarifs
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl landing-gradient-text">
              Une formule simple, adaptée à votre volume.
            </h2>
            <p className="mt-4 text-base" style={{ color: "hsl(var(--l-fg-dim))" }}>
              Sans engagement. Payez uniquement ce que vous utilisez, ou passez en illimité.
            </p>
          </div>

          <div className="mt-14 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Freemium",
                price: "2 €",
                priceSuffix: "/ entretien",
                desc: "Idéal pour démarrer ou pour les recrutements ponctuels.",
                features: [
                  "20 entretiens gratuits offerts",
                  "Projets illimités",
                  "Rapports IA détaillés",
                  "Ensuite 2 € par entretien",
                ],
                cta: "Commencer gratuitement",
                highlight: false,
              },
              {
                name: "Pro",
                price: "49 €",
                priceSuffix: "/ mois",
                desc: "Pour les recruteurs qui interviewent chaque semaine.",
                features: [
                  "200 crédits par mois (environ 75 entretiens)",
                  "Bibliothèque de questions et critères partagée",
                  "Modèles d'entretien réutilisables",
                  "Support prioritaire",
                ],
                cta: "Démarrer l'essai",
                highlight: true,
              },
              {
                name: "Entreprise",
                price: "Sur mesure",
                priceSuffix: "",
                desc: "Pour les organisations à fort volume ou aux exigences spécifiques.",
                features: [
                  "Volume négocié et tarif dégressif",
                  "SSO, rôles avancés, multi-équipes",
                  "Personnalisation IA et voix sur mesure",
                  "DPA, engagement RGPD, accompagnement dédié",
                ],
                cta: "Nous contacter",
                highlight: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className="landing-card relative p-6"
                style={p.highlight ? { borderColor: "hsl(var(--l-accent) / 0.6)", boxShadow: "0 20px 60px -20px hsl(var(--l-accent) / 0.4)" } : undefined}
              >
                {p.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-medium text-white" style={{ background: "linear-gradient(135deg, hsl(var(--l-accent)), hsl(var(--l-accent-2)))" }}>
                    Le plus choisi
                  </div>
                )}
                <h3 className="text-lg font-semibold">{p.name}</h3>
                <div className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-3xl font-semibold landing-gradient-text">{p.price}</span>
                  {p.priceSuffix && (
                    <span className="text-sm font-normal" style={{ color: "hsl(var(--l-fg-dim))" }}>
                      {p.priceSuffix}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm" style={{ color: "hsl(var(--l-fg-dim))" }}>{p.desc}</p>
                <ul className="mt-5 space-y-2 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "hsl(var(--l-accent))" }} />
                      <span style={{ color: "hsl(var(--l-fg-dim))" }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={openDemo}
                  className={`mt-6 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md px-4 text-sm font-medium ${p.highlight ? "landing-btn-primary" : "landing-btn-ghost"}`}
                >
                  {p.cta} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="border-t landing-divider">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="text-center">
            <div className="text-xs font-medium uppercase tracking-wider" style={{ color: "hsl(var(--l-accent))" }}>
              Questions fréquentes
            </div>
            <h2 className="mt-3 text-3xl md:text-4xl landing-gradient-text">
              Tout ce que vous voulez savoir.
            </h2>
          </div>

          <div className="mt-12 space-y-3">
            {[
              {
                q: "Comment l'IA évalue-t-elle un candidat ?",
                a: "Vous définissez vos propres critères (compétences, comportements, motivations). L'IA analyse chaque réponse et attribue une note motivée pour chaque critère, en se basant uniquement sur le contenu de l'entretien.",
              },
              {
                q: "Mes candidats acceptent-ils ce format ?",
                a: "Oui : les candidats apprécient de pouvoir passer l'entretien quand ils veulent, sans pression de planning. Le consentement est demandé clairement avant l'enregistrement.",
              },
              {
                q: "Mes données sont-elles en sécurité ?",
                a: "Toutes les données sont hébergées dans l'Union européenne. Le consentement candidat est explicite, la durée de conservation est paramétrable, et un engagement RGPD est disponible pour les comptes Entreprise.",
              },
              {
                q: "Combien de temps pour démarrer ?",
                a: "Une dizaine de minutes. Vous créez votre projet, choisissez vos questions et critères, puis envoyez le lien à vos candidats. Aucune installation.",
              },
              {
                q: "L'IA remplace-t-elle l'entretien humain ?",
                a: "Non. Interw.ai automatise la présélection pour vous faire gagner du temps. La décision d'embauche et l'entretien final restent toujours menés par un recruteur.",
              },
              {
                q: "Puis-je personnaliser la voix et le ton de l'IA ?",
                a: "Oui. Vous choisissez la voix, la langue et le ton. Vous pouvez aussi ajouter une vidéo de présentation au début de l'entretien.",
              },
            ].map((item, i) => (
              <div key={item.q} className="landing-card overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-medium"
                >
                  <span>{item.q}</span>
                  <ChevronDown className={`h-4 w-4 shrink-0 transition-transform ${openFaq === i ? "rotate-180" : ""}`} style={{ color: "hsl(var(--l-fg-dim))" }} />
                </button>
                {openFaq === i && (
                  <div className="px-5 pb-5 text-sm leading-relaxed animate-fade-in" style={{ color: "hsl(var(--l-fg-dim))" }}>
                    {item.a}
                  </div>
                )}
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
            Réservez une démonstration de 20 minutes. On vous montre comment Interw.ai s'intègre à votre processus.
          </p>
          <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button type="button" onClick={openDemo} className="landing-btn-primary inline-flex h-11 items-center gap-2 rounded-md px-6 text-sm font-medium">
              Demander une démo <ArrowRight className="h-4 w-4" />
            </button>
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
            <button type="button" onClick={openDemo} className="hover:text-white transition-colors bg-transparent border-0 p-0 cursor-pointer" style={{ color: "inherit", font: "inherit" }}>Contact</button>
            <Link to="/legal" className="hover:text-white transition-colors">Mentions légales</Link>
            <Link to="/privacy" className="hover:text-white transition-colors">Confidentialité</Link>
          </div>
        </div>
      </footer>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}

function TutoVideo() {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [started, setStarted] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const startPlayback = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = true;
    v.play()
      .then(() => setStarted(true))
      .catch(() => {
        /* autoplay refusé : le bouton Play reste affiché */
      });
  };

  const handleManualPlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setIsMuted(false);
    v.play()
      .then(() => setStarted(true))
      .catch(() => {});
  };

  const handleUnmute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = false;
    setIsMuted(false);
  };

  // Autoplay muet quand la vidéo entre dans le viewport, pause quand elle en sort.
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const v = videoRef.current;
          if (!v) return;
          if (entry.isIntersecting) {
            if (v.paused) startPlayback();
          } else if (!v.paused) {
            v.pause();
          }
        });
      },
      { threshold: 0.5 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={containerRef} className="relative aspect-video w-full">
      <video
        ref={videoRef}
        src="https://qxszgsxdktnwqabsdfvw.supabase.co/storage/v1/object/public/tutorials/tutoriel-creation-session.mp4"
        poster="/tuto-poster.png"
        controls={started}
        muted
        playsInline
        preload="metadata"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {!started && (
        <button
          type="button"
          onClick={handleManualPlay}
          aria-label="Lire la vidéo"
          className="absolute inset-0 flex items-center justify-center group cursor-pointer"
          style={{ background: "hsl(0 0% 0% / 0.25)" }}
        >
          <span
            className="flex h-24 w-24 items-center justify-center rounded-full shadow-2xl transition-transform duration-200 group-hover:scale-110"
            style={{
              background: "hsl(0 0% 100% / 0.95)",
              boxShadow: "0 20px 60px -10px hsl(var(--l-accent) / 0.6)",
            }}
          >
            <Play
              className="h-10 w-10 translate-x-0.5"
              style={{ color: "hsl(var(--l-accent))", fill: "hsl(var(--l-accent))" }}
            />
          </span>
        </button>
      )}
      {started && isMuted && (
        <button
          type="button"
          onClick={handleUnmute}
          className="absolute right-4 top-4 flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium shadow-lg transition-transform hover:scale-105"
          style={{
            background: "hsl(0 0% 100% / 0.95)",
            color: "hsl(var(--l-accent))",
            boxShadow: "0 10px 30px -10px hsl(var(--l-accent) / 0.6)",
          }}
        >
          <Volume2 className="h-4 w-4" />
          Activer le son
        </button>
      )}
    </div>
  );
}

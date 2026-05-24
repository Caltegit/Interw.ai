import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DemoRequestDialog from "@/components/landing/DemoRequestDialog";
import step01Img from "@/assets/step-01-setup.jpg";
import step02Img from "@/assets/step-02-link.jpg";
import step03Img from "@/assets/step-03-report.jpg";
import {
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  ChevronDown,
  
  Library,
  ShieldCheck,
  Sparkles,
  Scale,
  Video,
  FileText,
  X,
  Star,
} from "lucide-react";

/* ---------------- Hero mock report card ---------------- */
function HeroReportMock() {
  const score = 87;
  const circumference = 2 * Math.PI * 40; // r=40
  const offset = circumference - (score / 100) * circumference;

  return (
    <div
      className="landing-fade-up landing-delay-2 relative mx-auto w-full max-w-md"
      style={{ transform: "rotate(-2deg)" }}
    >
      {/* Floating accent shadow */}
      <div
        className="absolute -inset-6 -z-10 rounded-[24px] blur-2xl"
        style={{ background: "radial-gradient(ellipse at center, hsl(243 75% 60% / 0.18), transparent 70%)" }}
      />
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "#ffffff",
          border: "1px solid hsl(230 16% 92%)",
          boxShadow: "0 30px 80px -20px hsl(243 75% 60% / 0.22), 0 1px 2px hsl(240 10% 10% / 0.04)",
        }}
      >
        {/* Header */}
        <div className="items-center border-b p-5 flex flex-row gap-[12px] mx-0 text-left" style={{ borderColor: "hsl(230 14% 88%)" }}>
          <div
            className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-semibold text-white"
            style={{ background: "linear-gradient(135deg, hsl(243 75% 60%), hsl(290 70% 60%))" }}
          >
            MD
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-sm font-semibold text-foreground">Marie D.</div>
            <div className="truncate text-xs" style={{ color: "hsl(230 8% 46%)" }}>
              Chargée de projet · 24 mai 2026
            </div>
          </div>
          <div
            className="rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider"
            style={{ background: "hsl(243 100% 94%)", color: "hsl(243 78% 54%)" }}
          >
            Rapport IA
          </div>
        </div>

        {/* Body */}
        <div className="space-y-5 p-6">
          {/* Score */}
          <div className="flex items-center gap-5">
            <div className="relative h-24 w-24 shrink-0">
              <svg viewBox="0 0 100 100" className="h-full w-full -rotate-90">
                <circle cx="50" cy="50" r="40" fill="none" stroke="hsl(230 16% 92%)" strokeWidth="8" />
                <circle
                  cx="50"
                  cy="50"
                  r="40"
                  fill="none"
                  stroke="hsl(243 75% 60%)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={offset}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold text-foreground">{score}</span>
                <span className="text-[10px]" style={{ color: "hsl(230 8% 46%)" }}>/ 100</span>
              </div>
            </div>
            <div className="min-w-0">
              <div className="text-xs uppercase tracking-wider" style={{ color: "hsl(230 8% 52%)" }}>
                Score global
              </div>
              <div className="mt-1 text-base font-semibold text-foreground">Excellent profil</div>
              <div className="mt-1 text-xs leading-snug" style={{ color: "hsl(230 8% 42%)" }}>
                Aligné avec vos critères clés.
              </div>
            </div>
          </div>

          {/* Bars */}
          <div className="space-y-3">
            {[
              { c: "Communication", v: 90 },
              { c: "Motivation", v: 85 },
              { c: "Adaptabilité", v: 80 },
            ].map((c) => (
              <div key={c.c} className="space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/90">{c.c}</span>
                  <span className="font-mono" style={{ color: "hsl(243 75% 60%)" }}>{c.v}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full" style={{ background: "hsl(230 14% 88%)" }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${c.v}%`,
                      background: "linear-gradient(90deg, hsl(243 75% 60%), hsl(280 80% 65%))",
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          {/* Recommendation badge */}
          <div
            className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm"
            style={{
              background: "hsl(152 70% 95%)",
              border: "1px solid hsl(152 55% 80%)",
              color: "hsl(152 60% 38%)",
            }}
          >
            <CheckCircle2 className="h-4 w-4" />
            <span className="font-medium">Profil recommandé</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Page ---------------- */
export default function Landing() {
  const { session, loading } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [scrolled, setScrolled] = useState(false);

  const openDemo = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setDemoOpen(true);
  };

  useEffect(() => {
    document.title = "Interw.ai — Évaluez les candidats, pas leur CV";
    const desc =
      "Vos questions, vos critères, votre processus. interw.ai analyse les réponses de chaque candidat et vous livre un rapport détaillé — pour recruter plus vite, plus équitablement, sans rater le bon profil.";
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, []);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (loading) return null;
  if (session) return <Navigate to="/dashboard" replace />;

  return (
    <div className="landing-root min-h-screen">
      <div className="landing-grain" aria-hidden />

      {/* ============ NAVBAR ============ */}
      <header
        className="sticky top-0 z-50 transition-all duration-200"
        style={{
          backdropFilter: scrolled ? "blur(12px)" : "none",
          WebkitBackdropFilter: scrolled ? "blur(12px)" : "none",
          background: scrolled ? "hsl(0 0% 100% / 0.8)" : "hsl(0 0% 100%)",
          borderBottom: `1px solid hsl(230 16% ${scrolled ? "88%" : "94%"})`,
        }}
      >
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link to="/" className="flex items-center gap-2">
            <div
              className="flex h-7 w-7 items-center justify-center rounded-md"
              style={{ background: "linear-gradient(135deg, hsl(243 75% 60%), hsl(290 70% 60%))" }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Interw.ai</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm md:flex" style={{ color: "hsl(230 8% 42%)" }}>
            <Link to="/produit" className="transition-colors hover:text-foreground">Produit</Link>
            <a href="#how" className="transition-colors hover:text-foreground">Fonctionnement</a>
            <a href="#pricing" className="transition-colors hover:text-foreground">Tarifs</a>
            <a href="#faq" className="transition-colors hover:text-foreground">Questions</a>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm transition-colors hover:text-foreground"
              style={{ color: "hsl(230 8% 42%)" }}
            >
              Se connecter
            </Link>
            <span className="hidden h-5 w-px md:block" style={{ background: "hsl(230 14% 88%)" }} />
            <button
              type="button"
              onClick={openDemo}
              className="landing-btn-primary inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-medium"
            >
              Commencez
            </button>
          </div>
        </div>
      </header>

      {/* ============ HERO ============ */}
      <section className="relative overflow-hidden" style={{ background: "hsl(0 0% 100%)" }}>
        <div className="landing-bg-grid absolute inset-0 -z-10" />
        <div className="landing-hero-glow absolute inset-0 -z-10" />
        <div className="mx-auto max-w-6xl px-6 pt-16 pb-24 md:pt-24 md:pb-28">
          <div className="grid items-center gap-12 md:grid-cols-[55%_45%]">
            {/* Left column */}
            <div>
              <h1 className="landing-fade-up landing-delay-1 text-4xl font-semibold leading-[1.05] md:text-6xl">
                <span className="landing-gradient-text mx-0 px-0 text-6xl">
                  Évaluez les candidats<br />pas leur CV.
                </span>
              </h1>
              <p className="landing-fade-up landing-delay-2 mt-6 max-w-xl text-lg md:text-xl" style={{ color: "hsl(230 10% 25%)" }}>
                Faites passer vos entretiens en vidéo asynchrone.<br />L'IA évalue chaque candidat selon vos critères.
              </p>
              <p className="landing-fade-up landing-delay-2 mt-5 max-w-xl text-base leading-relaxed" style={{ color: "hsl(230 8% 42%)" }}>
                Vous définissez les questions et les critères et le candidat passe l'entretien quand il veut. Notre IA délivre un rapport détaillé.<br />
                Vous donnez une chance à tous, vous sélectionnez les meilleurs.
              </p>
              <div className="landing-fade-up landing-delay-3 mt-8">
                <button
                  type="button"
                  onClick={openDemo}
                  className="landing-btn-white inline-flex h-12 items-center gap-2 text-sm font-semibold text-center px-[60px] mx-[60px] my-[5px]"
                >
                  Commencer gratuitement — 20 entretiens offerts
                  <ArrowRight className="h-4 w-4" />
                </button>
                <p className="mt-3 text-xs text-center" style={{ color: "hsl(230 8% 52%)" }}>
                  Sans carte bancaire · Sans engagement · Setup en 10 min
                </p>
              </div>
            </div>

            {/* Right column — mock report */}
            <div className="mt-4 md:mt-0">
              <HeroReportMock />
            </div>
          </div>
        </div>
      </section>

      {/* ============ HOW ============ */}
      <section id="how" style={{ background: "hsl(240 25% 97%)" }}>
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="landing-pill">Fonctionnement</span>
            <h2 className="mt-5 text-3xl md:text-5xl landing-gradient-text">
              Trois étapes. Aucune installation.
            </h2>
          </div>

          <div className="relative mt-16">
            <div
              className="absolute left-[16.67%] right-[16.67%] top-12 hidden border-t md:block"
              style={{ borderTopWidth: 1, borderStyle: "dashed", borderColor: "hsl(243 75% 60% / 0.4)" }}
            />
            <div className="relative grid gap-6 md:grid-cols-3">
              {[
                {
                  n: "01",
                  img: step01Img,
                  title: "Créez votre projet",
                  desc: "Vous définissez le poste, choisissez vos questions et fixez vos critères d'évaluation. C'est votre méthode. Moins de 10 minutes pour tout paramétrer.",
                },
                {
                  n: "02",
                  img: step02Img,
                  title: "Envoyez le lien",
                  desc: "Vos candidats reçoivent un lien unique. Ils répondent quand ils veulent, depuis n'importe où. Pas de coordination à gérer. Pas de créneau à caler. Tout le monde peut candidater — sans barrière.",
                },
                {
                  n: "03",
                  img: step03Img,
                  title: "Recevez les rapports",
                  desc: "L'IA analyse chaque réponse selon vos critères et génère un rapport complet : score, portrait du candidat, recommandation. Ce qui vous prenait des heures se lit en quelques minutes.",
                },
              ].map((s) => (
                <div key={s.n} className="landing-card relative overflow-hidden">
                  <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: "hsl(240 25% 95%)" }}>
                    <img
                      src={s.img}
                      alt={s.title}
                      loading="lazy"
                      width={1024}
                      height={768}
                      className="h-full w-full object-cover"
                    />
                    <div
                      className="pointer-events-none absolute right-3 top-1 select-none text-[64px] font-bold leading-none"
                      style={{ color: "hsl(0 0% 100%)", textShadow: "0 2px 10px hsl(243 75% 30% / 0.55)" }}
                    >
                      {s.n}
                    </div>
                  </div>
                  <div className="p-7">
                    <div
                      className="inline-flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold text-white"
                      style={{ background: "hsl(243 75% 60%)" }}
                    >
                      {s.n}
                    </div>
                    <h3 className="mt-5 font-semibold text-foreground text-2xl">{s.title}</h3>
                    <p className="mt-3 text-sm leading-relaxed" style={{ color: "hsl(230 8% 38%)" }}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ============ SOCIAL PROOF BAR ============ */}
      <section style={{ background: "hsl(240 20% 98%)", borderTop: "1px solid hsl(230 16% 92%)", borderBottom: "1px solid hsl(230 16% 92%)" }}>
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-4 px-6 py-3 text-center text-[13px] md:text-sm" style={{ color: "hsl(230 8% 46%)" }}>
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5" style={{ color: "hsl(243 75% 60%)" }} />
            Déjà utilisé par plus de 200 recruteurs
          </span>
          <span style={{ color: "hsl(230 14% 84%)" }}>·</span>
          <span className="inline-flex items-center gap-1">
            <span className="inline-flex" style={{ color: "hsl(45 95% 60%)" }}>
              {[0,1,2,3,4].map(i => <Star key={i} className="h-3.5 w-3.5 fill-current" />)}
            </span>
            <span className="ml-1">4,8/5</span>
          </span>
          <span style={{ color: "hsl(230 14% 84%)" }}>·</span>
          <span className="hidden sm:inline">Données hébergées en Europe</span>
        </div>
      </section>

      {/* ============ FEATURES ============ */}
      <section id="features" className="relative" style={{ background: "hsl(240 20% 98%)" }}>
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <span className="landing-pill">AVANTAGES</span>
            <h2 className="mt-5 text-3xl md:text-5xl landing-gradient-text">
              Ne ratez plus le bon candidat.
            </h2>
            <p className="mt-5 text-base md:text-lg" style={{ color: "hsl(230 8% 42%)" }}>
              Vous gardez le contrôle. L'IA fait le travail d'analyse. Chaque candidat a enfin une vraie chance d'être entendu.
            </p>
          </div>

          {/* Big card #1 — Vous gardez le contrôle */}
          <div
            className="mt-14 overflow-hidden rounded-2xl p-10"
            style={{
              background: "linear-gradient(135deg, hsl(243 100% 96%), hsl(243 100% 97%))",
              border: "1px solid hsl(243 75% 60% / 0.25)",
            }}
          >
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div className="max-w-2xl">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white"
                  style={{ background: "hsl(243 75% 60%)" }}
                >
                  Vous gardez le contrôle
                </span>
                <h3 className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">
                  Vos questions, votre processus
                </h3>
                <p className="mt-4 text-base leading-relaxed" style={{ color: "hsl(230 10% 25%)" }}>
                  Vous choisissez les questions et fixez vos critères d'évaluation. Le candidat répond depuis son navigateur, quand il veut. Vous ne perdez jamais la main sur votre recrutement — la technologie s'adapte à votre méthode, pas l'inverse.
                </p>
              </div>
              <div
                className="hidden h-24 w-24 items-center justify-center rounded-2xl md:flex"
                style={{ background: "hsl(243 75% 60% / 0.12)", border: "1px solid hsl(243 75% 60% / 0.25)" }}
              >
                <Sparkles className="h-12 w-12" style={{ color: "hsl(243 75% 60%)" }} />
              </div>
            </div>
          </div>

          {/* Big card #2 — Équité */}
          <div
            className="mt-6 overflow-hidden rounded-2xl p-10"
            style={{
              background: "linear-gradient(135deg, hsl(152 70% 96%), hsl(152 70% 97%))",
              border: "1px solid hsl(152 55% 82%)",
            }}
          >
            <div className="grid gap-8 md:grid-cols-[1fr_auto] md:items-center">
              <div className="max-w-2xl">
                <span
                  className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white"
                  style={{ background: "hsl(142 71% 38%)" }}
                >
                  Équité &amp; inclusion
                </span>
                <h3 className="mt-4 text-2xl font-semibold text-foreground md:text-3xl">
                  Un recrutement vraiment équitable
                </h3>
                <p className="mt-4 text-base leading-relaxed" style={{ color: "hsl(230 10% 25%)" }}>
                  Peu importe le nom, l'école ou le parcours : chaque candidat répond aux mêmes questions, évalué selon les mêmes critères. interw.ai donne une vraie chance à ceux que les CV écartent trop vite. Recruter mieux, c'est aussi recruter plus justement.
                </p>
              </div>
              <div
                className="hidden h-24 w-24 items-center justify-center rounded-2xl md:flex"
                style={{ background: "hsl(142 71% 38% / 0.15)", border: "1px solid hsl(142 71% 38% / 0.3)" }}
              >
                <Scale className="h-12 w-12" style={{ color: "hsl(152 60% 38%)" }} />
              </div>
            </div>
          </div>

          {/* Standard cards grid */}
          <div className="mt-6 grid gap-5 md:grid-cols-2">
            {[
              {
                icon: Brain,
                title: "Analyse IA des réponses",
                desc: "Une fois l'entretien terminé, l'IA analyse chaque réponse selon vos critères. Même grille pour tous. Zéro biais, zéro fatigue, zéro oubli.",
              },
              {
                icon: FileText,
                title: "Rapports prêts à partager",
                desc: "Un portrait complet de chaque candidat : score, points forts, zones d'attention, recommandation. Prêt à partager avec vos managers en un clic — sans passer des heures à rédiger vos notes.",
              },
              {
                icon: Library,
                title: "Votre méthode, capitalisée",
                desc: "Construisez et sauvegardez votre propre méthode d'évaluation. Réutilisez-la sur tous vos recrutements. Votre expertise ne repart jamais de zéro.",
              },
              {
                icon: ShieldCheck,
                title: "RGPD natif",
                desc: "Hébergement européen, consentement explicite, durée de conservation paramétrable.",
              },
            ].map((f) => (
              <div key={f.title} className="landing-card landing-card-hover p-6">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-lg"
                  style={{ background: "hsl(243 75% 60% / 0.12)", color: "hsl(243 75% 60%)" }}
                >
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 text-lg font-semibold text-foreground">{f.title}</h3>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: "hsl(230 8% 38%)" }}>
                  {f.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>




      {/* ============ COMPARATIF ============ */}
      <section style={{ background: "hsl(0 0% 100%)" }}>
        <div className="mx-auto max-w-5xl px-6 py-28 md:py-32">
          <div className="mx-auto max-w-3xl text-center">
            <span className="landing-pill">Comparatif</span>
            <h2 className="mt-5 text-3xl md:text-5xl landing-gradient-text">
              Avec la présélection traditionnelle, vous n'avez pas le temps d'évaluer tout le potentiel de certains candidats.
            </h2>
          </div>

          <div
            className="mt-14 overflow-hidden rounded-2xl"
            style={{ border: "1px solid hsl(230 14% 88%)" }}
          >
            <div className="grid grid-cols-[1.2fr_1fr_1fr] text-sm">
              <div className="p-5 font-medium" style={{ background: "hsl(240 25% 96%)" }}>&nbsp;</div>
              <div
                className="p-5 text-center text-xs font-semibold uppercase tracking-wider md:text-sm"
                style={{ background: "hsl(240 25% 96%)", color: "hsl(230 8% 46%)" }}
              >
                Téléphone / Visio
              </div>
              <div
                className="relative p-5 text-center text-xs font-semibold uppercase tracking-wider md:text-sm"
                style={{ background: "hsl(243 100% 96%)", color: "hsl(243 78% 54%)" }}
              >
                <span>Interw.ai</span>
                <span
                  className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold normal-case tracking-normal text-white"
                  style={{ background: "hsl(142 71% 38%)" }}
                >
                  <Check className="h-3 w-3" /> Recommandé
                </span>
              </div>
            </div>
            {[
              ["Temps par candidat", "20–30 minutes", "0 minute pour vous"],
              ["Disponibilité", "Heures de bureau", "24h/24, 7j/7"],
              ["Critères d'évaluation", "Variables", "Identiques pour tous"],
              ["Biais inconscients", "Présents", "Réduits"],
              ["Contrôle du processus", "Dépend du recruteur", "100% défini par vous"],
              ["Équité entre candidats", "Variable", "Identique pour tous"],
              ["Profils atypiques", "Souvent écartés", "Toujours évalués"],
              ["Temps d'analyse / candidat", "20–30 min de notes", "Quelques minutes"],
            ].map(([l, a, b], idx) => (
              <div
                key={l}
                className="grid grid-cols-[1.2fr_1fr_1fr] text-sm"
                style={{
                  borderTop: "1px solid hsl(230 16% 92%)",
                  background: idx % 2 === 1 ? "hsl(240 25% 97%)" : "transparent",
                }}
              >
                <div className="p-5 font-medium text-foreground/90">{l}</div>
                <div
                  className="flex items-center justify-center gap-2 p-5 text-center"
                  style={{ color: "hsl(230 8% 60%)" }}
                >
                  <X className="h-4 w-4" style={{ color: "hsl(0 70% 55%)" }} />
                  <span className="line-through decoration-1">{a}</span>
                </div>
                <div
                  className="flex items-center justify-center gap-2 p-5 text-center font-semibold text-foreground"
                  style={{ background: "hsl(243 100% 97%)" }}
                >
                  <Check className="h-4 w-4 shrink-0" style={{ color: "hsl(243 75% 60%)" }} /> {b}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section id="pricing" style={{ background: "hsl(240 25% 97%)" }}>
        <div className="mx-auto max-w-6xl px-6 py-28 md:py-32">
          <div className="mx-auto max-w-2xl text-center">
            <span className="landing-pill">Tarifs</span>
            <h2 className="mt-5 text-3xl md:text-5xl landing-gradient-text">
              Une formule simple, adaptée à votre volume.
            </h2>
            <p className="mt-5 text-base md:text-lg" style={{ color: "hsl(230 8% 42%)" }}>
              Sans engagement. Commencez gratuitement, payez à l'usage, passez en illimité quand vous êtes prêt.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Freemium",
                price: "0 €",
                priceSuffix: "",
                desc: "Testez sans risque. 20 entretiens offerts pour vous faire votre propre avis.",
                features: ["20 entretiens offerts", "Projets illimités", "Rapports IA détaillés", "Aucune carte requise"],
                cta: "Planifier une démo",
                ctaNote: "Aucune carte requise",
                highlight: false,
              },
              {
                name: "Startup",
                price: "99 €",
                priceSuffix: "/ mois",
                desc: "Pour les équipes qui recrutent régulièrement et veulent un processus structuré, équitable et reproductible.",
                features: [
                  "200 crédits / mois (50 entretiens inclus)",
                  "Bibliothèque de questions partagée",
                  "Modèles d'entretien réutilisables",
                  "Support prioritaire",
                ],
                cta: "Démarrer l'essai",
                ctaNote: "Annulable à tout moment",
                highlight: true,
              },
              {
                name: "Entreprise",
                price: "Sur mesure",
                priceSuffix: "",
                desc: "Pour les organisations qui recrutent à grande échelle, avec des exigences RH spécifiques et des besoins de personnalisation avancés.",
                features: ["Volume négocié", "SSO, rôles avancés, multi-équipes", "IA et voix personnalisées", "DPA + accompagnement dédié"],
                cta: "Nous contacter",
                ctaNote: "Devis sous 24h",
                highlight: false,
              },
            ].map((p) => (
              <div
                key={p.name}
                className={`relative rounded-2xl p-7 ${p.highlight ? "landing-pulse-glow" : ""}`}
                style={
                  p.highlight
                    ? {
                        background: "hsl(243 100% 97%)",
                        border: "2px solid hsl(243 75% 60%)",
                      }
                    : {
                        background: "hsl(240 25% 97%)",
                        border: "1px solid hsl(230 14% 88%)",
                      }
                }
              >
                {p.highlight && (
                  <div
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold text-white"
                    style={{ background: "hsl(243 75% 60%)" }}
                  >
                    Le plus choisi
                  </div>
                )}
                <h3 className="text-lg font-semibold text-foreground">{p.name}</h3>
                <div className="mt-4 flex items-baseline gap-2">
                  <span className="text-5xl font-bold text-foreground">{p.price}</span>
                  {p.priceSuffix && (
                    <span className="text-sm" style={{ color: "hsl(230 8% 46%)" }}>
                      {p.priceSuffix}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-sm leading-relaxed" style={{ color: "hsl(230 8% 42%)" }}>
                  {p.desc}
                </p>
                <ul className="mt-6 space-y-2.5 text-sm">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2">
                      <Check className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "hsl(243 75% 60%)" }} />
                      <span style={{ color: "hsl(230 10% 28%)" }}>{f}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={openDemo}
                  className={`mt-7 inline-flex h-11 w-full items-center justify-center gap-2 px-4 text-sm font-semibold ${
                    p.highlight ? "landing-btn-primary" : "landing-btn-ghost"
                  }`}
                >
                  {p.cta} <ArrowRight className="h-3.5 w-3.5" />
                </button>
                <p className="mt-3 text-center text-xs" style={{ color: "hsl(230 8% 58%)" }}>
                  {p.ctaNote}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section id="faq" style={{ background: "hsl(0 0% 100%)" }}>
        <div className="mx-auto max-w-3xl px-6 py-28 md:py-32">
          <div className="text-center">
            <span className="landing-pill">Questions fréquentes</span>
            <h2 className="mt-5 text-3xl md:text-5xl landing-gradient-text">
              Tout ce que vous voulez savoir.
            </h2>
          </div>

          <div className="mt-14 space-y-3">
            {[
              {
                q: "Comment l'IA analyse-t-elle les réponses ?",
                a: "Vous définissez vos critères (compétences, comportements, motivations). Une fois l'entretien terminé, l'IA analyse chaque réponse en fonction de ces critères et attribue une note motivée. L'évaluation porte uniquement sur ce que le candidat a dit — pas sur son nom, son école ou son parcours.",
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
                q: "L'IA remplace-t-elle le recruteur ?",
                a: "Non. interw.ai ne conduit pas l'entretien à votre place — c'est vous qui définissez les questions et les critères. L'IA intervient après, pour analyser les réponses et rédiger les rapports. Vous gardez le contrôle total. L'IA vous fait gagner le temps que vous passiez à décortiquer chaque entretien manuellement.",
              },
              {
                q: "Puis-je personnaliser la voix et le ton de l'IA ?",
                a: "Oui. Vous choisissez la voix, la langue et le ton. Vous pouvez aussi ajouter une vidéo de présentation au début de l'entretien.",
              },
              {
                q: "interw.ai favorise-t-il vraiment l'égalité des chances ?",
                a: "Oui. Chaque candidat répond aux mêmes questions, évalué selon les mêmes critères, avec la même grille de notation. Les biais liés au CV, à l'école, au prénom ou à l'apparence n'ont plus d'impact sur la présélection. C'est une façon concrète de recruter plus équitablement — sans effort supplémentaire de votre part.",
              },
            ].map((item, i) => {
              const isOpen = openFaq === i;
              return (
                <div
                  key={item.q}
                  className="overflow-hidden rounded-xl transition-colors"
                  style={{
                    background: isOpen ? "hsl(240 25% 97%)" : "hsl(240 20% 98%)",
                    border: "1px solid hsl(230 16% 92%)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isOpen) e.currentTarget.style.background = "hsl(240 25% 97%)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isOpen) e.currentTarget.style.background = "hsl(240 20% 98%)";
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setOpenFaq(isOpen ? null : i)}
                    className="flex w-full items-center justify-between gap-4 p-5 text-left text-sm font-medium text-foreground md:text-base"
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 shrink-0 transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}
                      style={{ color: "hsl(243 75% 60%)" }}
                    />
                  </button>
                  {isOpen && (
                    <div
                      className="animate-fade-in px-5 pb-5 text-sm leading-relaxed"
                      style={{ color: "hsl(230 8% 38%)" }}
                    >
                      {item.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ FINAL CTA ============ */}
      <section className="relative overflow-hidden" style={{ background: "hsl(0 0% 100%)" }}>
        <div className="landing-final-glow absolute inset-0 -z-10" />
        <div className="mx-auto max-w-4xl px-6 py-28 text-center md:py-32">
          <h2 className="text-3xl font-semibold md:text-5xl landing-gradient-text">
            Et si votre prochain meilleur recrutement était déjà dans votre liste de candidats ?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg" style={{ color: "hsl(230 8% 38%)" }}>
            En 20 minutes, on vous montre comment interw.ai s'intègre à votre méthode de travail — sans la remplacer. Et comment il vous fait gagner plusieurs heures par recrutement.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={openDemo}
              className="landing-btn-primary inline-flex h-12 items-center gap-2 px-6 text-sm font-semibold"
            >
              Planifier une démo <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/login"
              className="landing-btn-ghost inline-flex h-12 items-center gap-2 px-6 text-sm font-semibold"
            >
              Se connecter
            </Link>
          </div>
          <div
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px]"
            style={{ color: "hsl(230 8% 55%)" }}
          >
            {["RGPD", "Hébergement EU", "Sans engagement", "Setup en 10 min"].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5">
                <Check className="h-3.5 w-3.5" style={{ color: "hsl(243 75% 60%)" }} />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ background: "hsl(240 20% 98%)", borderTop: "1px solid hsl(230 16% 92%)" }}>
        <div
          className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs md:flex-row"
          style={{ color: "hsl(230 8% 55%)" }}
        >
          <div className="flex items-center gap-2">
            <div
              className="flex h-5 w-5 items-center justify-center rounded"
              style={{ background: "linear-gradient(135deg, hsl(243 75% 60%), hsl(290 70% 60%))" }}
            >
              <Sparkles className="h-3 w-3 text-white" />
            </div>
            <span>© {new Date().getFullYear()} Interw.ai — Tous droits réservés</span>
          </div>
          <div className="flex items-center gap-5">
            <button
              type="button"
              onClick={openDemo}
              className="cursor-pointer border-0 bg-transparent p-0 transition-colors hover:text-foreground"
              style={{ color: "inherit", font: "inherit" }}
            >
              Contact
            </button>
            <Link to="/legal" className="transition-colors hover:text-foreground">Mentions légales</Link>
            <Link to="/privacy" className="transition-colors hover:text-foreground">Confidentialité</Link>
          </div>
        </div>
      </footer>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}

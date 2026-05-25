import { useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DemoRequestDialog from "@/components/landing/DemoRequestDialog";
import candidateWoman from "@/assets/hero-candidate-video.jpg";
import candidateMan from "@/assets/hero-candidate-video-man.jpg";
import shortlistAvatar1 from "@/assets/candidates/candidate-woman-1.jpg";
import shortlistAvatar2 from "@/assets/candidates/candidate-man-1.jpg";
import shortlistAvatar3 from "@/assets/candidates/candidate-woman-2.jpg";
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
  Play,
} from "lucide-react";

/* ---------------- Hero mock: live video interview ---------------- */
function HeroInterviewMock() {
  return (
    <div
      className="landing-fade-up landing-delay-2 relative mx-auto w-full max-w-md"
      style={{ transform: "rotate(-2deg)" }}
    >
      <div
        className="absolute -inset-6 -z-10 rounded-[24px] blur-2xl"
        style={{ background: "radial-gradient(ellipse at center, hsl(243 75% 60% / 0.18), transparent 70%)" }}
      />
      <div
        className="relative overflow-hidden rounded-2xl"
        style={{
          background: "#0f1020",
          border: "1px solid hsl(230 16% 92%)",
          boxShadow: "0 30px 80px -20px hsl(243 75% 60% / 0.25), 0 1px 2px hsl(240 10% 10% / 0.04)",
        }}
      >
        {/* Browser top bar */}
        <div className="flex items-center gap-1.5 px-4 py-2.5" style={{ background: "#1a1b2e", borderBottom: "1px solid hsl(230 20% 20%)" }}>
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#ff5f57" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#febc2e" }} />
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: "#28c840" }} />
          <div className="ml-3 flex-1 truncate rounded px-2 py-0.5 text-[10px]" style={{ background: "hsl(230 20% 14%)", color: "hsl(230 8% 65%)" }}>
            interw.ai/entretien/marie-d
          </div>
        </div>

        {/* Video stage */}
        <div className="relative aspect-[16/10] overflow-hidden">
          {/* Candidate video feed */}
          <img
            src={candidateWoman}
            alt="Candidate en entretien vidéo"
            className="absolute inset-0 h-full w-full object-cover"
          />
          {/* Subtle vignette for readability of overlays */}
          <div className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(180deg, hsl(230 20% 5% / 0.25) 0%, transparent 30%, transparent 55%, hsl(230 20% 5% / 0.55) 100%)" }} />


          {/* REC indicator */}
          <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-md px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white" style={{ background: "hsl(0 75% 50% / 0.9)" }}>
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" />
            REC
          </div>

          {/* Timer */}
          <div className="absolute right-3 top-3 rounded-md px-2 py-1 font-mono text-[10px] text-white" style={{ background: "hsl(230 20% 10% / 0.7)" }}>
            01:24
          </div>

          {/* AI question overlay */}
          <div className="absolute inset-x-3 bottom-3 rounded-lg p-3" style={{ background: "hsl(230 20% 10% / 0.85)", backdropFilter: "blur(8px)" }}>
            <div className="flex items-start gap-2.5">
              <div
                className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md"
                style={{ background: "linear-gradient(135deg, hsl(243 75% 60%), hsl(290 70% 60%))" }}
              >
                <Sparkles className="h-3 w-3 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-wider" style={{ color: "hsl(230 8% 65%)" }}>
                  Question 2 / 5
                </div>
                <div className="mt-0.5 text-sm font-medium text-white">
                  Décrivez un projet dont vous êtes particulièrement fier.
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer controls */}
        <div className="flex items-center justify-between px-4 py-3" style={{ background: "#16172a", borderTop: "1px solid hsl(230 20% 20%)" }}>
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-full" style={{ background: "hsl(243 75% 60% / 0.2)" }}>
              <Video className="h-3.5 w-3.5" style={{ color: "hsl(243 75% 70%)" }} />
            </div>
            <div className="text-[11px]" style={{ color: "hsl(230 8% 70%)" }}>
              Entretien en cours · Marie D.
            </div>
          </div>
          <div className="flex items-center gap-1">
            {[60, 100, 80, 120, 70, 90, 50].map((h, i) => (
              <span
                key={i}
                className="w-0.5 rounded-full"
                style={{ height: `${h / 10}px`, background: "hsl(243 75% 60%)" }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Small product cards (3 moments) ---------------- */
function ProjectCreationCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "hsl(230 14% 88%)", boxShadow: "0 10px 30px -15px hsl(243 75% 60% / 0.2)" }}>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "hsl(243 78% 54%)" }}>
          <FileText className="h-3.5 w-3.5" /> ÉTAPE 1 · CRÉATION
        </div>
        <h3 className="mt-2 text-lg font-semibold text-foreground">Vous définissez l'entretien</h3>
        <p className="mt-1 text-sm" style={{ color: "hsl(230 8% 46%)" }}>
          Poste, questions et critères d'évaluation.
        </p>
      </div>
      <div className="mx-5 mb-5 space-y-2.5 rounded-xl p-4" style={{ background: "hsl(240 25% 97%)", border: "1px solid hsl(230 14% 90%)" }}>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "hsl(230 8% 46%)" }}>Intitulé du poste</div>
          <div className="mt-1 rounded-md bg-white px-2.5 py-1.5 text-[12px] font-medium text-foreground" style={{ border: "1px solid hsl(230 14% 90%)" }}>
            Office manager
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "hsl(230 8% 46%)" }}>Questions</div>
          <div className="mt-1 space-y-1">
            <div className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[11px] text-foreground" style={{ border: "1px solid hsl(230 14% 90%)" }}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-semibold text-white" style={{ background: "hsl(243 75% 60%)" }}>1</span>
              Parlez-moi de votre parcours.
            </div>
            <div className="flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[11px] text-foreground" style={{ border: "1px solid hsl(230 14% 90%)" }}>
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-semibold text-white" style={{ background: "hsl(243 75% 60%)" }}>2</span>
              Comment gérez-vous un désaccord ?
            </div>
          </div>
        </div>
        <div>
          <div className="text-[10px] font-medium uppercase tracking-wider" style={{ color: "hsl(230 8% 46%)" }}>Critères</div>
          <div className="mt-1 flex flex-wrap gap-1.5">
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "hsl(243 100% 94%)", color: "hsl(243 78% 54%)" }}>Technique</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "hsl(243 100% 94%)", color: "hsl(243 78% 54%)" }}>Communication</span>
            <span className="rounded-full px-2 py-0.5 text-[10px] font-medium" style={{ background: "hsl(243 100% 94%)", color: "hsl(243 78% 54%)" }}>Autonomie</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function InterviewLiveCard() {
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "hsl(230 14% 88%)", boxShadow: "0 10px 30px -15px hsl(243 75% 60% / 0.2)" }}>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "hsl(243 78% 54%)" }}>
          <Video className="h-3.5 w-3.5" /> ÉTAPE 2 · L'ENTRETIEN
        </div>
        <h3 className="mt-2 text-lg font-semibold text-foreground">Le candidat passe l'entretien vidéo</h3>
        <p className="mt-1 text-sm" style={{ color: "hsl(230 8% 46%)" }}>
          Le candidat répond face caméra, à son rythme.
        </p>
      </div>
      <div className="relative mx-5 mb-5 aspect-[16/9] overflow-hidden rounded-xl" style={{ background: "linear-gradient(135deg, #1e1f3a, #2a1b3d)" }}>
        <img src={candidateMan} alt="Candidat en entretien vidéo" className="absolute inset-0 h-full w-full object-cover my-0" />
        <div className="absolute inset-0 my-[55px] border-0" style={{ background: "linear-gradient(180deg, hsl(230 20% 8% / 0.15) 0%, transparent 40%, hsl(230 20% 8% / 0.55) 100%)" }} />
        <div className="absolute left-2 top-2 flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase text-white" style={{ background: "hsl(0 75% 50% / 0.9)" }}>
          <span className="h-1 w-1 animate-pulse rounded-full bg-white" /> REC
        </div>
        <div className="absolute inset-x-2 bottom-2 rounded px-2 py-1.5 text-[11px] text-white" style={{ background: "hsl(230 20% 10% / 0.85)" }}>
          « Décrivez un projet dont vous êtes fier. »
        </div>
      </div>
    </div>
  );
}

function CandidatesShortlistCard() {
  const candidates = [
    { initials: "MD", photo: shortlistAvatar1, name: "Marie D. - 24:20", score: 92, label: "Recommandé", tone: "good" as const },
    { initials: "TL", photo: shortlistAvatar2, name: "Thomas L. - 26:12", score: 78, label: "À considérer", tone: "mid" as const },
    { initials: "SR", photo: shortlistAvatar3, name: "Sofia R. - 14:55", score: 64, label: "Réserve", tone: "low" as const },
  ];
  const toneColors = {
    good: { bg: "hsl(152 70% 95%)", fg: "hsl(152 60% 38%)", ring: "hsl(152 60% 45%)" },
    mid: { bg: "hsl(38 100% 94%)", fg: "hsl(32 80% 42%)", ring: "hsl(32 90% 55%)" },
    low: { bg: "hsl(230 14% 94%)", fg: "hsl(230 10% 40%)", ring: "hsl(230 14% 70%)" },
  };
  return (
    <div className="relative overflow-hidden rounded-2xl border bg-white" style={{ borderColor: "hsl(230 14% 88%)", boxShadow: "0 10px 30px -15px hsl(243 75% 60% / 0.2)" }}>
      <div className="p-5">
        <div className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider" style={{ color: "hsl(243 78% 54%)" }}>
          <Brain className="h-3.5 w-3.5" /> ÉTAPE 3 · LE RAPPORT IA
        </div>
        <h3 className="mt-2 text-lg font-semibold text-foreground">Comparez vos candidats </h3>
        <p className="mt-1 text-sm" style={{ color: "hsl(230 8% 46%)" }}>
          Et choisissez qui vous sélectionnez...
        </p>
      </div>
      <div className="mx-5 mb-5 space-y-2 rounded-xl p-3" style={{ background: "hsl(240 25% 97%)", border: "1px solid hsl(230 14% 90%)" }}>
        {candidates.map((c) => {
          const colors = toneColors[c.tone];
          const circumference = 2 * Math.PI * 14;
          const offset = circumference - (c.score / 100) * circumference;
          return (
            <div key={c.initials} className="flex items-center gap-3 rounded-lg bg-white p-2.5" style={{ border: "1px solid hsl(230 14% 90%)" }}>
              <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-full bg-muted ring-2 ring-white" style={{ boxShadow: "0 2px 6px -2px hsl(230 20% 20% / 0.25)" }}>
                <img src={c.photo} alt={c.name} className="absolute inset-0 h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12px] font-semibold text-foreground">{c.name}</div>
                <div className="mt-0.5 inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium" style={{ background: colors.bg, color: colors.fg }}>
                  {c.label}
                </div>
              </div>
              <div className="relative h-9 w-9 shrink-0">
                <svg viewBox="0 0 36 36" className="h-full w-full -rotate-90">
                  <circle cx="18" cy="18" r="14" fill="none" stroke="hsl(230 16% 90%)" strokeWidth="3" />
                  <circle cx="18" cy="18" r="14" fill="none" stroke={colors.ring} strokeWidth="3" strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-[11px] font-bold text-foreground">{c.score}</div>
              </div>
            </div>
          );
        })}
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
            <a href="#features" className="transition-colors hover:text-foreground">Fonctionnement</a>
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
              <h1 className="landing-fade-up landing-delay-1 text-4xl font-semibold leading-[1.05] md:text-6xl text-left">
                <span className="landing-gradient-text mx-0 px-0 text-5xl">
                  Évaluez les candidats,<br />pas leur CV.
                </span>
              </h1>
              <p className="landing-fade-up landing-delay-2 mt-6 max-w-xl text-lg md:text-xl" style={{ color: "hsl(230 10% 25%)" }}>
                Faites passer vos entretiens en vidéo asynchrone.<br />L'IA évalue chaque candidat selon vos critères.
              </p>
              <p className="landing-fade-up landing-delay-2 mt-5 max-w-xl text-base leading-relaxed" style={{ color: "hsl(230 8% 42%)" }}>
                Vous définissez les questions et les critères et le candidat passe l'entretien quand il veut. Notre IA délivre un rapport détaillé.<br />
                Vous donnez une chance à tous, vous sélectionnez les meilleurs.
              </p>
              <div className="landing-fade-up landing-delay-3 mt-8 text-center">
                <button
                  type="button"
                  onClick={openDemo}
                  className="landing-btn-white group inline-flex items-center gap-3 rounded-xl px-8 py-3.5 text-center font-semibold shadow-lg shadow-indigo-500/20 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-indigo-500/30"
                >
                  <span className="flex flex-col leading-tight">
                    <span className="text-base">Commencer gratuitement</span>
                    <span className="text-xs font-medium opacity-80">20 entretiens offerts</span>
                  </span>
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                </button>
                <p className="mt-3 text-xs text-center" style={{ color: "hsl(230 8% 52%)" }}>
                  Sans CB · Sans engagement · Setup en 10 min
                </p>
              </div>
            </div>

            {/* Right column — mock report */}
            <div className="mt-4 md:mt-0">
              <HeroInterviewMock />
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRODUCT MOMENTS ============ */}
      <section style={{ background: "hsl(0 0% 100%)" }}>
        <div className="mx-auto max-w-6xl px-6 pb-24">
          <div className="mx-auto max-w-2xl text-center">
            <span className="landing-pill">EN 3 ETAPES SIMPLES</span>
            <h2 className="mt-5 text-3xl font-semibold md:text-5xl">
              Laissez une chance à tous,<br />rencontrez les meilleurs.
            </h2>
          </div>
          <div className="mt-12 grid gap-6 md:grid-cols-3">
            <ProjectCreationCard />
            <InterviewLiveCard />
            <CandidatesShortlistCard />
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
            <h2 className="mt-5 text-3xl landing-gradient-text md:text-3xl">
              Gagnez du temps tout en gardant la main.
            </h2>
            <p className="mt-5 text-base md:text-lg" style={{ color: "hsl(230 8% 42%)" }}>
              Vous gardez le contrôle. L'IA fait le travail d'analyse a posteriori. Chaque candidat a enfin une vraie chance d'être entendu.
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
                  Vos questions, votre méthode
                </h3>
                <p className="mt-4 text-base leading-relaxed" style={{ color: "hsl(230 10% 25%)" }}>
                  Vous choisissez les questions et fixez vos critères d'évaluation. Le candidat répond depuis son navigateur, quand il veut. Vous ne perdez jamais la main sur votre recrutement, l'outil s'adapte à votre méthode, pas l'inverse.
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
                  Un recrutement plus équitable
                </h3>
                <p className="mt-4 text-base leading-relaxed" style={{ color: "hsl(230 10% 25%)" }}>
                  Peu importe le nom, l'école ou le parcours : chaque candidat répond aux mêmes questions, évalué selon les mêmes critères. Vous donnez une vraie chance à ceux dont le CV aurait été vite écarté.&nbsp;
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
            <h2 className="mt-5 text-3xl landing-gradient-text md:text-3xl">
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
            <h2 className="mt-5 text-3xl landing-gradient-text md:text-3xl">
              Une formule simple, adaptée à votre volume.
            </h2>
            <p className="mt-5 text-base md:text-lg" style={{ color: "hsl(230 8% 42%)" }}>
              Sans engagement. Commencez gratuitement, payez à l'usage, passez en illimité quand vous êtes prêt.
            </p>
          </div>

          <div className="mt-16 grid gap-6 md:grid-cols-3">
            {[
              {
                name: "Pay As You Go",
                price: "3 €",
                priceSuffix: "/ entretien",
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
                  "50 entretiens inclus",
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
            <h2 className="mt-5 text-3xl landing-gradient-text md:text-3xl">
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
            Et si votre prochain recrutement était celui que vous auriez écarté sur CV ?
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-base md:text-lg" style={{ color: "hsl(230 8% 38%)" }}>
            En 20 minutes, on vous montre comment interw.ai s'intègre à votre méthode de recrutement, sans la remplacer.
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

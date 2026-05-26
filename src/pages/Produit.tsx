import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import DemoRequestDialog from "@/components/landing/DemoRequestDialog";
import { ArrowRight, Sparkles, FolderKanban, FileText, Library, Scale, Activity } from "lucide-react";

import shotDashboard from "@/assets/product-dashboard.png";
import shotProjects from "@/assets/product-projects.png";
import shotProject from "@/assets/product-project-detail.png";
import shotReport from "@/assets/product-report.png";
import shotQuestions from "@/assets/product-questions.png";
import shotCriteria from "@/assets/product-criteria.png";

type Block = {
  pill: string;
  title: string;
  desc: string;
  bullets: string[];
  img: string;
  icon: React.ReactNode;
};

const BLOCKS: Block[] = [
  {
    pill: "Tableau de bord",
    title: "Pilotez en un coup d'œil",
    desc: "Tous vos projets, vos candidats les plus prometteurs et vos décisions en attente sont réunis sur un seul écran. ",
    bullets: [
      "Projets actifs, sessions complétées et score moyen",
      "Meilleurs candidats des 30 derniers jours mis en avant",
      "Candidats à traiter pour ne perdre aucun profil",
    ],
    img: shotDashboard,
    icon: <Sparkles className="h-4 w-4" />,
  },
  {
    pill: "Projets",
    title: "Un projet par poste, vos questions, vos critères",
    desc: "Créez un projet en moins de 10 minutes. Choisissez vos questions, définissez vos critères, partagez le lien aux candidats qui répondent quand ils veulent.",
    bullets: [
      "Lien candidat unique, partageable par email ou RS",
      "Suivi de l'avancement par projet et par candidat",
    ],
    img: shotProjects,
    icon: <FolderKanban className="h-4 w-4" />,
  },
  {
    pill: "Suivi candidats",
    title: "Visualisez chaque entretien, triez en quelques clics",
    desc: "Toutes les réponses vidéo, notées par l'IA selon vos critères. Vous classez chaque candidat : à discuter, retenu, RDV, oui ou non — sans jamais quitter la page.",
    bullets: [
      "Vidéos, notes IA et décisions sur la même vue",
      "Filtres rapides : à traiter, à discuter, retenus",
      "Notes recruteur pour partager votre avis avec l'équipe",
    ],
    img: shotProject,
    icon: <FolderKanban className="h-4 w-4" />,
  },
  {
    pill: "Rapport IA",
    title: "Un rapport détaillé pour chaque candidat",
    desc: "l'IA transcrit et analyse l'entretien en fonction des critères que vous avez définis. Puis une analyse orale et visuelle du candidat est produite, ainsi qu'un score Big Five (personnalité).",
    bullets: [
      "Score Fit Poste et synthèse en une phrase",
      "Évaluation critère par critère avec niveau (Excellent, Partiel, Manquant)",
      "Citations exactes du candidat avec horodatage vidéo",
    ],
    img: shotReport,
    icon: <FileText className="h-4 w-4" />,
  },
  {
    pill: "Bibliothèque",
    title: "Vos questions et critères, prêts à réutiliser",
    desc: "Construisez votre bibliothèque au fil du temps. Réutilisez les bonnes questions sur tous vos projets, capitalisez sur ce qui fonctionne.",
    bullets: [
      "Questions classées par type (écrite, vidéo, énigme…)",
      "Critères réutilisables sur tous vos projets",
      "Intros et modèles d'emails personnalisables",
    ],
    img: shotQuestions,
    icon: <Library className="h-4 w-4" />,
  },
  {
    pill: "Critères d'évaluation",
    title: "Vos critères, votre méthode — pas une grille générique",
    desc: "Définissez précisément ce que vous cherchez : soft skills, motivation, clarté du discours, compétences métier. L'IA évalue chaque candidat exactement selon vos critères.",
    bullets: [
      "Critères 100 % personnalisables, sans limite",
      "Description détaillée pour guider l'analyse IA",
      "Mêmes critères = mêmes règles pour tous les candidats",
    ],
    img: shotCriteria,
    icon: <Scale className="h-4 w-4" />,
  },
];

export default function Produit() {
  const { session, loading } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.title = "Produit — Interw.ai";
    const desc =
      "Découvrez interw.ai : entretiens vidéo asynchrones, rapports IA détaillés, bibliothèques de questions et critères. Une plateforme complète pour évaluer vos candidats sans biais.";
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

  const openDemo = (e?: React.MouseEvent) => {
    e?.preventDefault();
    setDemoOpen(true);
  };

  if (loading) return null;

  return (
    <div className="landing-root min-h-screen">
      <div className="landing-grain" aria-hidden />

      {/* NAVBAR */}
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
            <Link to="/produit" className="transition-colors text-foreground">Produit</Link>
            <Link to="/#how" className="transition-colors hover:text-foreground">Fonctionnement</Link>
            <Link to="/#pricing" className="transition-colors hover:text-foreground">Tarifs</Link>
            <Link to="/#faq" className="transition-colors hover:text-foreground">Questions</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm transition-colors hover:text-foreground" style={{ color: "hsl(230 8% 42%)" }}>
              Se connecter
            </Link>
            <span className="hidden h-5 w-px md:block" style={{ background: "hsl(230 14% 88%)" }} />
            <button
              type="button"
              onClick={openDemo}
              className="landing-btn-primary inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-medium"
            >
              Planifier une démo
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: "hsl(0 0% 100%)" }}>
        <div className="landing-bg-grid absolute inset-0 -z-10" />
        <div className="landing-hero-glow absolute inset-0 -z-10" />
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
          <span className="landing-pill">Produit</span>
          <h1 className="landing-fade-up landing-delay-1 mt-5 text-4xl font-semibold leading-[1.05] md:text-6xl">
            <span className="landing-gradient-text">
              Un outil pour recruter mieux, plus vite, et tout en laissant une chance à tous.
            </span>
          </h1>
          <p className="landing-fade-up landing-delay-2 mx-auto mt-6 max-w-2xl text-lg md:text-xl" style={{ color: "hsl(230 10% 25%)" }}>
            Entretiens vidéo asynchrones, rapports détaillés, bibliothèques réutilisables.
            Une plateforme pensée pour les équipes qui veulent évaluer des candidats, pas leur CV.
          </p>
          <div className="landing-fade-up landing-delay-3 mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={openDemo}
              className="landing-btn-white inline-flex h-12 items-center gap-2 px-6 text-sm font-semibold"
            >
              Planifier une démo
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/#pricing"
              className="inline-flex h-12 items-center gap-2 rounded-md px-6 text-sm font-semibold"
              style={{ border: "1px solid hsl(230 14% 84%)", color: "hsl(230 10% 25%)" }}
            >
              Voir les tarifs
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURE BLOCKS */}
      <section style={{ background: "hsl(240 20% 98%)" }}>
        <div className="mx-auto max-w-6xl px-6 py-20 md:py-28 space-y-24 md:space-y-32">
          {BLOCKS.map((b, i) => {
            const reverse = i % 2 === 1;
            return (
              <div
                key={b.pill}
                className={`grid items-center gap-10 md:gap-16 md:grid-cols-2 ${reverse ? "md:[&>div:first-child]:order-2" : ""}`}
              >
                <div className="self-center">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white"
                    style={{ background: "hsl(243 75% 60%)" }}
                  >
                    {b.icon}
                    {b.pill}
                  </span>
                  <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl leading-tight">
                    {b.title}
                  </h2>
                  <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: "hsl(230 10% 30%)" }}>
                    {b.desc}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {b.bullets.map((bl) => (
                      <li key={bl} className="flex items-start gap-2.5 text-sm" style={{ color: "hsl(230 10% 25%)" }}>
                        <Activity className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(243 75% 60%)" }} />
                        <span>{bl}</span>
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="relative">
                  <div
                    className="absolute -inset-4 -z-10 rounded-3xl blur-2xl"
                    style={{ background: "radial-gradient(ellipse at center, hsl(243 75% 60% / 0.18), transparent 70%)" }}
                  />
                  <div
                    className="overflow-hidden rounded-xl"
                    style={{
                      border: "1px solid hsl(230 14% 88%)",
                      boxShadow: "0 30px 80px -20px hsl(243 75% 60% / 0.22), 0 1px 2px hsl(240 10% 10% / 0.04)",
                      background: "white",
                    }}
                  >
                    <img src={b.img} alt={b.title} loading="lazy" className="block w-full h-auto" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section style={{ background: "hsl(0 0% 100%)" }}>
        <div className="mx-auto max-w-4xl px-6 py-24 text-center">
          <h2 className="text-3xl md:text-5xl landing-gradient-text">
            Prêt à voir interw.ai sur vos propres recrutements ?
          </h2>
          <p className="mt-5 text-base md:text-lg" style={{ color: "hsl(230 8% 42%)" }}>
            20 entretiens offerts. Sans carte bancaire. Setup en 10 minutes.
          </p>
          <button
            type="button"
            onClick={openDemo}
            className="landing-btn-white mt-8 inline-flex h-12 items-center gap-2 px-6 text-sm font-semibold"
          >
            Planifier une démo
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}

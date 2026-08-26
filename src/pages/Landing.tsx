import { Fragment, useEffect, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import FunnelCards from "@/components/landing/FunnelCards";


import productProjects from "@/assets/product-projects.png";
import productReport from "@/assets/product-report.png";
import productDashboard from "@/assets/product-dashboard.png";
import paintingShore from "@/assets/backgrounds/painting-shore.jpeg";
import paintingPier from "@/assets/backgrounds/painting-pier.jpeg";
import paintingBay from "@/assets/backgrounds/painting-bay.jpeg";
import logoMorning from "@/assets/logos/logo-morning.png";
import logoLeclerc from "@/assets/logos/logo-leclerc.svg";
import logoCastalie from "@/assets/logos/logo-castalie.svg";
import logoAdsup from "@/assets/logos/logo-adsup-transparent.png";
import { ArrowRight, Check, ChevronDown, Minus } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const BETA_LOGOS = [
  { name: "Morning", src: logoMorning, className: "max-h-6 sm:max-h-8 md:max-h-9" },
  { name: "E.Leclerc", src: logoLeclerc, className: "max-h-7 sm:max-h-9 md:max-h-11" },
  { name: "Castalie", src: logoCastalie, className: "max-h-5 sm:max-h-7 md:max-h-8" },
  { name: "ad's up consulting", src: logoAdsup, className: "max-h-6 sm:max-h-8 md:max-h-9" },
];

const CAL_LINK = "https://calendar.app.google/C7YQSPArwRUyyQrk8";

const H2 = "text-[32px] md:text-[52px] leading-[1.08] font-semibold tracking-tight text-foreground";
const H3 = "text-[24px] md:text-[28px] leading-[1.15] font-semibold tracking-tight text-foreground";
const BODY = "text-[17px] md:text-[19px] leading-relaxed";

/* Ancien bloc chiffré — conservé au cas où
const PROBLEMS = [
  { stat: "200", title: "Candidatures par offre", desc: "..." },
  { stat: "8 min", title: "Un pré-entretien téléphonique", desc: "..." },
  { stat: "40 h", title: "200 candidats en visio", desc: "..." },
];
*/

/* Les 4 étapes de l'entonnoir vivent désormais dans FunnelCards.tsx */


const SECTIONS = [
  {
    title: "Vos questions, posées par vous.",
    desc: "Vous décrivez le poste, vous choisissez vos critères, vous filmez vos questions. Dix minutes, une fois. Le lien est prêt.",
    image: productProjects,
    alt: "Écran de création d'un poste dans Interw",
    background: paintingShore,
  },
  {
    title: "Chaque candidat passe en vidéo",
    desc: "Là où il est à l'aise, quand ça l'arrange : depuis chez lui, entre deux réunions, le soir après le travail. Pas de créneau à synchroniser — il vous voit poser vos questions, il y répond à son rythme.",
    image: productReport,
    alt: "Rapport d'entretien vidéo d'un candidat",
    background: paintingPier,
  },
  {
    title: "Les bons profils remontent, vous décidez.",
    desc: "Notre IA évalue sur vos critères, et chaque note s'appuie sur des extraits de réponses qui la justifie. Vous regardez dix secondes, deux minutes ou l'entretien entier — c'est vous qui tranchez.",
    image: productDashboard,
    alt: "Liste de candidats triés par score de correspondance",
    background: paintingBay,
  },
];

const PLANS = [
  {
    name: "Free",
    desc: "Pour essayer Interw sur un vrai recrutement.",
    monthly: "0 €",
    annual: "0 €",
    monthlyUnit: "",
    annualUnit: "",
    monthlyNote: "Pour toujours",
    annualNote: "Pour toujours",
    cta: "Créer un compte",
    featured: false,
    noCardNote: "",
    specs: [
      { label: "Postes actifs simultanés", value: "1" },
      { label: "Entretiens analysés / mois", value: "15" },
      { label: "Au-delà", value: "File d'attente", sub: "au mois suivant" },
      { label: "Utilisateurs", value: "1" },
    ],
  },
  {
    name: "Plus",
    desc: "Pour un manager ou une petite équipe qui recrute régulièrement.",
    monthly: "99 €",
    annual: "990 €",
    monthlyUnit: "/ mois",
    annualUnit: "/ an",
    monthlyNote: "Facturé chaque mois",
    annualNote: "Facturé une fois par an",
    cta: "Choisir Plus",
    featured: false,
    noCardNote: "",
    specs: [
      { label: "Postes actifs simultanés", value: "3", sub: "+29 € par poste (max 5)" },
      { label: "Entretiens analysés / mois", value: "50" },
      { label: "Au-delà", value: "3 € par entretien" },
      { label: "Utilisateurs", value: "Illimités" },
    ],
  },
  {
    name: "Pro",
    desc: "Pour la fonction RH qui déploie Interw sur tous ses recrutements.",
    monthly: "399 €",
    annual: "3 990 €",
    monthlyUnit: "/ mois",
    annualUnit: "/ an",
    monthlyNote: "Facturé chaque mois",
    annualNote: "Facturé une fois par an",
    cta: "Essayer Pro 30 jours",
    featured: true,
    noCardNote: "Sans carte bancaire",
    specs: [
      { label: "Postes actifs simultanés", value: "20" },
      { label: "Entretiens analysés / mois", value: "500" },
      { label: "Au-delà", value: "3 € par entretien" },
      { label: "Utilisateurs", value: "Illimités + rôles" },
    ],
  },
  {
    name: "Enterprise",
    desc: "Pour les organisations à volume, avec vos outils et vos règles.",
    monthly: "Sur devis",
    annual: "Sur devis",
    monthlyUnit: "",
    annualUnit: "",
    monthlyNote: "Engagement annuel",
    annualNote: "Engagement annuel",
    cta: "Parler à l'équipe",
    featured: false,
    noCardNote: "",
    specs: [
      { label: "Postes actifs simultanés", value: "Illimités" },
      { label: "Entretiens analysés / mois", value: "Négocié" },
      { label: "Au-delà", value: "Négocié" },
      { label: "Utilisateurs", value: "Illimités + rôles + SSO" },
    ],
  },
];

const COMPARISON = [
  {
    group: "Inclus dans tous les plans",
    rows: [
      { label: "Rapport IA complet", sub: "Fit poste, communication, verbatims ancrés", values: ["✓", "✓", "✓", "✓"] },
      { label: "Ressources réutilisables", sub: "Sessions types, questions, critères", values: ["✓", "✓", "✓", "✓"] },
    ],
  },
  {
    group: "Marque",
    rows: [
      { label: "Personnalisation", sub: "Votre logo, vos couleurs, sans mention Interw", values: ["—", "✓", "✓", "✓"] },
    ],
  },
  {
    group: "Équipe",
    rows: [
      { label: "Utilisateurs", values: ["1", "Illimités", "Illimités", "Illimités"] },
      { label: "Rôles et permissions", values: ["—", "—", "✓", "✓"] },
      { label: "SSO", values: ["—", "—", "—", "✓"] },
    ],
  },
  {
    group: "Intégrations",
    rows: [
      { label: "Intégration ATS", values: ["—", "—", "✓", "✓"] },
      { label: "API", values: ["—", "—", "—", "✓"] },
      { label: "MCP", sub: "Branchez Interw à vos agents IA", values: ["—", "—", "—", "✓"] },
    ],
  },
  {
    group: "Support",
    rows: [
      { label: "Email", values: ["✓", "✓", "✓", "✓"] },
      { label: "Prioritaire", values: ["—", "—", "✓", "✓"] },
      { label: "Téléphone et WhatsApp", values: ["—", "—", "✓", "✓"] },
      { label: "Support personnalisé", values: ["—", "—", "—", "✓"] },
    ],
  },
];

const FAQ = [
  {
    q: "Est-ce que l'IA décide à ma place ?",
    a: "Non. Interw transcrit les réponses, les confronte à vos critères et vous propose un ordre de lecture. Chaque appréciation renvoie à l'extrait de réponse qui la justifie, que vous pouvez écouter. Vous gardez la main sur qui vous rencontrez, et vous pouvez ignorer le classement.",
  },
  {
    q: "Où sont hébergées les vidéos et les données des candidats ?",
    a: "Les vidéos sont hébergées sur nos serveurs en France, et nous utilisons une IA hébergée en France.",
  },
  {
    q: "Qu'est-ce qu'un poste actif ?",
    a: "Un poste actif dans Interw correspond à un recrutement en cours. Quand le recrutement est terminé, archivez-le : le slot se libère immédiatement pour le suivant. Un poste permanent, comme des candidatures spontanées, occupe un slot en continu. Sur Plus, vous pouvez ajouter jusqu'à deux postes supplémentaires, à 29 € par mois chacun.",
  },
  {
    q: "Qu'est-ce qui compte comme un entretien ?",
    a: "Un candidat qui va au bout de sa session et dont le rapport est généré. Les invitations envoyées, les sessions abandonnées et vos propres tests ne comptent jamais. Vous pouvez partager votre lien aussi largement que vous voulez.",
  },
  {
    q: "Que se passe-t-il quand j'atteins mon quota ?",
    a: "Rien pour vos candidats : ils ne sont jamais bloqués. Sur Plus et Pro, chaque entretien supplémentaire est facturé 3 € sur votre facture suivante. Sur Free, les 15 candidats suivants sont conservés et analysés dès votre passage en Plus, ou au renouvellement de votre quota. Au-delà, le lien se ferme jusqu'au mois suivant.",
  },
  {
    q: "Comment fonctionne l'essai ?",
    a: "30 jours sur Pro, sans carte bancaire. Le compte à rebours démarre quand vous publiez votre premier poste, pas à l'inscription. Ensuite, vous choisissez un plan ou vous restez sur Free : tout ce que vous avez créé reste consultable.",
  },
  {
    q: "Mensuel ou annuel ?",
    a: "Le mensuel est sans engagement : vous montez ou descendez de plan quand vous voulez, y compris hors saison de recrutement. L'annuel, c'est 12 mois pour le prix de 10.",
  },
];

export default function Landing() {
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [billing, setBilling] = useState<"mensuel" | "annuel">("mensuel");

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }






  return (
    <div className="landing-root bg-background text-foreground min-h-screen">
      {/* ============ HEADER ============ */}
      <header
        className={`bg-background/90 sticky top-0 z-50 border-b backdrop-blur transition-colors ${
          scrolled ? "border-border" : "border-transparent"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-6">
          <Link to="/" className="text-[22px] font-semibold tracking-tight">
            Interw
          </Link>
          <nav className="text-muted-foreground hidden items-center gap-8 text-sm md:flex">
            <Link to="/produit" className="hover:text-foreground transition-colors">
              Produit
            </Link>
            <a href="#tarifs" className="hover:text-foreground transition-colors">
              Tarifs
            </a>
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              Se connecter
            </Link>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background inline-flex h-9 items-center rounded-lg px-3.5 font-medium transition-opacity hover:opacity-90"
            >
              Demander une démo
            </a>
          </div>
        </div>
      </header>

      {/* ============ HERO + VIDÉO + PREUVE (visibles sans scroll) ============ */}
      <div className="flex flex-col md:h-[calc(100dvh-4rem)]">
        <section className="mx-auto w-full max-w-5xl shrink-0 px-6 pt-14 pb-8 text-center md:pt-[3vh] md:pb-[2vh]">
          <h1 className="landing-fade-up mx-auto max-w-3xl text-[40px] leading-[1.05] font-semibold tracking-tight md:text-[clamp(2.5rem,4.4vh+1.2rem,4rem)]">
            Évaluez les candidats, pas leur CV.
          </h1>
          <p className="landing-fade-up landing-delay-1 text-muted-foreground mx-auto mt-5 max-w-2xl text-[17px] md:mt-[2vh] md:text-[clamp(1rem,1.4vh+0.5rem,1.1875rem)]">
            Vous posez vos questions face caméra. Chaque candidat y répond quand il veut, où il veut. Interw
            évalue chaque entretien sur vos critères et fait remonter les profils à voir en premier.
          </p>
          <div className="landing-fade-up landing-delay-2 mt-6 flex flex-col items-center md:mt-[2.5vh]">
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Demander une démo <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/login"
              className="text-foreground mt-4 text-sm font-medium underline underline-offset-4 hover:opacity-70"
            >
              Créer un compte gratuit
            </Link>
            <p className="text-muted-foreground mt-1.5 text-[13px]">
              Gratuit · 15 entretiens / mois · sans carte
            </p>
          </div>
        </section>

        <section className="mx-auto flex min-h-[180px] w-full max-w-5xl flex-1 px-6 pb-8 md:min-h-0 md:pb-[2vh]">
          <div className="landing-fade-up landing-delay-3 border-border relative flex min-h-0 w-full items-center justify-center overflow-hidden rounded-xl border bg-white">
            {/* Fond en grille — s'adapte à toutes les proportions du cadre */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                backgroundImage:
                  "linear-gradient(rgba(9,9,11,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(9,9,11,0.045) 1px, transparent 1px)",
                backgroundSize: "40px 40px",
              }}
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(60% 60% at 20% 10%, rgba(9,9,11,0.05) 0%, transparent 70%), radial-gradient(50% 50% at 90% 95%, rgba(9,9,11,0.035) 0%, transparent 70%)",
              }}
            />
            <video
              className="relative block h-full max-h-full w-full object-contain"
              poster="/tuto-poster.png"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
            >
              <source src="/demo-interwai.webm" type="video/webm" />
              <source src="/demo-interwai-20s.mp4" type="video/mp4" />
            </video>
          </div>
        </section>


        {/* ============ PREUVE ============ */}
        <section className="border-border shrink-0 border-y">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <p className="text-center text-lg font-bold tracking-tight sm:text-xl">
              Ils recrutent avec Interw
            </p>
            <div className="mt-5 grid grid-cols-4 items-center justify-items-center gap-x-4 sm:mt-6 sm:gap-x-10 md:gap-x-16">
              {BETA_LOGOS.map((logo) => (
                <img
                  key={logo.name}
                  src={logo.src}
                  alt={logo.name}
                  loading="lazy"
                  className={`${logo.className} h-auto w-full max-w-[150px] min-w-0 object-contain`}
                />
              ))}
            </div>
          </div>
        </section>
      </div>

      {/* ============ PROBLÈME ============ */}
      <section className="mx-auto max-w-5xl px-6 py-24">
        <h2 className={`mx-auto max-w-3xl text-center ${H2}`}>
          Aujourd'hui vous ne triez pas des candidats. Vous triez des documents.
        </h2>
        <FunnelCards />

        <p className="text-foreground mx-auto mt-14 max-w-2xl text-center text-[24px] leading-snug font-semibold tracking-tight md:text-[32px]">
          Tous les autres, vous ne les avez jamais entendus.
        </p>
      </section>

      {/* ============ PRODUIT ============ */}
      <section className="border-border border-t">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="max-w-3xl">
            <h2 className={H2}>Faites-les tous passer, sans y passer vos journées.</h2>
            <p className={`text-foreground/80 mt-5 ${BODY}`}>
              L'IA transcrit chaque entretien et le confronte à vos questions comme à vos critères. Les
              meilleurs profils remontent — y compris ceux qu'un CV vous aurait fait manquer.
            </p>
          </div>
          <div className="mt-20 space-y-24">
          {SECTIONS.map((s) => (
            <div key={s.title}>
              <h3 className={`max-w-xl ${H3}`}>{s.title}</h3>
              <p className={`text-muted-foreground mt-3 max-w-2xl ${BODY}`}>{s.desc}</p>
              <div
                className="border-border mt-8 overflow-hidden rounded-xl border bg-cover bg-center p-4 md:p-10"
                style={{ backgroundImage: `url(${s.background})` }}
              >
                <img
                  src={s.image}
                  alt={s.alt}
                  loading="lazy"
                  className="border-border bg-background w-full rounded-lg border shadow-lg"
                />
              </div>
            </div>
          ))}
          </div>
        </div>
      </section>

      {/* ============ TARIFS ============ */}
      <section id="tarifs" className="border-border border-t">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="max-w-2xl">
            <h2 className={H2}>Nos tarifs</h2>
          </div>

          {/* Toggle mensuel / annuel */}
          <div className="mt-8 flex flex-col items-center gap-3">
            <div className="bg-muted inline-flex rounded-lg p-1">
              <button
                type="button"
                onClick={() => setBilling("mensuel")}
                aria-selected={billing === "mensuel"}
                className={`inline-flex h-8 items-center rounded-md px-3.5 text-sm font-medium transition-all ${
                  billing === "mensuel" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Mensuel
              </button>
              <button
                type="button"
                onClick={() => setBilling("annuel")}
                aria-selected={billing === "annuel"}
                className={`inline-flex h-8 items-center gap-2 rounded-md px-3.5 text-sm font-medium transition-all ${
                  billing === "annuel" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                Annuel
                <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  2 mois offerts
                </span>
              </button>
            </div>
            <p className="text-muted-foreground text-xs">
              Prix HT. Sans engagement, changez de plan quand vous voulez.
            </p>
          </div>

          {/* Cartes */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLANS.filter((p) => p.name !== "Enterprise").map((p) => {
              const price = billing === "annuel" ? p.annual : p.monthly;
              const unit = billing === "annuel" ? p.annualUnit : p.monthlyUnit;
              const note = billing === "annuel" ? p.annualNote : p.monthlyNote;
              return (
                <div
                  key={p.name}
                  className={`relative flex flex-col rounded-xl border p-5 ${
                    p.featured ? "border-foreground bg-background" : "border-border bg-background"
                  }`}
                >
                  {p.featured && (
                    <span className="bg-foreground text-background absolute -top-2.5 left-6 inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-semibold">
                      Recommandé
                    </span>
                  )}
                  {/* Nom + description — hauteur fixe (3 lignes) */}
                  <div className="h-[88px]">
                    <h3 className="text-base font-semibold">{p.name}</h3>
                    <p className="text-muted-foreground mt-1 text-[13px] leading-snug">{p.desc}</p>
                  </div>
                  {/* Prix — hauteur fixe */}
                  <div className="flex h-12 items-baseline gap-1.5">
                    <span className="text-4xl font-semibold tracking-tight">{price}</span>
                    {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
                  </div>
                  {/* Note sous le prix — hauteur fixe même si vide */}
                  <p className="text-muted-foreground h-5 text-xs">{note}</p>
                  {/* Bouton */}
                  <Link
                    to="/login"
                    className={`mt-1 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-opacity hover:opacity-90 ${
                      p.featured
                        ? "bg-foreground text-background"
                        : "border-border bg-background text-foreground border hover:bg-muted"
                    }`}
                  >
                    {p.cta}
                  </Link>
                  {/* Note sous le bouton — hauteur fixe identique pour les 4 cartes */}
                  <p className="mt-1 h-5 text-center text-[11px] text-muted-foreground">{p.noCardNote}</p>
                  {/* Caractéristiques — hauteur fixe identique, séparateurs alignés */}
                  <div className="border-border border-t mt-2">
                    {p.specs.map((s, idx) => {
                      const tall = idx === 0 || idx === 2 || idx === 3;
                      return (
                        <div
                          key={s.label}
                          className={`border-border flex items-center justify-between gap-2 overflow-hidden border-b ${
                            tall ? "h-[62px]" : "h-[46px]"
                          } last:border-0`}
                        >
                          <span className="text-muted-foreground text-[12px] leading-tight">{s.label}</span>
                          <span className="max-w-[60%] text-right text-sm font-semibold leading-tight">
                            {s.value}
                            {s.sub && (
                              <span className="text-muted-foreground block text-[10px] font-normal leading-tight">
                                {s.sub}
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Enterprise — une seule ligne */}
          <div className="border-border mt-4 flex flex-col items-start justify-between gap-4 rounded-xl border p-5 sm:flex-row sm:items-center">
            <p className={`text-foreground ${BODY}`}>
              <span className="font-semibold">Enterprise</span> — volumes importants, SSO, vos outils et vos
              règles. Sur devis.
            </p>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border text-foreground hover:bg-muted inline-flex h-10 shrink-0 items-center rounded-lg border px-4 text-sm font-medium transition-colors"
            >
              Parler à l'équipe
            </a>
          </div>

          {/* Comparatif — replié par défaut */}
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="comparatif" className="border-border rounded-xl border px-5">
              <AccordionTrigger className="text-[17px] font-semibold hover:no-underline">
                Comparer les plans en détail
              </AccordionTrigger>
              <AccordionContent className="pb-6">
          {/* Desktop : tableau */}
          <div className="border-border hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full min-w-[760px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-border bg-background border-b px-4 py-3.5 text-left text-sm font-semibold">
                    Fonctionnalité
                  </th>
                  <th className="border-border bg-background border-b px-4 py-3.5 text-center text-sm font-semibold">
                    Free
                  </th>
                  <th className="border-border bg-background border-b px-4 py-3.5 text-center text-sm font-semibold">
                    Plus
                  </th>
                  <th className="bg-muted/40 border-border border-b px-4 py-3.5 text-center text-sm font-semibold">
                    Pro
                  </th>
                  <th className="border-border bg-background border-b px-4 py-3.5 text-center text-sm font-semibold">
                    Enterprise
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((g) => (
                  <Fragment key={g.group}>
                    <tr>
                      <th
                        colSpan={5}
                        className="bg-muted text-muted-foreground border-border border-b px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                      >
                        {g.group}
                      </th>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label}>
                        <th className="border-border bg-background border-b px-4 py-3 text-left text-sm font-medium">
                          {r.label}
                          {r.sub && (
                            <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                              {r.sub}
                            </span>
                          )}
                        </th>
                        {r.values.map((v, i) => (
                          <td
                            key={i}
                            className={`border-border border-b px-4 py-3 text-center text-sm ${
                              i === 2 ? "bg-muted/40" : ""
                            }`}
                          >
                            {v === "✓" ? (
                              <Check className="text-foreground mx-auto h-4 w-4" />
                            ) : v === "—" ? (
                              <Minus className="text-muted-foreground/40 mx-auto h-4 w-4" />
                            ) : (
                              <span className="font-medium">{v}</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile : vue empilée, sans scroll latéral */}
          <div className="border-border divide-border divide-y rounded-xl border md:hidden">
            {COMPARISON.map((g) => (
              <div key={g.group} className="px-4 py-3">
                <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  {g.group}
                </h3>
                <div className="mt-2 divide-border divide-y">
                  {g.rows.map((r) => (
                    <div key={r.label} className="py-2.5">
                      <p className="text-sm font-medium">
                        {r.label}
                        {r.sub && (
                          <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                            {r.sub}
                          </span>
                        )}
                      </p>
                      <div className="mt-2 grid grid-cols-4 gap-2">
                        {r.values.map((v, i) => (
                          <div
                            key={i}
                            className={`flex flex-col items-center gap-0.5 rounded-md border px-1 py-1.5 ${
                              i === 2 ? "border-foreground/30 bg-muted/40" : "border-border"
                            }`}
                          >
                            <span className="text-muted-foreground text-[10px] font-semibold uppercase">
                              {["F", "+", "Pro", "E"][i]}
                            </span>
                            {v === "✓" ? (
                              <Check className="text-foreground h-4 w-4" />
                            ) : v === "—" ? (
                              <Minus className="text-muted-foreground/40 h-4 w-4" />
                            ) : (
                              <span className="text-center text-[11px] font-medium leading-tight">
                                {v}
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="border-border border-t">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="mb-6">
            <h2 className={H2}>Questions fréquentes</h2>
            <p className={`text-muted-foreground mt-3 ${BODY}`}>Les règles, en clair.</p>
          </div>
          <div className="border-border border-t">
            {FAQ.map((item) => (
              <details key={item.q} className="border-border border-b group">
                <summary className="text-foreground flex cursor-pointer items-center justify-between py-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                  {item.q}
                  <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-muted-foreground pb-4 pr-8 text-[15px] leading-relaxed md:text-[16px]">{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CLÔTURE ============ */}
      <section className="border-border border-t">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className={H2}>
            Et si votre prochain recrutement était celui que vous auriez écarté sur CV ?
          </h2>
          <div className="mt-9 flex flex-col items-center">
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-medium transition-opacity hover:opacity-90"
            >
              Demander une démo <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/login"
              className="text-foreground mt-4 text-sm font-medium underline underline-offset-4 hover:opacity-70"
            >
              Créer un compte gratuit
            </Link>
            <p className="text-muted-foreground mt-1.5 text-[13px]">
              Gratuit · 15 entretiens / mois · sans carte
            </p>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs md:flex-row">
          <span>© {new Date().getFullYear()} Interw</span>
          <div className="flex items-center gap-5">
            <a href={CAL_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              Demander une démo
            </a>
            <Link to="/legal" className="hover:text-foreground transition-colors">
              Mentions légales
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              Confidentialité
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

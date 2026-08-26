import { Fragment, useEffect, useRef, useState } from "react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import FunnelCards from "@/components/landing/FunnelCards";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";


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

function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el || visible) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [visible]);

  useEffect(() => {
    if (visible) ref.current?.load();
  }, [visible]);

  return (
    <video
      ref={ref}
      className="relative block h-full max-h-full w-full object-contain"
      poster="/demo-interwai-poster.png"
      autoPlay
      muted
      loop
      playsInline
      preload="none"
    >
      {visible && (
        <>
          <source src="/demo-interwai-hd.webm" type="video/webm" />
          <source src="/demo-interwai-hd.mp4" type="video/mp4" />
        </>
      )}
    </video>
  );
}

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

const SECTION_KEYS = [
  { key: "s1", image: productProjects, background: paintingShore },
  { key: "s2", image: productReport, background: paintingPier },
  { key: "s3", image: productDashboard, background: paintingBay },
] as const;

const PLAN_KEYS = [
  {
    key: "free",
    monthly: "0 €",
    annual: "0 €",
    monthlyUnitKey: null,
    annualUnitKey: null,
    monthlyNoteKey: "forever",
    annualNoteKey: "forever",
    featured: false,
    noCardNoteKey: null,
    specs: [
      { labelKey: "specs.activeRoles", value: "1" },
      { labelKey: "specs.interviews", value: "15" },
      { labelKey: "specs.beyond", valueKey: "values.queue", subKey: "values.queueSub" },
      { labelKey: "specs.users", value: "1" },
    ],
  },
  {
    key: "plus",
    monthly: "99 €",
    annual: "990 €",
    monthlyUnitKey: "perMonth",
    annualUnitKey: "perYear",
    monthlyNoteKey: "billedMonthly",
    annualNoteKey: "billedAnnually",
    featured: false,
    noCardNoteKey: null,
    specs: [
      { labelKey: "specs.activeRoles", value: "3", subKey: "values.extraRole" },
      { labelKey: "specs.interviews", value: "50" },
      { labelKey: "specs.beyond", valueKey: "values.perInterview" },
      { labelKey: "specs.users", valueKey: "values.unlimited" },
    ],
  },
  {
    key: "pro",
    monthly: "399 €",
    annual: "3 990 €",
    monthlyUnitKey: "perMonth",
    annualUnitKey: "perYear",
    monthlyNoteKey: "billedMonthly",
    annualNoteKey: "billedAnnually",
    featured: true,
    noCardNoteKey: "plans.pro.noCardNote",
    specs: [
      { labelKey: "specs.activeRoles", value: "20" },
      { labelKey: "specs.interviews", value: "500" },
      { labelKey: "specs.beyond", valueKey: "values.perInterview" },
      { labelKey: "specs.users", valueKey: "values.unlimitedRoles" },
    ],
  },
] as const;

const COMPARISON_KEYS = [
  {
    group: "compare.groups.all",
    rows: [
      { label: "compare.rows.report", sub: "compare.rows.reportSub", values: ["✓", "✓", "✓", "✓"] },
      { label: "compare.rows.resources", sub: "compare.rows.resourcesSub", values: ["✓", "✓", "✓", "✓"] },
    ],
  },
  {
    group: "compare.groups.brand",
    rows: [
      { label: "compare.rows.branding", sub: "compare.rows.brandingSub", values: ["—", "✓", "✓", "✓"] },
    ],
  },
  {
    group: "compare.groups.team",
    rows: [
      {
        label: "compare.rows.users",
        values: ["1", "values.unlimited", "values.unlimited", "values.unlimited"],
      },
      { label: "compare.rows.roles", values: ["—", "—", "✓", "✓"] },
      { label: "compare.rows.sso", values: ["—", "—", "—", "✓"] },
    ],
  },
  {
    group: "compare.groups.integrations",
    rows: [
      { label: "compare.rows.ats", values: ["—", "—", "✓", "✓"] },
      { label: "compare.rows.api", values: ["—", "—", "—", "✓"] },
      { label: "compare.rows.mcp", sub: "compare.rows.mcpSub", values: ["—", "—", "—", "✓"] },
    ],
  },
  {
    group: "compare.groups.support",
    rows: [
      { label: "compare.rows.email", values: ["✓", "✓", "✓", "✓"] },
      { label: "compare.rows.priority", values: ["—", "—", "✓", "✓"] },
      { label: "compare.rows.phone", values: ["—", "—", "✓", "✓"] },
      { label: "compare.rows.dedicated", values: ["—", "—", "—", "✓"] },
    ],
  },
] as const;

const FAQ_KEYS = ["decision", "hosting", "activeRole", "interview", "quota", "trial", "billing"] as const;

export default function Landing() {
  const { t } = useTranslation("landing");
  const { t: tp } = useTranslation("pricing");
  const { t: tf } = useTranslation("faq");
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

  /** Rend une valeur de tableau comparatif : clé de traduction ou valeur littérale. */
  const compareValue = (v: string) => (v.startsWith("values.") ? tp(v) : v);

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
              {t("nav.product")}
            </Link>
            <a href="#tarifs" className="hover:text-foreground transition-colors">
              {t("nav.pricing")}
            </a>
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <LanguageSwitcher />
            <Link to="/login" className="text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.signIn")}
            </Link>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background inline-flex h-9 items-center rounded-lg px-3.5 font-medium transition-opacity hover:opacity-90"
            >
              {t("nav.demo")}
            </a>
          </div>
        </div>
      </header>

      {/* ============ HERO + VIDÉO + PREUVE (visibles sans scroll) ============ */}
      <div className="flex flex-col md:h-[calc(100dvh-4rem)]">
        <section className="mx-auto w-full max-w-5xl shrink-0 px-6 pt-14 pb-8 text-center md:pt-[3vh] md:pb-[2vh]">
          <h1 className="landing-fade-up mx-auto max-w-3xl text-[40px] leading-[1.05] font-semibold tracking-tight md:text-[clamp(2.5rem,4.4vh+1.2rem,4rem)]">
            {t("hero.title")}
          </h1>
          <p className="landing-fade-up landing-delay-1 text-muted-foreground mx-auto mt-5 max-w-2xl text-[17px] md:mt-[2vh] md:text-[clamp(1rem,1.4vh+0.5rem,1.1875rem)]">
            {t("hero.subtitle")}
          </p>
          <div className="landing-fade-up landing-delay-2 mt-6 flex flex-col items-center md:mt-[2.5vh]">
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-medium transition-opacity hover:opacity-90"
            >
              {t("hero.cta")} <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/login"
              className="text-foreground mt-4 text-sm font-medium underline underline-offset-4 hover:opacity-70"
            >
              {t("hero.createAccount")}
            </Link>
            <p className="text-muted-foreground mt-1.5 text-[13px]">{t("hero.freeNote")}</p>
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
            <DemoVideo />
          </div>
        </section>


        {/* ============ PREUVE ============ */}
        <section className="border-border shrink-0 border-y">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
            <p className="text-center text-lg font-bold tracking-tight sm:text-xl">
              {t("proof.title")}
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
        <h2 className={`mx-auto max-w-3xl text-center ${H2}`}>{t("problem.title")}</h2>
        <FunnelCards />

        <p className="text-foreground mx-auto mt-14 max-w-2xl text-center text-[24px] leading-snug font-semibold tracking-tight md:text-[32px]">
          {t("problem.outro")}
        </p>
      </section>

      {/* ============ PRODUIT ============ */}
      <section className="border-border border-t">
        <div className="mx-auto max-w-5xl px-6 py-24">
          <div className="max-w-3xl">
            <h2 className={H2}>{t("product.title")}</h2>
            <p className={`text-foreground/80 mt-5 ${BODY}`}>{t("product.desc")}</p>
          </div>
          <div className="mt-20 space-y-24">
          {SECTION_KEYS.map((s) => (
            <div key={s.key}>
              <h3 className={`max-w-xl ${H3}`}>{t(`product.${s.key}.title`)}</h3>
              <p className={`text-muted-foreground mt-3 max-w-2xl ${BODY}`}>{t(`product.${s.key}.desc`)}</p>
              <div
                className="border-border mt-8 overflow-hidden rounded-xl border bg-cover bg-center p-4 md:p-10"
                style={{ backgroundImage: `url(${s.background})` }}
              >
                <img
                  src={s.image}
                  alt={t(`product.${s.key}.alt`)}
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
            <h2 className={H2}>{tp("title")}</h2>
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
                {tp("monthly")}
              </button>
              <button
                type="button"
                onClick={() => setBilling("annuel")}
                aria-selected={billing === "annuel"}
                className={`inline-flex h-8 items-center gap-2 rounded-md px-3.5 text-sm font-medium transition-all ${
                  billing === "annuel" ? "bg-background text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                {tp("annual")}
                <span className="bg-foreground text-background rounded-full px-2 py-0.5 text-[11px] font-semibold">
                  {tp("twoMonthsFree")}
                </span>
              </button>
            </div>
            <p className="text-muted-foreground text-xs">{tp("note")}</p>
          </div>

          {/* Cartes */}
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {PLAN_KEYS.map((p) => {
              const price = billing === "annuel" ? p.annual : p.monthly;
              const unitKey = billing === "annuel" ? p.annualUnitKey : p.monthlyUnitKey;
              const unit = unitKey ? tp(unitKey) : "";
              const note = tp(billing === "annuel" ? p.annualNoteKey : p.monthlyNoteKey);
              return (
                <div
                  key={p.key}
                  className={`relative flex flex-col rounded-xl border p-5 ${
                    p.featured ? "border-foreground bg-background" : "border-border bg-background"
                  }`}
                >
                  {p.featured && (
                    <span className="bg-foreground text-background absolute -top-2.5 left-6 inline-flex items-center rounded-full px-3 py-0.5 text-[11px] font-semibold">
                      {tp("recommended")}
                    </span>
                  )}
                  {/* Nom + description — hauteur fixe (3 lignes) */}
                  <div className="h-[88px]">
                    <h3 className="text-base font-semibold">{tp(`plans.${p.key}.name`)}</h3>
                    <p className="text-muted-foreground mt-1 text-[13px] leading-snug">
                      {tp(`plans.${p.key}.desc`)}
                    </p>
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
                    {tp(`plans.${p.key}.cta`)}
                  </Link>
                  {/* Note sous le bouton — hauteur fixe identique pour les 4 cartes */}
                  <p className="mt-1 h-5 text-center text-[11px] text-muted-foreground">
                    {p.noCardNoteKey ? tp(p.noCardNoteKey) : ""}
                  </p>
                  {/* Caractéristiques — hauteur fixe identique, séparateurs alignés */}
                  <div className="border-border border-t mt-2">
                    {p.specs.map((s, idx) => {
                      const tall = idx === 0 || idx === 2 || idx === 3;
                      const value = "valueKey" in s && s.valueKey ? tp(s.valueKey) : (s as { value: string }).value;
                      const sub = "subKey" in s && s.subKey ? tp(s.subKey) : null;
                      return (
                        <div
                          key={s.labelKey}
                          className={`border-border flex items-center justify-between gap-2 overflow-hidden border-b ${
                            tall ? "h-[62px]" : "h-[46px]"
                          } last:border-0`}
                        >
                          <span className="text-muted-foreground text-[12px] leading-tight">
                            {tp(s.labelKey)}
                          </span>
                          <span className="max-w-[60%] text-right text-sm font-semibold leading-tight">
                            {value}
                            {sub && (
                              <span className="text-muted-foreground block text-[10px] font-normal leading-tight">
                                {sub}
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
              <span className="font-semibold">{tp("plans.enterprise.name")}</span>{" "}
              {tp("enterpriseLine.text")}
            </p>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="border-border text-foreground hover:bg-muted inline-flex h-10 shrink-0 items-center rounded-lg border px-4 text-sm font-medium transition-colors"
            >
              {tp("enterpriseLine.cta")}
            </a>
          </div>

          {/* Comparatif — replié par défaut */}
          <Accordion type="single" collapsible className="mt-6">
            <AccordionItem value="comparatif" className="border-border rounded-xl border px-5">
              <AccordionTrigger className="text-[17px] font-semibold hover:no-underline">
                {tp("compare.trigger")}
              </AccordionTrigger>
              <AccordionContent className="pb-6">
          {/* Desktop : tableau */}
          <div className="border-border hidden overflow-x-auto rounded-xl border md:block">
            <table className="w-full min-w-[760px] border-separate border-spacing-0">
              <thead>
                <tr>
                  <th className="border-border bg-background border-b px-4 py-3.5 text-left text-sm font-semibold">
                    {tp("compare.feature")}
                  </th>
                  <th className="border-border bg-background border-b px-4 py-3.5 text-center text-sm font-semibold">
                    {tp("plans.free.name")}
                  </th>
                  <th className="border-border bg-background border-b px-4 py-3.5 text-center text-sm font-semibold">
                    {tp("plans.plus.name")}
                  </th>
                  <th className="bg-muted/40 border-border border-b px-4 py-3.5 text-center text-sm font-semibold">
                    {tp("plans.pro.name")}
                  </th>
                  <th className="border-border bg-background border-b px-4 py-3.5 text-center text-sm font-semibold">
                    {tp("plans.enterprise.name")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_KEYS.map((g) => (
                  <Fragment key={g.group}>
                    <tr>
                      <th
                        colSpan={5}
                        className="bg-muted text-muted-foreground border-border border-b px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide"
                      >
                        {tp(g.group)}
                      </th>
                    </tr>
                    {g.rows.map((r) => (
                      <tr key={r.label}>
                        <th className="border-border bg-background border-b px-4 py-3 text-left text-sm font-medium">
                          {tp(r.label)}
                          {"sub" in r && r.sub && (
                            <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                              {tp(r.sub)}
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
                              <span className="font-medium">{compareValue(v)}</span>
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
            {COMPARISON_KEYS.map((g) => (
              <div key={g.group} className="px-4 py-3">
                <h3 className="text-muted-foreground text-xs font-semibold uppercase tracking-wide">
                  {tp(g.group)}
                </h3>
                <div className="mt-2 divide-border divide-y">
                  {g.rows.map((r) => (
                    <div key={r.label} className="py-2.5">
                      <p className="text-sm font-medium">
                        {tp(r.label)}
                        {"sub" in r && r.sub && (
                          <span className="text-muted-foreground mt-0.5 block text-xs font-normal">
                            {tp(r.sub)}
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
                                {compareValue(v)}
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
            <h2 className={H2}>{tf("title")}</h2>
            <p className={`text-muted-foreground mt-3 ${BODY}`}>{tf("subtitle")}</p>
          </div>
          <div className="border-border border-t">
            {FAQ_KEYS.map((key) => (
              <details key={key} className="border-border border-b group">
                <summary className="text-foreground flex cursor-pointer items-center justify-between py-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                  {tf(`items.${key}.q`)}
                  <ChevronDown className="text-muted-foreground h-4 w-4 shrink-0 transition-transform group-open:rotate-180" />
                </summary>
                <p className="text-muted-foreground pb-4 pr-8 text-[15px] leading-relaxed md:text-[16px]">
                  {tf(`items.${key}.a`)}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CLÔTURE ============ */}
      <section className="border-border border-t">
        <div className="mx-auto max-w-3xl px-6 py-24 text-center">
          <h2 className={H2}>{t("closing.title")}</h2>
          <div className="mt-9 flex flex-col items-center">
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-medium transition-opacity hover:opacity-90"
            >
              {t("hero.cta")} <ArrowRight className="h-4 w-4" />
            </a>
            <Link
              to="/login"
              className="text-foreground mt-4 text-sm font-medium underline underline-offset-4 hover:opacity-70"
            >
              {t("hero.createAccount")}
            </Link>
            <p className="text-muted-foreground mt-1.5 text-[13px]">{t("hero.freeNote")}</p>
          </div>
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-border border-t">
        <div className="text-muted-foreground mx-auto flex max-w-5xl flex-col items-center justify-between gap-4 px-6 py-8 text-xs md:flex-row">
          <span>{t("footer.copyright", { year: new Date().getFullYear() })}</span>
          <div className="flex items-center gap-5">
            <a href={CAL_LINK} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors">
              {t("footer.demo")}
            </a>
            <Link to="/legal" className="hover:text-foreground transition-colors">
              {t("footer.legal")}
            </Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">
              {t("footer.privacy")}
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

import { useEffect, useRef, useState } from "react";
import NumberFlow, { continuous } from "@number-flow/react";
import { Link, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthContext";
import FunnelCards from "@/components/landing/FunnelCards";
import { useLanguage } from "@/hooks/useLanguage";
import { LanguageSelect } from "@/components/LanguageSelect";


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
import { ArrowRight, ChevronDown } from "lucide-react";

function DemoVideo() {
  const { i18n } = useTranslation();
  const isEn = (i18n.resolvedLanguage ?? i18n.language ?? "").startsWith("en");
  const base = isEn ? "demo-interwai-hd-en" : "demo-interwai-hd";
  const poster = isEn ? "/demo-interwai-poster-en.png" : "/demo-interwai-poster.png";
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
    if (!visible) return;
    const el = ref.current;
    if (!el) return;
    el.load();
    el.play().catch(() => {
      /* lecture auto refusée : le poster reste affiché */
    });
  }, [visible, base]);

  return (
    <video
      ref={ref}
      className="relative block h-full w-full object-cover"
      poster={poster}
      autoPlay
      muted
      loop
      playsInline
      preload="none"
    >
      {visible && (
        <>
          <source src={`/${base}.mp4`} type="video/mp4" />
          <source src={`/${base}.webm`} type="video/webm" />
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
    monthly: 0,
    annual: 0,
    quote: false,
    monthlyUnitKey: null,
    annualUnitKey: null,
    monthlyNoteKey: "forever",
    annualNoteKey: "forever",
    featured: false,
    external: false,
    specs: [
      { labelKey: "specs.interviews", value: "—" },
      { labelKey: "specs.pricePerInterview", value: "5 €" },
    ],
  },
  {
    key: "plus",
    monthly: 199,
    annual: 169,
    quote: false,
    monthlyUnitKey: "perMonth",
    annualUnitKey: "perMonth",
    monthlyNoteKey: "billedMonthly",
    annualNoteKey: "billedAnnually",
    featured: false,
    external: false,
    specs: [
      { labelKey: "specs.interviews", value: "100" },
      { labelKey: "specs.beyond", valueKey: "values.perInterview4" },
    ],
  },
  {
    key: "pro",
    monthly: 399,
    annual: 329,
    quote: false,
    monthlyUnitKey: "perMonth",
    annualUnitKey: "perMonth",
    monthlyNoteKey: "billedMonthly",
    annualNoteKey: "billedAnnually",
    featured: true,
    external: false,
    specs: [
      { labelKey: "specs.interviews", value: "300" },
      { labelKey: "specs.beyond", valueKey: "values.perInterview3" },
    ],
  },
  {
    key: "enterprise",
    monthly: null,
    annual: null,
    quote: true,
    monthlyUnitKey: null,
    annualUnitKey: null,
    monthlyNoteKey: null,
    annualNoteKey: null,
    featured: false,
    external: true,
    specs: [
      { labelKey: "specs.interviews", valueKey: "values.unlimited" },
      { labelKey: "specs.beyond", valueKey: "values.negotiated" },
    ],
  },
] as const;


const FAQ_KEYS = ["decision", "hosting", "interview", "quota", "trial", "billing"] as const;

const PRICE_CLASS = "text-4xl font-semibold tracking-tight";
const PRICE_STYLE = {
  fontVariantNumeric: "tabular-nums",
  lineHeight: 0.85,
  paddingTop: "0.25em",
  paddingBottom: "0.25em",
  display: "inline-block",
} as const;

function PlanPrice({
  monthly,
  annual,
  quote,
  billing,
  quoteLabel,
  locale,
}: {
  monthly: number | null;
  annual: number | null;
  quote: boolean;
  billing: "mensuel" | "annuel";
  quoteLabel: string;
  locale: string;
}) {
  if (quote || monthly === null || annual === null) {
    return (
      <span className={PRICE_CLASS} style={PRICE_STYLE}>
        {quoteLabel}
      </span>
    );
  }

  const value = billing === "annuel" ? annual : monthly;

  if (monthly === annual) {
    return (
      <span className={PRICE_CLASS} style={PRICE_STYLE}>
        {new Intl.NumberFormat(locale, {
          style: "currency",
          currency: "EUR",
          maximumFractionDigits: 0,
        }).format(value)}
      </span>
    );
  }

  return (
    <NumberFlow
      value={value}
      locales={locale}
      format={{ style: "currency", currency: "EUR", maximumFractionDigits: 0 }}
      plugins={[continuous]}
      transformTiming={{ duration: 500, easing: "ease-out" }}
      spinTiming={{ duration: 900, easing: "ease-out" }}
      opacityTiming={{ duration: 350, easing: "ease-out" }}
      className={PRICE_CLASS}
      style={PRICE_STYLE}
    />
  );
}


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
            <span className="hover:text-foreground transition-colors cursor-default">
              {t("nav.product")}
            </span>
            <a href="#tarifs" className="hover:text-foreground transition-colors">
              {t("nav.pricing")}
            </a>
          </nav>
          <div className="flex items-center gap-4 text-sm">
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

      {/* ============ HERO + VIDÉO (flux vertical) ============ */}
      <section className="mx-auto w-full max-w-5xl px-6 pt-14 pb-8 text-center md:pt-[3vh] md:pb-[2vh]">
        <h1 className="landing-fade-up mx-auto max-w-3xl text-[40px] leading-[1.05] font-semibold tracking-tight md:text-[clamp(2.5rem,4.4vh+1.2rem,4rem)]">
          {t("hero.title")}
        </h1>
        <p className="landing-fade-up landing-delay-1 text-muted-foreground mx-auto mt-5 max-w-2xl text-[17px] md:mt-[2vh] md:text-[clamp(1rem,1.4vh+0.5rem,1.1875rem)]">
          {t("hero.subtitle")}
        </p>
        <div className="landing-fade-up landing-delay-2 mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row md:mt-[2.5vh]">
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
            className="bg-background text-foreground inline-flex h-11 items-center gap-2 rounded-lg border border-foreground px-6 text-sm font-medium transition-colors hover:bg-foreground/5"
          >
            {t("hero.createAccount")}
          </Link>
        </div>
      </section>

      <section className="mx-auto flex w-full max-w-6xl items-start justify-center px-4 pb-6 sm:px-6 md:px-8 md:pb-[2vh]">
        <div className="landing-fade-up landing-delay-3 relative aspect-video w-full max-w-[1120px] overflow-hidden rounded-xl shadow-2xl">
          <DemoVideo />
        </div>
      </section>

      {/* ============ PREUVE ============ */}
      <section className="border-border border-y">
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
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={H2}>{t("product.title")}</h2>
            <p className={`text-foreground/80 mt-5 ${BODY}`}>{t("product.desc")}</p>
          </div>
          <div className="mt-20 space-y-24">
          {SECTION_KEYS.map((s) => (
            <div key={s.key}>
              <h3 className={`mx-auto max-w-xl text-center ${H3}`}>{t(`product.${s.key}.title`)}</h3>
              <p className={`text-muted-foreground mx-auto mt-3 max-w-2xl text-center ${BODY}`}>{t(`product.${s.key}.desc`)}</p>

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
          <div className="mx-auto max-w-2xl text-center">
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

          {/* Bandeau 10 entretiens offerts */}
          <div className="mt-8 flex justify-center">
            <div className="bg-foreground text-background inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium">
              <span>{tp("freeOffer")}</span>
            </div>
          </div>

          {/* Cartes */}
          <div className="mt-6 grid gap-4 md:grid-cols-4">
            {PLAN_KEYS.map((p) => {
              const unitKey = billing === "annuel" ? p.annualUnitKey : p.monthlyUnitKey;
              const unit = unitKey ? tp(unitKey) : "";
              const noteKey = billing === "annuel" ? p.annualNoteKey : p.monthlyNoteKey;
              const note = noteKey ? tp(noteKey) : "";
              const noteChanges = p.monthlyNoteKey !== p.annualNoteKey;

              const cta = tp(`plans.${p.key}.cta`);
              const ctaClass =
                "mt-1 inline-flex h-10 w-full items-center justify-center rounded-lg text-sm font-medium transition-opacity hover:opacity-90 " +
                (p.featured
                  ? "bg-foreground text-background"
                  : "border-border bg-background text-foreground border hover:bg-muted");
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
                  {/* Nom */}
                  <div className="h-6">
                    <h3 className="text-base font-semibold">{tp(`plans.${p.key}.name`)}</h3>
                  </div>
                  {/* Prix — hauteur fixe */}
                  <div className="mt-4 flex h-12 items-baseline gap-1.5">
                    <PlanPrice
                      monthly={p.monthly}
                      annual={p.annual}
                      quote={p.quote}
                      billing={billing}
                      quoteLabel={tp("onQuote")}
                      locale={priceLocale}
                    />
                    {unit && <span className="text-muted-foreground text-sm">{unit}</span>}
                  </div>
                  {/* Note sous le prix — hauteur fixe même si vide */}
                  {noteChanges ? (
                    <p
                      key={billing}
                      className="text-muted-foreground h-5 animate-fade-in text-xs [animation-duration:180ms]"
                    >
                      {note}
                    </p>
                  ) : (
                    <p className="text-muted-foreground h-5 text-xs">{note}</p>
                  )}

                  {/* Bouton */}
                  {p.external ? (
                    <a
                      href={CAL_LINK}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={ctaClass}
                    >
                      {cta}
                    </a>
                  ) : (
                    <Link to="/login" className={ctaClass}>
                      {cta}
                    </Link>
                  )}
                  {/* Caractéristiques — hauteur fixe identique, séparateurs alignés */}
                  <div className="border-border border-t mt-4">
                    {p.specs.map((s, idx) => {
                      const value = "valueKey" in s && s.valueKey ? tp(s.valueKey) : (s as { value: string }).value;
                      return (
                        <div
                          key={s.labelKey}
                          className="border-border flex h-[62px] items-center justify-between gap-2 overflow-hidden border-b last:border-0"
                        >
                          <span className="text-muted-foreground text-[12px] leading-tight">
                            {tp(s.labelKey)}
                          </span>
                          <span className="max-w-[60%] text-right text-sm font-semibold leading-tight">
                            {value}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="border-border border-t">
        <div className="mx-auto max-w-3xl px-6 py-24">
          <div className="mb-6 text-center">
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
          </div>

        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-border border-t">
        <div className="mx-auto max-w-5xl px-6 py-8">
          <div className="text-muted-foreground flex flex-col items-center justify-between gap-4 text-xs md:flex-row">
            <LanguageSelect />
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
          <div className="border-border mt-6 border-t pt-6">
            <p className="text-muted-foreground text-xs">
              {t("footer.copyright", { year: new Date().getFullYear() })}
            </p>
          </div>
        </div>
      </footer>

    </div>
  );
}

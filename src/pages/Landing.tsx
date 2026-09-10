import { useEffect, useRef, useState } from "react";
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
import logoGardner from "@/assets/logos/logo-gardner.png";
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
  { name: "Morning", src: logoMorning, href: "https://www.morning.fr/", className: "max-h-6 sm:max-h-8 md:max-h-9" },
  { name: "E.Leclerc", src: logoLeclerc, href: "https://www.e.leclerc/mag/e-leclerc-fouesnant-pleuven", className: "max-h-7 sm:max-h-9 md:max-h-11" },
  { name: "Castalie", src: logoCastalie, href: "https://www.castalie.com/", className: "max-h-5 sm:max-h-7 md:max-h-8" },
  { name: "ad's up consulting", src: logoAdsup, href: "https://ads-up.fr/", className: "max-h-6 sm:max-h-8 md:max-h-9" },
  { name: "Gardner", src: logoGardner, href: "https://withgardner.com/", className: "max-h-4 sm:max-h-7 md:max-h-8 max-w-[100px] sm:max-w-[130px] md:max-w-[150px]" },
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



const FAQ_KEYS = ["decision", "hosting", "interview", "quota", "trial", "billing"] as const;


export default function Landing() {
  const { t } = useTranslation("landing");
  
  const { t: tf } = useTranslation("faq");
  const { user, loading } = useAuth();
  const [scrolled, setScrolled] = useState(false);

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
          <Link
            to="/"
            onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
            className="flex items-center"
          >
            <img
              src="/logo-interw.svg"
              alt="Interw"
              className="h-7 w-auto"
            />
          </Link>
          <div className="flex items-center gap-2 sm:gap-4 text-sm">
            <Link to="/login" className="hidden sm:inline-flex text-muted-foreground hover:text-foreground transition-colors">
              {t("nav.signIn")}
            </Link>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background inline-flex h-9 items-center rounded-lg px-3 sm:px-3.5 font-medium transition-opacity hover:opacity-90"
            >
              {t("nav.demo")}
            </a>
          </div>
        </div>
      </header>

      {/* ============ HERO + VIDÉO (flux vertical) ============ */}
      <section className="mx-auto w-full max-w-5xl px-5 sm:px-6 pt-14 pb-10 text-center md:pt-20 md:pb-12">
        <h1 className="landing-fade-up mx-auto max-w-3xl text-[40px] leading-[1.05] font-semibold tracking-tight md:text-[clamp(2.5rem,4.4vh+1.2rem,4rem)]">
          {t("hero.title")}
        </h1>
        <p className="landing-fade-up landing-delay-1 text-muted-foreground mx-auto mt-5 max-w-2xl text-[17px] md:text-[clamp(1rem,1.4vh+0.5rem,1.1875rem)]">
          {t("hero.subtitle")}
        </p>
        <div className="landing-fade-up landing-delay-2 mt-8 flex flex-col items-stretch gap-3 sm:flex-row sm:items-center sm:justify-center">
          <a
            href={CAL_LINK}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-foreground text-background inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-medium transition-opacity hover:opacity-90 sm:w-auto"
          >
            {t("hero.cta")} <ArrowRight className="h-4 w-4" />
          </a>
          <Link
            to="/signup"
            className="bg-background text-foreground inline-flex h-11 w-full items-center justify-center gap-2 rounded-lg border border-foreground px-6 text-sm font-medium transition-colors hover:bg-foreground/5 sm:w-auto"
          >
            {t("hero.createAccount")}
          </Link>
        </div>
      </section>

      <section className="w-full py-10 md:py-16">
        <div className="mx-auto flex w-full max-w-[1280px] items-start justify-center px-2 sm:px-6 md:px-8">
          <div className="landing-fade-up landing-delay-3 relative aspect-video w-full overflow-hidden">
            <DemoVideo />
          </div>
        </div>
      </section>

      {/* ============ PREUVE ============ */}
      <section className="border-border border-y">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 sm:py-8">
          <p className="text-center text-lg font-bold tracking-tight sm:text-xl">
            {t("proof.title")}
          </p>
          <div className="mt-5 flex flex-col items-center gap-y-5 sm:mt-6 sm:gap-y-7">
            {[BETA_LOGOS.slice(0, 3), BETA_LOGOS.slice(3)].map((row, rowIdx) => (
              <div key={rowIdx} className="flex w-full flex-wrap items-center justify-center gap-x-8 gap-y-4 sm:gap-x-14 md:gap-x-20">
                {row.map((logo) => (
                  <a
                    key={logo.name}
                    href={logo.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={logo.name}
                    className="transition-opacity hover:opacity-70"
                  >
                    <img
                      src={logo.src}
                      alt={logo.name}
                      loading="lazy"
                      className={`${logo.className} h-auto w-auto max-w-[150px] object-contain`}
                    />
                  </a>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PROBLÈME ============ */}
      <section className="mx-auto max-w-5xl px-5 sm:px-6 py-16 md:py-24">
        <h2 className={`mx-auto max-w-3xl text-center ${H2}`}>{t("problem.title")}</h2>
        <p className={`text-muted-foreground mx-auto mt-5 max-w-2xl text-center ${BODY}`}>
          {t("problem.intro")}
        </p>
        <FunnelCards />

        <p className="text-foreground mx-auto mt-12 md:mt-16 max-w-2xl text-center text-[24px] leading-snug font-semibold tracking-tight md:text-[32px]">
          {t("problem.outro")}
        </p>
      </section>

      {/* ============ PRODUIT ============ */}
      <section id="produit" className="border-border border-t scroll-mt-20">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 py-16 md:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className={H2}>{t("product.title")}</h2>
            <p className={`text-foreground/80 mt-4 ${BODY}`}>{t("product.desc")}</p>
          </div>
          <div className="mt-12 md:mt-16 space-y-16 md:space-y-24">
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
      <section id="tarifs" className="border-border border-t scroll-mt-20">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 md:py-24 text-center">
          <h2 className={H2}>{tp("title")}</h2>
          <div className="border-border bg-background mt-10 rounded-2xl border p-8 md:p-12">
            <h3 className="text-2xl md:text-3xl font-semibold tracking-tight text-foreground">
              {tp("custom.title")}
            </h3>
            <p className="text-muted-foreground mt-4 text-lg md:text-xl">
              {tp("custom.subtitle")}
            </p>
            <a
              href={CAL_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-foreground text-background mt-8 inline-flex h-11 items-center gap-2 rounded-lg px-6 text-sm font-medium transition-opacity hover:opacity-90"
            >
              {tp("custom.cta")} <ArrowRight className="h-4 w-4" />
            </a>
          </div>
        </div>
      </section>

      {/* ============ FAQ ============ */}
      <section className="border-border border-t">
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 md:py-24">
          <div className="mb-12 md:mb-16 text-center">
            <h2 className={H2}>{tf("title")}</h2>
            <p className={`text-muted-foreground mt-4 ${BODY}`}>{tf("subtitle")}</p>
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
        <div className="mx-auto max-w-3xl px-5 sm:px-6 py-16 md:py-24 text-center">
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
              to="/signup"
              className="text-foreground mt-4 text-sm font-medium underline underline-offset-4 hover:opacity-70"
            >
              {t("hero.createAccount")}
            </Link>
          </div>

        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer className="border-border border-t">
        <div className="mx-auto max-w-5xl px-5 sm:px-6 py-10 md:py-12">
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

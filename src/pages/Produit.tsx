import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "@/components/LanguageSwitcher";
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
  key: string;
  img: string;
  icon: React.ReactNode;
};

const BLOCKS: Block[] = [
  { key: "dashboard", img: shotDashboard, icon: <Sparkles className="h-4 w-4" /> },
  { key: "projects", img: shotProjects, icon: <FolderKanban className="h-4 w-4" /> },
  { key: "tracking", img: shotProject, icon: <FolderKanban className="h-4 w-4" /> },
  { key: "report", img: shotReport, icon: <FileText className="h-4 w-4" /> },
  { key: "resources", img: shotQuestions, icon: <Library className="h-4 w-4" /> },
  { key: "criteria", img: shotCriteria, icon: <Scale className="h-4 w-4" /> },
];

export default function Produit() {
  const { t } = useTranslation("landing");
  const { session, loading } = useAuth();
  const [demoOpen, setDemoOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    document.title = t("productPage.meta.title");
    const desc = t("productPage.meta.description");
    let m = document.querySelector('meta[name="description"]');
    if (!m) {
      m = document.createElement("meta");
      m.setAttribute("name", "description");
      document.head.appendChild(m);
    }
    m.setAttribute("content", desc);
  }, [t]);

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
              style={{ background: "linear-gradient(135deg, hsl(0 0% 8%), hsl(0 0% 25%))" }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <span className="text-[15px] font-semibold tracking-tight">Interw</span>
          </Link>
          <nav className="hidden items-center gap-8 text-sm md:flex" style={{ color: "hsl(230 8% 42%)" }}>
            <Link to="/produit" className="transition-colors text-foreground">{t("productPage.nav.product")}</Link>
            <Link to="/#how" className="transition-colors hover:text-foreground">{t("productPage.nav.how")}</Link>
            <Link to="/#pricing" className="transition-colors hover:text-foreground">{t("productPage.nav.pricing")}</Link>
            <Link to="/#faq" className="transition-colors hover:text-foreground">{t("productPage.nav.faq")}</Link>
          </nav>
          <div className="flex items-center gap-3">
            <LanguageSwitcher />
            <Link to="/login" className="text-sm transition-colors hover:text-foreground" style={{ color: "hsl(230 8% 42%)" }}>
              {t("productPage.nav.signIn")}
            </Link>
            <span className="hidden h-5 w-px md:block" style={{ background: "hsl(230 14% 88%)" }} />
            <button
              type="button"
              onClick={openDemo}
              className="landing-btn-primary inline-flex h-9 items-center gap-1.5 px-3.5 text-sm font-medium"
            >
              {t("productPage.nav.demo")}
            </button>
          </div>
        </div>
      </header>

      {/* HERO */}
      <section className="relative overflow-hidden" style={{ background: "hsl(0 0% 100%)" }}>
        <div className="landing-bg-grid absolute inset-0 -z-10" />
        <div className="landing-hero-glow absolute inset-0 -z-10" />
        <div className="mx-auto max-w-4xl px-6 pt-20 pb-16 md:pt-28 md:pb-20 text-center">
          <span className="landing-pill">{t("productPage.hero.pill")}</span>
          <h1 className="landing-fade-up landing-delay-1 mt-5 text-4xl font-semibold leading-[1.05] md:text-6xl">
            <span className="landing-gradient-text">{t("productPage.hero.title")}</span>
          </h1>
          <p className="landing-fade-up landing-delay-2 mx-auto mt-6 max-w-2xl text-lg md:text-xl" style={{ color: "hsl(230 10% 25%)" }}>
            {t("productPage.hero.subtitle")}
          </p>
          <div className="landing-fade-up landing-delay-3 mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={openDemo}
              className="landing-btn-white inline-flex h-12 items-center gap-2 px-6 text-sm font-semibold"
            >
              {t("productPage.hero.demo")}
              <ArrowRight className="h-4 w-4" />
            </button>
            <Link
              to="/#pricing"
              className="inline-flex h-12 items-center gap-2 rounded-md px-6 text-sm font-semibold"
              style={{ border: "1px solid hsl(230 14% 84%)", color: "hsl(230 10% 25%)" }}
            >
              {t("productPage.hero.pricing")}
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
                key={b.key}
                className={`grid items-center gap-10 md:gap-16 md:grid-cols-2 ${reverse ? "md:[&>div:first-child]:order-2" : ""}`}
              >
                <div className="self-center">
                  <span
                    className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-white"
                    style={{ background: "hsl(0 0% 8%)" }}
                  >
                    {b.icon}
                    {t(`productPage.blocks.${b.key}.pill`)}
                  </span>
                  <h2 className="mt-3 text-2xl font-semibold text-foreground md:text-3xl leading-tight">
                    {t(`productPage.blocks.${b.key}.title`)}
                  </h2>
                  <p className="mt-3 text-sm md:text-base leading-relaxed" style={{ color: "hsl(230 10% 30%)" }}>
                    {t(`productPage.blocks.${b.key}.desc`)}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {["b1", "b2", "b3"]
                      .filter((bk) => t(`productPage.blocks.${b.key}.${bk}`, { defaultValue: "" }))
                      .map((bk) => (
                        <li key={bk} className="flex items-start gap-2.5 text-sm" style={{ color: "hsl(230 10% 25%)" }}>
                          <Activity className="h-4 w-4 mt-0.5 shrink-0" style={{ color: "hsl(0 0% 8%)" }} />
                          <span>{t(`productPage.blocks.${b.key}.${bk}`)}</span>
                        </li>
                      ))}
                  </ul>
                </div>
                <div className="relative">
                  <div
                    className="absolute -inset-4 -z-10 rounded-3xl blur-2xl"
                    style={{ background: "radial-gradient(ellipse at center, hsl(0 0% 8% / 0.18), transparent 70%)" }}
                  />
                  <div
                    className="overflow-hidden rounded-xl"
                    style={{
                      border: "1px solid hsl(230 14% 88%)",
                      boxShadow: "0 30px 80px -20px hsl(0 0% 8% / 0.22), 0 1px 2px hsl(240 10% 10% / 0.04)",
                      background: "white",
                    }}
                  >
                    <img src={b.img} alt={t(`productPage.blocks.${b.key}.title`)} loading="lazy" className="block w-full h-auto" />
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
            {t("productPage.cta.title")}
          </h2>
          <p className="mt-5 text-base md:text-lg" style={{ color: "hsl(230 8% 42%)" }}>
            {t("productPage.cta.subtitle")}
          </p>
          <button
            type="button"
            onClick={openDemo}
            className="landing-btn-white mt-8 inline-flex h-12 items-center gap-2 px-6 text-sm font-semibold"
          >
            {t("productPage.cta.button")}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <DemoRequestDialog open={demoOpen} onOpenChange={setDemoOpen} />
    </div>
  );
}

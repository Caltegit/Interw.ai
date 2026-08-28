import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

const H3 = "text-[18px] md:text-[19px] leading-[1.2] font-semibold tracking-tight text-foreground";
const BODY = "text-[14px] md:text-[15px] leading-relaxed";

const RECEIVED = "var(--l-step-received)";
const CALLED = "var(--l-step-called)";
const INTERVIEW = "var(--l-step-interview)";
const HIRED = "var(--l-step-hired)";

const c = (token: string, alpha = 1) => `hsl(${token} / ${alpha})`;

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  return { ref, inView };
}

/* ---------- Mini CV réaliste ---------- */

function MiniCv({
  className = "",
  style,
  accent,
}: {
  className?: string;
  style?: React.CSSProperties;
  accent?: string;
}) {
  return (
    <div
      className={`bg-background absolute overflow-hidden rounded-[4px] border shadow-sm ${className}`}
      style={{ borderColor: accent ? c(accent, 0.35) : "hsl(var(--l-border-strong))", ...style }}
    >
      {/* en-tête */}
      <div
        className="flex items-center gap-1.5 border-b px-2 py-1.5"
        style={{ borderColor: accent ? c(accent, 0.2) : "hsl(var(--l-border))" }}
      >
        <div
          className="h-4 w-4 shrink-0 rounded-full"
          style={{ background: accent ? c(accent, 0.3) : "hsl(var(--muted))" }}
        />
        <div className="min-w-0 flex-1 space-y-1">
          <div className="bg-muted-foreground/35 h-[3px] w-3/5 rounded-full" />
          <div className="bg-muted-foreground/20 h-[3px] w-2/5 rounded-full" />
        </div>
      </div>
      {/* corps : colonne compétences + expériences */}
      <div className="flex gap-1.5 px-2 py-1.5">
        <div className="w-[28%] space-y-[5px]">
          <div className="bg-muted-foreground/25 h-[3px] w-3/4 rounded-full" />
          {[80, 60, 45].map((w, i) => (
            <div key={i} className="bg-muted h-[3px] w-full rounded-full">
              <div
                className="h-[3px] rounded-full"
                style={{ width: `${w}%`, background: accent ? c(accent, 0.45) : "hsl(var(--muted-foreground) / 0.3)" }}
              />
            </div>
          ))}
        </div>
        <div className="flex-1 space-y-[6px]">
          {[0, 1, 2].map((i) => (
            <div key={i} className="space-y-[3px]">
              <div className="flex items-center gap-1">
                <div
                  className="h-[4px] w-[10px] rounded-[1px]"
                  style={{ background: accent ? c(accent, 0.4) : "hsl(var(--muted-foreground) / 0.3)" }}
                />
                <div className="bg-muted-foreground/25 h-[3px] w-1/2 rounded-full" />
              </div>
              <div className="bg-muted h-[3px] w-full rounded-full" />
              <div className="bg-muted h-[3px] w-4/5 rounded-full" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---------- 1. Les candidatures arrivent ---------- */

function IllusIdentical({ play }: { play: boolean }) {
  return (
    <div className="relative h-full w-full">
      {[0, 1, 2].map((i) => (
        <MiniCv
          key={i}
          accent={RECEIVED}
          className={play ? "landing-funnel-slide-in" : "opacity-0"}
          style={{
            left: `${14 + i * 16}%`,
            top: `${12 + i * 8}%`,
            width: "50%",
            height: "72%",
            animationDelay: `${(2 - i) * 150}ms`,
            zIndex: 3 - i,
          }}
        />
      ))}
    </div>
  );
}

/* ---------- 2. Vous triez sur ce qui se voit ---------- */

function IllusSort({ play, label }: { play: boolean; label: string }) {
  return (
    <div className="relative h-full w-full">
      {/* pile des écartés, à gauche */}
      {[0, 1].map((i) => (
        <div
          key={`out-${i}`}
          className="absolute rounded-[3px] border"
          style={{
            left: `${4 + i * 2}%`,
            bottom: `${10 + i * 5}%`,
            width: "26%",
            height: "34%",
            borderColor: c(RECEIVED, 0.25),
            background: c(RECEIVED, 0.08),
            transform: `rotate(${-10 + i * 4}deg)`,
            opacity: play ? 1 : 0,
            transition: "opacity .4s ease",
            transitionDelay: `${900 + i * 500}ms`,
          }}
        />
      ))}

      {/* CV écartés qui partent vers la gauche */}
      {[0, 1].map((i) => (
        <MiniCv
          key={`rej-${i}`}
          accent={RECEIVED}
          className={play ? "landing-funnel-reject" : "opacity-0"}
          style={{
            left: "38%",
            top: "12%",
            width: "46%",
            height: "72%",
            animationDelay: `${700 + i * 500}ms`,
            zIndex: 2,
          }}
        />
      ))}

      {/* CV retenu */}
      <MiniCv accent={CALLED} style={{ left: "38%", top: "12%", width: "46%", height: "72%", zIndex: 1 }} />

      {/* ligne de tri */}
      {play && (
        <div
          className="landing-funnel-scan absolute h-[2px]"
          style={{ left: "38%", top: "12%", width: "46%", background: c(RECEIVED, 0.7), animationDelay: "150ms" }}
        />
      )}

      {/* tampon */}
      <div
        className={`absolute rounded-[3px] border px-1 py-[1px] text-[7px] font-bold tracking-wider uppercase ${
          play ? "landing-funnel-stamp" : "opacity-0"
        }`}
        style={{
          right: "6%",
          bottom: "12%",
          borderColor: c(RECEIVED, 0.5),
          color: c(RECEIVED, 0.85),
          animationDelay: "1700ms",
          zIndex: 3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

/* ---------- 3. Vous appelez les survivants ---------- */

function IllusCalls({ play, labels }: { play: boolean; labels: { call: string; minutes: string } }) {
  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2">
      <div
        className="bg-background flex items-center gap-2 rounded-md border px-2.5 py-1.5 shadow-sm"
        style={{ borderColor: c(CALLED, 0.3) }}
      >
        <div className="flex h-4 items-end gap-[2px]">
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              className={`w-[2px] rounded-full ${play ? "landing-funnel-wave" : ""}`}
              style={{ height: `${6 + (i % 3) * 4}px`, background: c(CALLED, 0.85), animationDelay: `${i * 110}ms` }}
            />
          ))}
        </div>
        <span className="text-[10px] font-medium" style={{ color: c(CALLED, 0.95) }}>
          {labels.call}
        </span>
        <span className="text-muted-foreground ml-auto text-[10px] font-semibold tabular-nums">00:15</span>
      </div>

      <div className="space-y-1">
        {["09:00", "09:20", "09:40"].map((t, i) => (
          <div
            key={t}
            className={`text-muted-foreground flex items-center gap-1.5 text-[10px] tabular-nums ${
              play ? "landing-funnel-tick" : "opacity-0"
            }`}
            style={{ animationDelay: `${400 + i * 320}ms` }}
          >
            <span
              className="flex h-3 w-3 items-center justify-center rounded-[3px] border"
              style={{ borderColor: c(CALLED, 0.35), background: c(CALLED, 0.1) }}
            >
              <span className="h-[6px] w-[6px] rounded-[1px]" style={{ background: c(CALLED, 0.8) }} />
            </span>
            <span>{t}</span>
            <span className="h-[3px] flex-1 rounded-full" style={{ background: c(CALLED, 0.18) }} />
            <span>{labels.minutes}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- 4. Vous en recevez trois ---------- */

const DOT_TIERS = [
  { count: 32, labelKey: "received", token: RECEIVED, alpha: 0.55, delay: 0 },
  { count: 12, labelKey: "called", token: CALLED, alpha: 0.78, delay: 700 },
  { count: 3, labelKey: "interviews", token: INTERVIEW, alpha: 0.95, delay: 1300 },
  { count: 1, labelKey: "hired", token: HIRED, alpha: 1, delay: 1800 },
];

function IllusDots({ play, labels }: { play: boolean; labels: Record<string, string> }) {
  const dots: { color: string; delay: number }[] = [];
  DOT_TIERS.forEach((tier) => {
    for (let i = 0; i < tier.count; i++) {
      dots.push({ color: c(tier.token, tier.alpha), delay: tier.delay + i * 22 });
    }
  });

  return (
    <div className="absolute inset-0 flex flex-col justify-center gap-2">
      <div className="grid grid-cols-12 gap-[5px]">
        {dots.map((d, i) => (
          <span
            key={i}
            className={`aspect-square rounded-full ${play ? "landing-funnel-dot" : "opacity-20"}`}
            style={{ background: d.color, animationDelay: `${d.delay}ms` }}
          />
        ))}
      </div>
      <div className="text-muted-foreground grid grid-cols-2 gap-x-2 gap-y-[2px] text-[9px]">
        {DOT_TIERS.map((t) => (
          <span key={t.labelKey} className="flex items-center gap-1">
            <span
              className="h-[6px] w-[6px] shrink-0 rounded-full"
              style={{ background: c(t.token, t.alpha) }}
            />
            {labels[t.labelKey]} · {t.count}
          </span>
        ))}
      </div>
    </div>
  );
}

const FUNNEL_KEYS = ["s1", "s2", "s3", "s4"] as const;

function FunnelCard({ stepKey, index }: { stepKey: string; index: number }) {
  const { t } = useTranslation("landing");
  const { ref, inView } = useInView<HTMLDivElement>();
  const [hoverKey, setHoverKey] = useState(0);
  const illusLabels = {
    received: t("funnel.illus.received"),
    called: t("funnel.illus.called"),
    interviews: t("funnel.illus.interviews"),
    hired: t("funnel.illus.hired"),
  };

  const renderIllus = () => {
    switch (index) {
      case 0:
        return <IllusIdentical key={hoverKey} play={inView} />;
      case 1:
        return <IllusSort key={hoverKey} play={inView} label={t("funnel.illus.sorted")} />;
      case 2:
        return (
          <IllusCalls
            key={hoverKey}
            play={inView}
            labels={{ call: t("funnel.illus.callInProgress"), minutes: t("funnel.illus.minutes") }}
          />
        );
      default:
        return <IllusDots key={hoverKey} play={inView} labels={illusLabels} />;
    }
  };

  return (
    <div
      ref={ref}
      onMouseEnter={() => setHoverKey((k) => k + 1)}
      className={`landing-funnel-card border-border bg-background flex flex-col rounded-xl border p-5 ${
        inView ? "landing-funnel-enter" : "opacity-0"
      }`}
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <h3 className={H3}>
        <span className="text-muted-foreground font-semibold tabular-nums">{index + 1} · </span>
        {t(`funnel.${stepKey}.title`)}
      </h3>
      <div className="relative mt-5 h-[140px] shrink-0 overflow-hidden">{renderIllus()}</div>
    </div>
  );
}

export default function FunnelCards() {
  return (
    <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {FUNNEL_KEYS.map((key, i) => (
        <FunnelCard key={key} stepKey={key} index={i} />
      ))}
    </div>
  );
}

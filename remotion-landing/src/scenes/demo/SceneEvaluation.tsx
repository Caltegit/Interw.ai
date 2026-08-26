import { Img, staticFile, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../../components/BrowserChrome";
import { DEMO_ENTER_DELAY } from "../../constants";
import { FitScene } from "../../components/FitScene";
import { Subtitle } from "../../components/Subtitle";

const CRITERIA = [
  { label: "Communication", target: 88 },
  { label: "Expérience produit", target: 92 },
  { label: "Autonomie", target: 78 },
  { label: "Fit culturel", target: 84 },
];

const CHECKS = [
  { text: "A illustré son propos par 2 exemples concrets" },
  { text: "Réponses structurées (situation · action · résultat)" },
  { text: "Aligné avec les valeurs de l'équipe" },
];

export const SceneEvaluation: React.FC = () => {
  const rawFrame = useCurrentFrame();
  // La scène ne s'anime qu'après la fin de la transition entrante.
  const frame = rawFrame - DEMO_ENTER_DELAY;
  const { fps } = useVideoConfig();

  const wizardIn = spring({ frame, fps, config: { damping: 18 } });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 20 } });

  return (
    <FitScene designWidth={1200} designHeight={720}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, width: "100%", height: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 600,
              color: FG,
              letterSpacing: -1.4,
              lineHeight: 1.1,
              opacity: titleIn,
              transform: `translateY(${interpolate(titleIn, [0, 1], [12, 0])}px)`,
            }}
          >
            Interw analyse les réponses <span style={{ color: ACCENT }}>selon vos critères.</span>
          </div>
          <Subtitle frame={frame} mainDelay={12} mainFontSize={44}>
            Les mêmes critères pour tous.
          </Subtitle>
        </div>

        <div style={{ transform: `scale(${0.92 + 0.08 * wizardIn})`, opacity: wizardIn }}>
          <BrowserChrome url="interw.ai/sessions/clement-a" width={1200} height={560}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "18px 22px 0" }}>
              <Img
                src={staticFile("people/clement-a.jpg")}
                style={{ width: 44, height: 44, borderRadius: 22, objectFit: "cover" }}
              />
              <span style={{ color: FG, fontSize: 20, fontWeight: 600 }}>Clément A.</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: 22 }}>
              {/* Critères pondérés */}
              <div>
                <div style={{ color: FG_DIM, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 14 }}>
                  Scores par critère
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {CRITERIA.map((c, i) => {
                    const delay = 28 + i * 13;
                    const appear = spring({ frame: frame - delay, fps, config: { damping: 18 } });
                    const fillStart = delay + 6;
                    const fillProgress = spring({
                      frame: frame - fillStart,
                      fps,
                      config: { damping: 28, stiffness: 90 },
                    });
                    const value = c.target * fillProgress;
                    return (
                      <div
                        key={c.label}
                        style={{
                          background: BG_ELEV_2,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 10,
                          padding: "14px 18px",
                          opacity: appear,
                          transform: `translateX(${interpolate(appear, [0, 1], [-16, 0])}px)`,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                          <span style={{ color: FG, fontSize: 14, fontWeight: 500 }}>{c.label}</span>
                          <span style={{ color: ACCENT, fontSize: 16, fontWeight: 600 }}>
                            {Math.round(value)}/100
                          </span>
                        </div>
                        <div
                          style={{
                            height: 6,
                            background: "rgba(9,9,11,0.06)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${value}%`,
                              background: `linear-gradient(90deg, ${ACCENT}, #3F3F46)`,
                              borderRadius: 3,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Checklist structurée */}
              <div>
                <div style={{ color: FG_DIM, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 14 }}>
                  Observations IA
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  {CHECKS.map((c, i) => {
                    const delay = 92 + i * 15;
                    const a = spring({ frame: frame - delay, fps, config: { damping: 18 } });
                    return (
                      <div
                        key={c.text}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 12,
                          background: BG_ELEV_2,
                          border: `1px solid ${BORDER}`,
                          borderRadius: 10,
                          padding: "14px 16px",
                          opacity: a,
                          transform: `translateX(${interpolate(a, [0, 1], [16, 0])}px)`,
                        }}
                      >
                        <div
                          style={{
                            width: 22,
                            height: 22,
                            borderRadius: 11,
                            background: "rgba(22,163,74,0.18)",
                            border: "1px solid rgba(22,163,74,0.4)",
                            color: "#16A34A",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 13,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          ✓
                        </div>
                        <span style={{ color: FG, fontSize: 14, lineHeight: 1.4 }}>{c.text}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </BrowserChrome>
        </div>
      </div>
    </FitScene>
  );
};

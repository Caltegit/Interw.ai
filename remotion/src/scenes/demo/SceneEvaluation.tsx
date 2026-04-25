import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../../components/BrowserChrome";

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
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wizardIn = spring({ frame, fps, config: { damping: 18 } });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
        <div
          style={{
            fontSize: 44,
            fontWeight: 600,
            color: FG,
            letterSpacing: -1,
            textAlign: "center",
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [12, 0])}px)`,
          }}
        >
          Analyse les réponses <span style={{ color: ACCENT }}>selon vos critères.</span>
        </div>

        <div style={{ transform: `scale(${0.92 + 0.08 * wizardIn})`, opacity: wizardIn }}>
          <BrowserChrome url="interw.ai/sessions/lucas-m" width={1200} height={520}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, padding: 28 }}>
              {/* Critères pondérés */}
              <div>
                <div style={{ color: FG_DIM, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4, marginBottom: 14 }}>
                  Scores par critère
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  {CRITERIA.map((c, i) => {
                    const delay = 22 + i * 10;
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
                            background: "rgba(255,255,255,0.06)",
                            borderRadius: 3,
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              height: "100%",
                              width: `${value}%`,
                              background: `linear-gradient(90deg, ${ACCENT}, #B58952)`,
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
                    const delay = 70 + i * 12;
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
                            background: "rgba(74,222,128,0.18)",
                            border: "1px solid rgba(74,222,128,0.4)",
                            color: "#4ade80",
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
    </AbsoluteFill>
  );
};

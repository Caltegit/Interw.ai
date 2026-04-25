import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../../components/BrowserChrome";

const STRENGTHS = [
  "Vision produit claire",
  "Excellente communication",
  "Expérience scale-up",
];
const WEAKNESSES = ["Peu d'expérience B2C"];

export const SceneResult: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wizardIn = spring({ frame, fps, config: { damping: 18 } });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 20 } });
  const scoreFill = spring({ frame: frame - 30, fps, config: { damping: 26, stiffness: 80 } });
  const score = Math.round(8.6 * scoreFill * 10) / 10;

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 32 }}>
        <div
          style={{
            fontSize: 48,
            fontWeight: 600,
            color: FG,
            letterSpacing: -1.1,
            textAlign: "center",
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [12, 0])}px)`,
          }}
        >
          Identifie les <span style={{ color: ACCENT }}>meilleurs profils.</span>
        </div>

        <div style={{ transform: `scale(${0.92 + 0.08 * wizardIn})`, opacity: wizardIn }}>
          <BrowserChrome url="interw.ai/sessions/lucas-m/report" width={1100} height={460}>
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", gap: 28, padding: 28 }}>
              {/* Score circle */}
              <div
                style={{
                  background: BG_ELEV_2,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 14,
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 14,
                }}
              >
                <div style={{ position: "relative", width: 180, height: 180 }}>
                  <svg width={180} height={180} viewBox="0 0 180 180">
                    <circle
                      cx={90}
                      cy={90}
                      r={76}
                      stroke="rgba(255,255,255,0.06)"
                      strokeWidth={12}
                      fill="none"
                    />
                    <circle
                      cx={90}
                      cy={90}
                      r={76}
                      stroke={ACCENT}
                      strokeWidth={12}
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 76}
                      strokeDashoffset={2 * Math.PI * 76 * (1 - 0.86 * scoreFill)}
                      transform="rotate(-90 90 90)"
                    />
                  </svg>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <div style={{ color: FG, fontSize: 56, fontWeight: 700, letterSpacing: -2 }}>{score.toFixed(1)}</div>
                    <div style={{ color: FG_DIM, fontSize: 12 }}>/ 10</div>
                  </div>
                </div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "8px 16px",
                    borderRadius: 20,
                    background: "rgba(74,222,128,0.14)",
                    border: "1px solid rgba(74,222,128,0.4)",
                    color: "#4ade80",
                    fontSize: 13,
                    fontWeight: 600,
                  }}
                >
                  ★ Shortlisté
                </div>
              </div>

              {/* Strengths / weaknesses */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <div
                    style={{
                      color: "#4ade80",
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 1.4,
                      marginBottom: 10,
                    }}
                  >
                    Points forts
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {STRENGTHS.map((s, i) => {
                      const a = spring({ frame: frame - (40 + i * 8), fps, config: { damping: 18 } });
                      return (
                        <div
                          key={s}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            color: FG,
                            fontSize: 15,
                            opacity: a,
                            transform: `translateX(${interpolate(a, [0, 1], [-12, 0])}px)`,
                          }}
                        >
                          <span style={{ color: "#4ade80" }}>✓</span> {s}
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div
                    style={{
                      color: ACCENT,
                      fontSize: 12,
                      textTransform: "uppercase",
                      letterSpacing: 1.4,
                      marginBottom: 10,
                    }}
                  >
                    À explorer
                  </div>
                  {WEAKNESSES.map((w, i) => {
                    const a = spring({ frame: frame - (70 + i * 8), fps, config: { damping: 18 } });
                    return (
                      <div
                        key={w}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          color: FG,
                          fontSize: 15,
                          opacity: a,
                          transform: `translateX(${interpolate(a, [0, 1], [-12, 0])}px)`,
                        }}
                      >
                        <span style={{ color: ACCENT }}>•</span> {w}
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

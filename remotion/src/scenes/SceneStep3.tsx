import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../components/BrowserChrome";
import { WizardStepBar } from "../components/WizardStepBar";

const CRITERIA = [
  { label: "Autonomie & initiative", target: 35 },
  { label: "Résilience au changement", target: 35 },
  { label: "Fit culturel", target: 30 },
];

export const SceneStep3: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wizardIn = spring({ frame, fps, config: { damping: 18 } });

  // Total animé jusqu'à 100%
  const totalProgress = spring({ frame: frame - 90, fps, config: { damping: 30, stiffness: 80 } });
  const total = Math.round(totalProgress * 100);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${0.92 + 0.08 * wizardIn})`, opacity: wizardIn }}>
        <BrowserChrome url="interw.ai/projects/new">
          <WizardStepBar active={3} />

          <div style={{ padding: "40px 56px" }}>
            <div style={{ marginBottom: 28 }}>
              <div style={{ color: FG, fontSize: 32, fontWeight: 600, marginBottom: 6, letterSpacing: -0.5 }}>
                Critères d'évaluation
              </div>
              <div style={{ color: FG_DIM, fontSize: 16 }}>
                Pondérez ce qui compte vraiment pour vous.
              </div>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              {CRITERIA.map((c, i) => {
                const delay = 30 + i * 18;
                const appear = spring({ frame: frame - delay, fps, config: { damping: 18 } });
                const slideStart = delay + 20;
                const slideProgress = spring({ frame: frame - slideStart, fps, config: { damping: 28, stiffness: 90 } });
                const currentValue = c.target * slideProgress;
                return (
                  <div
                    key={c.label}
                    style={{
                      background: BG_ELEV_2,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 12,
                      padding: "20px 24px",
                      opacity: appear,
                      transform: `translateX(${interpolate(appear, [0, 1], [-20, 0])}px)`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ color: FG, fontSize: 18, fontWeight: 500 }}>{c.label}</div>
                      <div style={{ color: ACCENT, fontSize: 24, fontWeight: 600, minWidth: 60, textAlign: "right" }}>
                        {Math.round(currentValue)}%
                      </div>
                    </div>
                    {/* Slider track */}
                    <div
                      style={{
                        position: "relative",
                        height: 8,
                        background: "rgba(255,255,255,0.06)",
                        borderRadius: 4,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          left: 0,
                          top: 0,
                          height: "100%",
                          width: `${currentValue}%`,
                          background: `linear-gradient(90deg, ${ACCENT}, #B58952)`,
                          borderRadius: 4,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total */}
            <div
              style={{
                marginTop: 28,
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "16px 24px",
                background: total >= 100 ? `rgba(74,222,128,0.08)` : "rgba(255,255,255,0.03)",
                border: `1px solid ${total >= 100 ? "rgba(74,222,128,0.3)" : BORDER}`,
                borderRadius: 12,
                transition: "all 0.3s",
              }}
            >
              <span style={{ color: FG_DIM, fontSize: 15, textTransform: "uppercase", letterSpacing: 1.2 }}>
                Pondération totale
              </span>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 700,
                  color: total >= 100 ? "#4ade80" : FG,
                }}
              >
                {total}%{total >= 100 && "  ✓"}
              </span>
            </div>
          </div>
        </BrowserChrome>
      </div>
    </AbsoluteFill>
  );
};

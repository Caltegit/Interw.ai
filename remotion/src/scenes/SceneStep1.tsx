import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../components/BrowserChrome";
import { WizardStepBar } from "../components/WizardStepBar";

const FULL_TITLE = "Product Manager";

export const SceneStep1: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wizardIn = spring({ frame, fps, config: { damping: 18 } });

  // Typewriter sur le champ "Intitulé du poste"
  const typeStart = 18;
  const charsPerFrame = 0.6;
  const typed = Math.max(0, Math.min(FULL_TITLE.length, Math.floor((frame - typeStart) * charsPerFrame)));
  const typedText = FULL_TITLE.slice(0, typed);
  const showCursor = (frame - typeStart) % 30 < 15;

  // Avatar reveal après le typewriter
  const avatarIn = spring({ frame: frame - 90, fps, config: { damping: 16, stiffness: 180 } });
  // Voice badge
  const badgeIn = spring({ frame: frame - 110, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${0.92 + 0.08 * wizardIn})`, opacity: wizardIn }}>
        <BrowserChrome url="interw.ai/projects/new">
          <WizardStepBar active={1} />

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 60, padding: "48px 56px" }}>
            {/* Colonne gauche : champs */}
            <div>
              <div style={{ color: FG, fontSize: 32, fontWeight: 600, marginBottom: 8, letterSpacing: -0.5 }}>
                Décrivez le poste
              </div>
              <div style={{ color: FG_DIM, fontSize: 16, marginBottom: 32 }}>
                Le titre, la durée, et qui interroge le candidat.
              </div>

              <label style={{ color: FG_DIM, fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5 }}>
                Intitulé du poste
              </label>
              <div
                style={{
                  marginTop: 8,
                  background: BG_ELEV_2,
                  border: `1px solid ${ACCENT}`,
                  borderRadius: 10,
                  padding: "14px 16px",
                  fontSize: 22,
                  color: FG,
                  height: 26,
                  boxShadow: `0 0 0 4px rgba(212,165,116,0.12)`,
                }}
              >
                {typedText}
                {showCursor && typed < FULL_TITLE.length && (
                  <span style={{ display: "inline-block", width: 2, height: 22, background: ACCENT, marginLeft: 2, verticalAlign: "middle" }} />
                )}
              </div>

              <div style={{ display: "flex", gap: 16, marginTop: 24 }}>
                <Field label="Durée" value="30 min" />
                <Field label="Langue" value="Français" />
              </div>
            </div>

            {/* Colonne droite : avatar + voix */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div
                style={{
                  position: "relative",
                  width: 220,
                  height: 220,
                  transform: `scale(${avatarIn})`,
                  opacity: avatarIn,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    inset: -20,
                    borderRadius: 200,
                    background: `radial-gradient(circle, rgba(212,165,116,0.35), transparent 65%)`,
                    filter: "blur(20px)",
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    borderRadius: 110,
                    background: "linear-gradient(135deg, #d4a574, #8B6F4A)",
                    border: `4px solid rgba(212,165,116,0.6)`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: "#0F0F10",
                    fontSize: 96,
                    fontWeight: 600,
                  }}
                >
                  M
                </div>
              </div>
              <div style={{ marginTop: 20, fontSize: 22, fontWeight: 600, color: FG, opacity: avatarIn }}>
                Marie
              </div>
              <div style={{ fontSize: 14, color: FG_DIM, opacity: avatarIn }}>Recruteur IA</div>

              <div
                style={{
                  marginTop: 18,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  background: `rgba(212,165,116,0.12)`,
                  border: `1px solid rgba(212,165,116,0.4)`,
                  borderRadius: 24,
                  padding: "8px 16px",
                  color: ACCENT,
                  fontSize: 14,
                  fontWeight: 500,
                  opacity: badgeIn,
                  transform: `translateY(${interpolate(badgeIn, [0, 1], [10, 0])}px)`,
                }}
              >
                <span style={{ width: 8, height: 8, borderRadius: 4, background: ACCENT }} />
                Voix Charlotte · FR
              </div>
            </div>
          </div>
        </BrowserChrome>
      </div>
    </AbsoluteFill>
  );
};

const Field: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div style={{ flex: 1 }}>
    <label style={{ color: FG_DIM, fontSize: 13, textTransform: "uppercase", letterSpacing: 1.5 }}>{label}</label>
    <div
      style={{
        marginTop: 8,
        background: BG_ELEV_2,
        border: `1px solid ${BORDER}`,
        borderRadius: 10,
        padding: "12px 16px",
        fontSize: 18,
        color: FG,
      }}
    >
      {value}
    </div>
  </div>
);

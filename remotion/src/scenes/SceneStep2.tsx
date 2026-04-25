import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../components/BrowserChrome";
import { WizardStepBar } from "../components/WizardStepBar";

const QUESTIONS = [
  { num: 1, title: "Présentation", text: "Pouvez-vous nous parler de votre parcours ?" },
  { num: 2, title: "Motivation", text: "Pourquoi ce poste vous intéresse ?" },
  { num: 3, title: "Cas concret", text: "Décrivez un projet dont vous êtes fier." },
];

export const SceneStep2: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wizardIn = spring({ frame, fps, config: { damping: 18 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${0.92 + 0.08 * wizardIn})`, opacity: wizardIn }}>
        <BrowserChrome url="interw.ai/projects/new">
          <WizardStepBar active={2} />

          <div style={{ padding: "40px 56px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 28 }}>
              <div>
                <div style={{ color: FG, fontSize: 32, fontWeight: 600, marginBottom: 6, letterSpacing: -0.5 }}>
                  Vos questions
                </div>
                <div style={{ color: FG_DIM, fontSize: 16 }}>
                  L'IA les pose et relance intelligemment.
                </div>
              </div>
              <LibraryButton appearAtFrame={20} frame={frame} fps={fps} />
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {QUESTIONS.map((q, i) => {
                const delay = 36 + i * 14;
                const a = spring({ frame: frame - delay, fps, config: { damping: 16, stiffness: 180 } });
                return (
                  <div
                    key={q.num}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 18,
                      background: BG_ELEV_2,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 12,
                      padding: "18px 22px",
                      opacity: a,
                      transform: `translateX(${interpolate(a, [0, 1], [-30, 0])}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 8,
                        background: `rgba(212,165,116,0.15)`,
                        color: ACCENT,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                        fontWeight: 600,
                        flexShrink: 0,
                      }}
                    >
                      Q{q.num}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: FG, fontSize: 18, fontWeight: 500, marginBottom: 2 }}>{q.title}</div>
                      <div style={{ color: FG_DIM, fontSize: 15 }}>{q.text}</div>
                    </div>
                    <Pill text="+ Relances" />
                  </div>
                );
              })}
            </div>
          </div>
        </BrowserChrome>
      </div>
    </AbsoluteFill>
  );
};

const LibraryButton: React.FC<{ frame: number; fps: number; appearAtFrame: number }> = ({ frame, fps, appearAtFrame }) => {
  const a = spring({ frame: frame - appearAtFrame, fps, config: { damping: 18 } });
  // Pulse léger
  const pulse = 1 + 0.04 * Math.sin((frame / fps) * Math.PI * 2);
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        background: `linear-gradient(135deg, ${ACCENT}, #B58952)`,
        color: "#0F0F10",
        fontSize: 14,
        fontWeight: 600,
        padding: "10px 18px",
        borderRadius: 10,
        opacity: a,
        transform: `scale(${pulse})`,
        boxShadow: `0 8px 24px rgba(212,165,116,0.4)`,
      }}
    >
      <span style={{ fontSize: 16 }}>📚</span> Bibliothèque
    </div>
  );
};

const Pill: React.FC<{ text: string }> = ({ text }) => (
  <span
    style={{
      fontSize: 12,
      color: FG_DIM,
      background: "rgba(255,255,255,0.04)",
      border: `1px solid ${BORDER}`,
      padding: "4px 10px",
      borderRadius: 12,
    }}
  >
    {text}
  </span>
);

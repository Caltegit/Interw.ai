import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../../components/BrowserChrome";

const MESSAGES: Array<{ from: "ai" | "candidate"; text: string; delay: number }> = [
  { from: "ai", text: "Bonjour Lucas ! Pouvez-vous nous parler de votre parcours ?", delay: 18 },
  { from: "candidate", text: "Avec plaisir. Je suis développeur produit depuis 6 ans…", delay: 38 },
  { from: "ai", text: "Qu'est-ce qui vous attire dans ce poste ?", delay: 60 },
  { from: "candidate", text: "L'opportunité d'avoir un vrai impact sur le produit.", delay: 80 },
];

export const SceneAIInterview: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wizardIn = spring({ frame, fps, config: { damping: 18 } });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 20 } });

  // Halo qui respire autour de l'avatar IA
  const halo = 1 + 0.08 * Math.sin((frame / fps) * Math.PI * 2);

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
          L'IA interroge chaque candidat <span style={{ color: ACCENT }}>à votre place.</span>
        </div>

        <div style={{ transform: `scale(${0.92 + 0.08 * wizardIn})`, opacity: wizardIn }}>
          <BrowserChrome url="interw.ai/session/lucas-m" width={1200} height={520}>
            <div style={{ display: "grid", gridTemplateColumns: "320px 1fr", height: "100%" }}>
              {/* Avatar IA */}
              <div
                style={{
                  borderRight: `1px solid ${BORDER}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 18,
                  padding: 28,
                }}
              >
                <div style={{ position: "relative", width: 160, height: 160 }}>
                  <div
                    style={{
                      position: "absolute",
                      inset: -16,
                      borderRadius: 100,
                      background: `radial-gradient(circle, rgba(212,165,116,0.45), transparent 65%)`,
                      filter: "blur(16px)",
                      transform: `scale(${halo})`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      borderRadius: 80,
                      background: "linear-gradient(135deg, #d4a574, #8B6F4A)",
                      border: `4px solid rgba(212,165,116,0.6)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#0F0F10",
                      fontSize: 72,
                      fontWeight: 600,
                    }}
                  >
                    M
                  </div>
                </div>
                <div style={{ color: FG, fontSize: 18, fontWeight: 600 }}>Marie</div>
                <div
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: "rgba(74,222,128,0.12)",
                    border: "1px solid rgba(74,222,128,0.35)",
                    color: "#4ade80",
                    fontSize: 12,
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: "#4ade80",
                      boxShadow: "0 0 8px #4ade80",
                    }}
                  />
                  En direct
                </div>
              </div>

              {/* Chat */}
              <div style={{ padding: 28, display: "flex", flexDirection: "column", gap: 14, justifyContent: "flex-end" }}>
                {MESSAGES.map((m, i) => {
                  const a = spring({ frame: frame - m.delay, fps, config: { damping: 18, stiffness: 180 } });
                  const isAi = m.from === "ai";
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: isAi ? "flex-start" : "flex-end",
                        opacity: a,
                        transform: `translateY(${interpolate(a, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      <div
                        style={{
                          maxWidth: "75%",
                          background: isAi ? BG_ELEV_2 : `rgba(212,165,116,0.14)`,
                          border: `1px solid ${isAi ? BORDER : "rgba(212,165,116,0.35)"}`,
                          borderRadius: 14,
                          padding: "12px 16px",
                          color: FG,
                          fontSize: 15,
                          lineHeight: 1.4,
                        }}
                      >
                        {m.text}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </BrowserChrome>
        </div>
      </div>
    </AbsoluteFill>
  );
};

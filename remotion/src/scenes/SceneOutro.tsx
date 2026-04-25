import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ACCENT, FG, FG_DIM } from "../components/BrowserChrome";

export const SceneOutro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const titleIn = spring({ frame: frame - 14, fps, config: { damping: 18 } });
  const urlIn = spring({ frame: frame - 30, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 26,
            background: `linear-gradient(135deg, ${ACCENT}, #B58952)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${logoIn}) rotate(${interpolate(logoIn, [0, 1], [-15, 0])}deg)`,
            boxShadow: `0 20px 60px rgba(212,165,116,0.4)`,
            color: "#0F0F10",
            fontSize: 50,
            fontWeight: 700,
          }}
        >
          i
        </div>

        <div
          style={{
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [16, 0])}px)`,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 92, fontWeight: 600, color: FG, letterSpacing: -2, lineHeight: 1.05 }}>
            Prêt en
          </div>
          <div style={{ fontSize: 92, fontWeight: 600, color: ACCENT, letterSpacing: -2, lineHeight: 1.05 }}>
            10 minutes.
          </div>
        </div>

        <div
          style={{
            opacity: urlIn,
            transform: `translateY(${interpolate(urlIn, [0, 1], [10, 0])}px)`,
            display: "flex",
            alignItems: "center",
            gap: 12,
            marginTop: 16,
            padding: "12px 24px",
            background: `rgba(212,165,116,0.10)`,
            border: `1px solid rgba(212,165,116,0.35)`,
            borderRadius: 32,
          }}
        >
          <span style={{ width: 8, height: 8, borderRadius: 4, background: ACCENT, boxShadow: `0 0 12px ${ACCENT}` }} />
          <span style={{ fontSize: 22, color: FG, fontWeight: 500, letterSpacing: 0.3 }}>interw.ai</span>
        </div>

        <div style={{ opacity: urlIn * 0.7, fontSize: 14, color: FG_DIM, marginTop: 8, letterSpacing: 1 }}>
          L'outil d'entretien IA pour les équipes de recrutement
        </div>
      </div>
    </AbsoluteFill>
  );
};

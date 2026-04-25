import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ACCENT, FG, FG_DIM } from "../components/BrowserChrome";

export const SceneHook: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 18, stiffness: 160 } });
  const subIn = spring({ frame: frame - 22, fps, config: { damping: 20, stiffness: 140 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 24 }}>
        {/* Logo mark */}
        <div
          style={{
            width: 88,
            height: 88,
            borderRadius: 24,
            background: `linear-gradient(135deg, ${ACCENT}, #B58952)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            transform: `scale(${logoIn}) translateY(${interpolate(logoIn, [0, 1], [20, 0])}px)`,
            boxShadow: `0 20px 60px rgba(212,165,116,0.4)`,
            color: "#0F0F10",
            fontSize: 44,
            fontWeight: 700,
          }}
        >
          i
        </div>

        <div
          style={{
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [20, 0])}px)`,
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 22, color: FG_DIM, letterSpacing: 4, textTransform: "uppercase", marginBottom: 16 }}>
            Interw · AI
          </div>
          <div style={{ fontSize: 88, fontWeight: 600, color: FG, letterSpacing: -2, lineHeight: 1.05 }}>
            Créez une session
          </div>
          <div style={{ fontSize: 88, fontWeight: 600, color: ACCENT, letterSpacing: -2, lineHeight: 1.05 }}>
            en 4 étapes.
          </div>
        </div>

        <div
          style={{
            opacity: subIn,
            transform: `translateY(${interpolate(subIn, [0, 1], [12, 0])}px)`,
            fontSize: 22,
            color: FG_DIM,
            marginTop: 12,
          }}
        >
          Tutoriel express — 45 secondes
        </div>
      </div>
    </AbsoluteFill>
  );
};

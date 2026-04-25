import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ACCENT, FG, FG_DIM } from "../../components/BrowserChrome";

export const SceneImpact: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const logoIn = spring({ frame, fps, config: { damping: 16, stiffness: 180 } });
  const numIn = spring({ frame: frame - 14, fps, config: { damping: 18 } });
  const sub1In = spring({ frame: frame - 30, fps, config: { damping: 20 } });
  const ctaIn = spring({ frame: frame - 46, fps, config: { damping: 18 } });
  const tagIn = spring({ frame: frame - 60, fps, config: { damping: 22 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 28 }}>
        {/* Logo */}
        <div
          style={{
            width: 84,
            height: 84,
            borderRadius: 22,
            background: `linear-gradient(135deg, ${ACCENT}, #B58952)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "#0F0F10",
            fontSize: 42,
            fontWeight: 700,
            boxShadow: `0 20px 60px rgba(212,165,116,0.4)`,
            transform: `scale(${logoIn}) rotate(${interpolate(logoIn, [0, 1], [-12, 0])}deg)`,
          }}
        >
          i
        </div>

        {/* Big stat */}
        <div
          style={{
            textAlign: "center",
            opacity: numIn,
            transform: `translateY(${interpolate(numIn, [0, 1], [16, 0])}px)`,
          }}
        >
          <div
            style={{
              fontSize: 110,
              fontWeight: 700,
              color: ACCENT,
              letterSpacing: -3,
              lineHeight: 1,
            }}
          >
            3× moins de temps.
          </div>
          <div
            style={{
              marginTop: 18,
              fontSize: 48,
              fontWeight: 500,
              color: FG,
              letterSpacing: -0.8,
              opacity: sub1In,
              transform: `translateY(${interpolate(sub1In, [0, 1], [12, 0])}px)`,
            }}
          >
            De meilleurs recrutements.
          </div>
        </div>

        {/* CTA */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            padding: "16px 32px",
            borderRadius: 14,
            background: `linear-gradient(135deg, ${ACCENT}, #B58952)`,
            color: "#0F0F10",
            fontSize: 22,
            fontWeight: 600,
            boxShadow: `0 16px 40px rgba(212,165,116,0.45)`,
            opacity: ctaIn,
            transform: `scale(${0.92 + 0.08 * ctaIn}) translateY(${interpolate(ctaIn, [0, 1], [10, 0])}px)`,
          }}
        >
          Voir un entretien IA →
        </div>

        {/* URL pill */}
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 20px",
            borderRadius: 24,
            background: "rgba(212,165,116,0.10)",
            border: "1px solid rgba(212,165,116,0.35)",
            opacity: tagIn,
            transform: `translateY(${interpolate(tagIn, [0, 1], [8, 0])}px)`,
          }}
        >
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              background: ACCENT,
              boxShadow: `0 0 12px ${ACCENT}`,
            }}
          />
          <span style={{ color: FG, fontSize: 16, fontWeight: 500, letterSpacing: 0.3 }}>interw.ai</span>
        </div>
      </div>
    </AbsoluteFill>
  );
};

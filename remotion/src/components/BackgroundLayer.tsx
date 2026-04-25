import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const BackgroundLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Drift très lent du gradient
  const x = interpolate(frame, [0, durationInFrames], [0, 80]);
  const y = interpolate(frame, [0, durationInFrames], [0, -60]);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#0F0F10" }}>
      {/* Halo doré principal */}
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          left: -200 + x,
          top: -400 + y,
          background:
            "radial-gradient(circle at center, rgba(212,165,116,0.18) 0%, rgba(212,165,116,0.05) 35%, transparent 70%)",
          filter: "blur(40px)",
        }}
      />
      {/* Halo froid d'accent en bas droite */}
      <div
        style={{
          position: "absolute",
          width: 900,
          height: 900,
          right: -200 - x * 0.5,
          bottom: -300 - y * 0.5,
          background:
            "radial-gradient(circle at center, rgba(120,140,200,0.10) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(245,240,232,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(245,240,232,0.025) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};

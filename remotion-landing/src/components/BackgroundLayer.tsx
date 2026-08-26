import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate } from "remotion";

export const BackgroundLayer: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  // Drift très lent du gradient
  const x = interpolate(frame, [0, durationInFrames], [0, 80]);
  const y = interpolate(frame, [0, durationInFrames], [0, -60]);

  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#FFFFFF" }}>
      {/* Halo doré principal */}
      <div
        style={{
          position: "absolute",
          width: 1400,
          height: 1400,
          left: -200 + x,
          top: -400 + y,
          background:
            "radial-gradient(circle at center, rgba(9,9,11,0.05) 0%, rgba(9,9,11,0.015) 35%, transparent 70%)",
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
            "radial-gradient(circle at center, rgba(9,9,11,0.035) 0%, transparent 70%)",
          filter: "blur(60px)",
        }}
      />
      {/* Subtle grid */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(rgba(9,9,11,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(9,9,11,0.045) 1px, transparent 1px)",
          backgroundSize: "80px 80px",
          opacity: 0.6,
        }}
      />
    </AbsoluteFill>
  );
};

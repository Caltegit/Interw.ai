import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../../components/BrowserChrome";

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00"];
const BLOCKS = [
  { row: 0, col: 0, span: 2, label: "Entretien · Lucas" },
  { row: 1, col: 1, span: 2, label: "Entretien · Sarah" },
  { row: 2, col: 0, span: 1, label: "Entretien · Karim" },
  { row: 3, col: 2, span: 2, label: "Entretien · Elsa" },
  { row: 4, col: 1, span: 1, label: "Entretien · Thomas" },
  { row: 5, col: 0, span: 2, label: "Entretien · Inès" },
  { row: 6, col: 2, span: 1, label: "Entretien · Romain" },
  { row: 7, col: 1, span: 2, label: "Entretien · Léa" },
];

export const SceneProblem: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const calIn = spring({ frame, fps, config: { damping: 18 } });
  const text1In = spring({ frame: frame - 8, fps, config: { damping: 20 } });
  const text2In = spring({ frame: frame - 50, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "560px 1fr",
          gap: 80,
          alignItems: "center",
          maxWidth: 1500,
        }}
      >
        {/* Texte gauche */}
        <div>
          <div
            style={{
              fontSize: 64,
              fontWeight: 600,
              color: FG,
              letterSpacing: -1.5,
              lineHeight: 1.1,
              opacity: text1In,
              transform: `translateY(${interpolate(text1In, [0, 1], [16, 0])}px)`,
            }}
          >
            Des heures<br />d'entretiens…
          </div>
          <div
            style={{
              marginTop: 28,
              fontSize: 38,
              fontWeight: 500,
              color: ACCENT,
              letterSpacing: -0.5,
              lineHeight: 1.15,
              opacity: text2In,
              transform: `translateY(${interpolate(text2In, [0, 1], [16, 0])}px)`,
            }}
          >
            …pour peu de bons<br />candidats.
          </div>
        </div>

        {/* Calendrier surchargé à droite */}
        <div
          style={{
            background: BG_ELEV_2,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: 24,
            opacity: calIn,
            transform: `scale(${0.94 + 0.06 * calIn}) translateY(${interpolate(calIn, [0, 1], [20, 0])}px)`,
            boxShadow: "0 30px 80px rgba(0,0,0,0.4)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
            <div style={{ color: FG, fontSize: 18, fontWeight: 600 }}>Lundi 28 avril</div>
            <div style={{ color: FG_DIM, fontSize: 13 }}>8 entretiens</div>
          </div>
          <div style={{ position: "relative", display: "grid", gridTemplateColumns: "60px 1fr 1fr 1fr 1fr", gap: 0 }}>
            {/* Heures */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{
                    height: 52,
                    color: FG_DIM,
                    fontSize: 11,
                    paddingTop: 4,
                    borderTop: `1px solid ${BORDER}`,
                  }}
                >
                  {h}
                </div>
              ))}
            </div>
            {/* Colonnes vides + blocs */}
            {[0, 1, 2, 3].map((col) => (
              <div key={col} style={{ position: "relative" }}>
                {HOURS.map((_, i) => (
                  <div key={i} style={{ height: 52, borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }} />
                ))}
                {BLOCKS.filter((b) => b.col === col).map((b, idx) => {
                  const delay = 14 + idx * 4;
                  const a = spring({ frame: frame - delay, fps, config: { damping: 18, stiffness: 180 } });
                  const flicker = 0.85 + 0.15 * Math.sin((frame / fps) * 4 + idx);
                  return (
                    <div
                      key={`${b.col}-${b.row}`}
                      style={{
                        position: "absolute",
                        top: b.row * 52 + 2,
                        left: 4,
                        right: 4,
                        height: b.span * 52 - 4,
                        background: `rgba(212,165,116,${0.18 * flicker})`,
                        border: `1px solid rgba(212,165,116,0.45)`,
                        borderRadius: 6,
                        padding: "6px 8px",
                        color: ACCENT,
                        fontSize: 11,
                        fontWeight: 500,
                        opacity: a,
                        transform: `scale(${0.9 + 0.1 * a})`,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {b.label}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

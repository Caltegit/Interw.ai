import { useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../../components/BrowserChrome";
import { DEMO_ENTER_DELAY } from "../../constants";
import { FitScene } from "../../components/FitScene";
import { Subtitle } from "../../components/Subtitle";
import { COPY, type Lang } from "../../i18n/demo-copy";

const HOURS = ["09:00", "10:00", "11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00"];
const ROW_H = 46;

// 5 entretiens par jour, jamais superposés (1 ligne = 1 h)
const NAMES = [
  ["Lucas M.", "Sarah B.", "Karim T.", "Elsa R.", "Thomas P."],
  ["Inès L.", "Romain D.", "Léa V.", "Hugo N.", "Camille A."],
  ["Nora S.", "Paul G.", "Anaïs C.", "Yanis K.", "Marie F."],
  ["Julien E.", "Sofia H.", "Théo M.", "Clara W.", "Adam Z."],
  ["Manon B.", "Victor L.", "Awa D.", "Louis P.", "Emma R."],
];
const ROWS = [
  [0, 1, 3, 5, 7],
  [0, 2, 4, 6, 8],
  [1, 2, 4, 5, 7],
  [0, 1, 3, 6, 8],
  [1, 3, 4, 6, 7],
];

export const SceneProblem: React.FC<{ lang: Lang }> = ({ lang }) => {
  const c = COPY[lang].problem;
  const rawFrame = useCurrentFrame();
  // La scène ne s'anime qu'après la fin de la transition entrante.
  const frame = rawFrame - DEMO_ENTER_DELAY;
  const { fps } = useVideoConfig();

  const calIn = spring({ frame, fps, config: { damping: 18 } });
  const text1In = spring({ frame: frame - 8, fps, config: { damping: 20 } });

  return (
    <FitScene designWidth={1620} designHeight={680}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, width: "100%", height: "100%" }}>
        {/* Texte */}
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 600,
              color: FG,
              letterSpacing: -1.4,
              lineHeight: 1.1,
              opacity: text1In,
              transform: `translateY(${interpolate(text1In, [0, 1], [16, 0])}px)`,
            }}
          >
            {c.title}
          </div>
          <Subtitle frame={frame} mainDelay={43}>
            {c.subtitle}
          </Subtitle>

        </div>

        {/* Agenda semaine */}
        <div
          style={{
            width: "100%",
            background: BG_ELEV_2,
            border: `1px solid ${BORDER}`,
            borderRadius: 16,
            padding: 28,
            opacity: calIn,
            transform: `scale(${0.96 + 0.04 * calIn}) translateY(${interpolate(calIn, [0, 1], [20, 0])}px)`,
            boxShadow: "0 24px 60px rgba(9,9,11,0.10)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <div style={{ color: FG, fontSize: 20, fontWeight: 600 }}>{c.weekLabel}</div>
            <div style={{ color: FG_DIM, fontSize: 15 }}>{c.interviewCount}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "80px repeat(5, 1fr)" }}>
            {/* colonne heures */}
            <div>
              <div style={{ height: 34 }} />
              {HOURS.map((h) => (
                <div
                  key={h}
                  style={{ height: ROW_H, color: FG_DIM, fontSize: 13, paddingTop: 4, borderTop: `1px solid ${BORDER}` }}
                >
                  {h}
                </div>
              ))}
            </div>

            {c.days.map((d, col) => (
              <div key={d} style={{ position: "relative" }}>
                <div
                  style={{
                    height: 34,
                    color: FG,
                    fontSize: 14,
                    fontWeight: 600,
                    textAlign: "center",
                    borderLeft: `1px solid ${BORDER}`,
                  }}
                >
                  {d}
                </div>
                {HOURS.map((_, i) => (
                  <div key={i} style={{ height: ROW_H, borderTop: `1px solid ${BORDER}`, borderLeft: `1px solid ${BORDER}` }} />
                ))}
                {ROWS[col].map((row, idx) => {
                  const a = spring({
                    frame: frame - (16 + col * 6 + idx * 3),
                    fps,
                    config: { damping: 18, stiffness: 180 },
                  });
                  return (
                    <div
                      key={idx}
                      style={{
                        position: "absolute",
                        top: 34 + row * ROW_H + 3,
                        left: 6,
                        right: 4,
                        height: ROW_H - 6,
                        background: "rgba(9,9,11,0.14)",
                        border: "1px solid rgba(9,9,11,0.40)",
                        borderRadius: 6,
                        padding: "6px 8px",
                        color: ACCENT,
                        fontSize: 13,
                        fontWeight: 500,
                        opacity: a,
                        transform: `scale(${0.92 + 0.08 * a})`,
                        overflow: "hidden",
                        whiteSpace: "nowrap",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {NAMES[col][idx]}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>
    </FitScene>
  );
};

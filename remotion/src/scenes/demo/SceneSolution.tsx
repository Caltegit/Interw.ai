import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../../components/BrowserChrome";

const STATS = [
  { label: "Sessions", value: "247", trend: "+18%" },
  { label: "Candidats", value: "182", trend: "+12%" },
  { label: "Score moyen", value: "7.4", trend: "+0.8" },
];

export const SceneSolution: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wizardIn = spring({ frame, fps, config: { damping: 18 } });
  const titleIn = spring({ frame: frame - 16, fps, config: { damping: 20 } });

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 40 }}>
        <div
          style={{
            fontSize: 56,
            fontWeight: 600,
            color: FG,
            letterSpacing: -1.2,
            textAlign: "center",
            lineHeight: 1.1,
            opacity: titleIn,
            transform: `translateY(${interpolate(titleIn, [0, 1], [16, 0])}px)`,
          }}
        >
          Interw.ai automatise<br />
          <span style={{ color: ACCENT }}>vos premiers entretiens.</span>
        </div>

        <div
          style={{
            transform: `scale(${0.92 + 0.08 * wizardIn})`,
            opacity: wizardIn,
          }}
        >
          <BrowserChrome url="interw.ai/dashboard" width={1200} height={420}>
            <div style={{ padding: "32px 40px" }}>
              <div style={{ color: FG, fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Tableau de bord</div>
              <div style={{ color: FG_DIM, fontSize: 14, marginBottom: 28 }}>Avril 2026</div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 18 }}>
                {STATS.map((s, i) => {
                  const delay = 30 + i * 10;
                  const a = spring({ frame: frame - delay, fps, config: { damping: 18 } });
                  return (
                    <div
                      key={s.label}
                      style={{
                        background: BG_ELEV_2,
                        border: `1px solid ${BORDER}`,
                        borderRadius: 12,
                        padding: "20px 22px",
                        opacity: a,
                        transform: `translateY(${interpolate(a, [0, 1], [12, 0])}px)`,
                      }}
                    >
                      <div style={{ color: FG_DIM, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4 }}>
                        {s.label}
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginTop: 10 }}>
                        <div style={{ color: FG, fontSize: 36, fontWeight: 600, letterSpacing: -1 }}>{s.value}</div>
                        <div style={{ color: "#4ade80", fontSize: 13, fontWeight: 500 }}>{s.trend}</div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Chart bars */}
              <div style={{ marginTop: 28, display: "flex", alignItems: "flex-end", gap: 10, height: 90 }}>
                {[40, 65, 50, 80, 55, 90, 72, 85, 60, 95, 70, 88].map((h, i) => {
                  const delay = 60 + i * 3;
                  const a = spring({ frame: frame - delay, fps, config: { damping: 22, stiffness: 90 } });
                  return (
                    <div
                      key={i}
                      style={{
                        flex: 1,
                        height: `${h * a}%`,
                        background: `linear-gradient(180deg, ${ACCENT}, rgba(212,165,116,0.3))`,
                        borderRadius: 4,
                      }}
                    />
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

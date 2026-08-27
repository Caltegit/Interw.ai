import {
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER } from "../../components/BrowserChrome";
import { DEMO_ENTER_DELAY } from "../../constants";
import { FitScene } from "../../components/FitScene";
import { Subtitle } from "../../components/Subtitle";
import { COPY, type Lang } from "../../i18n/demo-copy";

const BADGE_COLORS = [
  { color: "#16A34A", badgeBg: "rgba(22,163,74,0.12)", photo: "people/clement-a.jpg" },
  { color: "#EA8C0B", badgeBg: "rgba(234,140,11,0.12)", photo: "people/candidate-man-1.jpg" },
  { color: "#A1A1AA", badgeBg: "rgba(9,9,11,0.05)", photo: "people/candidate-woman-2.jpg" },
];

export const SceneProfiles: React.FC<{ lang: Lang }> = ({ lang }) => {
  const c = COPY[lang].profiles;
  const rawFrame = useCurrentFrame();
  const frame = rawFrame - DEMO_ENTER_DELAY;
  const { fps } = useVideoConfig();

  const shellIn = spring({ frame, fps, config: { damping: 18 } });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 20 } });

  return (
    <FitScene designWidth={1120} designHeight={740}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 34, width: "100%", height: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 600,
              color: FG,
              letterSpacing: -1.4,
              lineHeight: 1.1,
              opacity: titleIn,
              transform: `translateY(${interpolate(titleIn, [0, 1], [14, 0])}px)`,
            }}
          >
            {c.titlePre}<span style={{ color: ACCENT }}>{c.titleAccent}</span>
          </div>
          <Subtitle frame={frame} mainDelay={12} mainFontSize={52}>
            {c.subtitle}
          </Subtitle>
        </div>

        <div style={{ transform: `scale(${0.94 + 0.06 * shellIn})`, opacity: shellIn }}>
          <BrowserChrome url={c.url} width={1120} height={560}>
            <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
              {c.profiles.map((p, i) => {
                const delay = 30 + i * 20;
                const a = spring({ frame: frame - delay, fps, config: { damping: 17, stiffness: 170 } });
                const fill = spring({
                  frame: frame - (delay + 8),
                  fps,
                  config: { damping: 26, stiffness: 80 },
                });
                const r = 26;
                const circumference = 2 * Math.PI * r;
                const badge = BADGE_COLORS[i];
                return (
                  <div
                    key={p.name}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 20,
                      background: "#FFFFFF",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 14,
                      padding: "18px 24px",
                      opacity: a,
                      transform: `translateY(${interpolate(a, [0, 1], [18, 0])}px)`,
                    }}
                  >
                    <Img
                      src={staticFile(badge.photo)}
                      style={{
                        width: 58,
                        height: 58,
                        borderRadius: 29,
                        objectFit: "cover",
                        flexShrink: 0,
                      }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ color: FG, fontSize: 21, fontWeight: 600, marginBottom: 4 }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 15, marginBottom: 8, whiteSpace: "nowrap" }}>
                        <span style={{ color: "#A1A1AA" }}>{p.duration}{c.durationSuffix}</span>
                        <span style={{ color: "#A1A1AA" }}> · </span>
                        <span style={{ color: FG, fontWeight: 600 }}>{p.watch}{c.watchSuffix}</span>
                      </div>
                      <span
                        style={{
                          fontSize: 14,
                          fontWeight: 500,
                          color: badge.color,
                          background: badge.badgeBg,
                          padding: "5px 12px",
                          borderRadius: 8,
                        }}
                      >
                        {c.badges[i]}
                      </span>
                    </div>

                    <div style={{ position: "relative", width: 68, height: 68, flexShrink: 0 }}>
                      <svg width={68} height={68} viewBox="0 0 68 68">
                        <circle cx={34} cy={34} r={r} stroke="rgba(9,9,11,0.07)" strokeWidth={5} fill="none" />
                        <circle
                          cx={34}
                          cy={34}
                          r={r}
                          stroke={badge.color}
                          strokeWidth={5}
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray={circumference}
                          strokeDashoffset={circumference * (1 - (p.score / 100) * fill)}
                          transform="rotate(-90 34 34)"
                        />
                      </svg>
                      <div
                        style={{
                          position: "absolute",
                          inset: 0,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: FG,
                          fontSize: 20,
                          fontWeight: 700,
                        }}
                      >
                        {Math.round(p.score * fill)}
                      </div>
                    </div>
                  </div>
                );
              })}

              <div style={{ color: FG_DIM, fontSize: 14, marginTop: 4 }}>
                {c.footnote}
              </div>
            </div>
          </BrowserChrome>
        </div>
      </div>
    </FitScene>
  );
};

import {
  Img,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  spring,
  interpolate,
} from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../../components/BrowserChrome";
import { DEMO_ENTER_DELAY } from "../../constants";
import { FitScene } from "../../components/FitScene";
import { Subtitle } from "../../components/Subtitle";
import { COPY, type Lang } from "../../i18n/demo-copy";

export const SceneInterview: React.FC<{ lang: Lang }> = ({ lang }) => {
  const c = COPY[lang].interview;
  const rawFrame = useCurrentFrame();
  const frame = rawFrame - DEMO_ENTER_DELAY;
  const { fps } = useVideoConfig();

  const shellIn = spring({ frame, fps, config: { damping: 18 } });
  const titleIn = spring({ frame: frame - 14, fps, config: { damping: 20 } });
  const questionIn = spring({ frame: frame - 34, fps, config: { damping: 20 } });

  const levels = new Array(28).fill(0).map((_, i) => {
    const s = Math.sin((rawFrame / fps) * 6 + i * 0.7);
    const s2 = Math.sin((rawFrame / fps) * 3.3 + i * 0.31);
    return 0.25 + 0.75 * Math.abs(s * 0.6 + s2 * 0.4);
  });

  const seconds = Math.floor(rawFrame / fps) + 42;
  const timer = `01:${String(seconds % 60).padStart(2, "0")}`;

  return (
    <FitScene designWidth={1240} designHeight={680}>
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
              transform: `translateY(${interpolate(titleIn, [0, 1], [16, 0])}px)`,
            }}
          >
            {c.titlePre}<span style={{ color: ACCENT }}>{c.titleAccent}</span>
          </div>
          <Subtitle frame={frame} mainDelay={14} mainFontSize={56}>
            {c.subtitle}
          </Subtitle>
        </div>

        <div style={{ transform: `scale(${0.94 + 0.06 * shellIn})`, opacity: shellIn }}>
          <BrowserChrome url={c.url} width={1240} height={540}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 380px", height: "100%" }}>
              {/* Vidéo candidat */}
              <div style={{ position: "relative", background: "#09090B", overflow: "hidden" }}>
                <Img
                  src={staticFile(
                    `people/frames/f${String((rawFrame % 300) + 1).padStart(4, "0")}.jpg`,
                  )}
                  style={{ width: "100%", height: "100%", objectFit: "cover" }}
                />
                {/* Badge enregistrement */}
                <div
                  style={{
                    position: "absolute",
                    top: 18,
                    left: 18,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "6px 14px",
                    borderRadius: 20,
                    background: "rgba(9,9,11,0.55)",
                    color: "#FFFFFF",
                    fontSize: 13,
                    fontWeight: 500,
                  }}
                >
                  <span
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      background: "#EF4444",
                      opacity: 0.5 + 0.5 * Math.abs(Math.sin((rawFrame / fps) * Math.PI)),
                    }}
                  />
                  {c.recording}{timer}
                </div>

                {/* Niveau micro */}
                <div
                  style={{
                    position: "absolute",
                    left: 18,
                    right: 18,
                    bottom: 18,
                    height: 54,
                    borderRadius: 12,
                    background: "rgba(9,9,11,0.45)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 5,
                    padding: "0 18px",
                  }}
                >
                  {levels.map((l, i) => (
                    <div
                      key={i}
                      style={{
                        width: 4,
                        height: 6 + l * 30,
                        borderRadius: 3,
                        background: "rgba(255,255,255,0.85)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Panneau question */}
              <div style={{ borderLeft: `1px solid ${BORDER}`, padding: 26, display: "flex", flexDirection: "column", gap: 20 }}>
                <div style={{ color: FG_DIM, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4 }}>
                  {c.questionLabel}
                </div>
                <div
                  style={{
                    background: BG_ELEV_2,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 14,
                    padding: "18px 20px",
                    color: FG,
                    fontSize: 19,
                    lineHeight: 1.4,
                    fontWeight: 500,
                    opacity: questionIn,
                    transform: `translateY(${interpolate(questionIn, [0, 1], [12, 0])}px)`,
                  }}
                >
                  {c.questionText}
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 4 }}>
                  {c.steps.map((s, i) => {
                    const done = i < 2;
                    const active = i === 2;
                    return (
                      <div key={s} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <span
                          style={{
                            width: 10,
                            height: 10,
                            borderRadius: 5,
                            background: done || active ? ACCENT : "rgba(9,9,11,0.18)",
                          }}
                        />
                        <span
                          style={{
                            color: active ? FG : FG_DIM,
                            fontSize: 15,
                            fontWeight: active ? 600 : 400,
                          }}
                        >
                          {s}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </BrowserChrome>
        </div>
      </div>
    </FitScene>
  );
};

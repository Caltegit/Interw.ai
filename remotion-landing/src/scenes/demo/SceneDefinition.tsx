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

const TITLE = "Office manager";

const QUESTIONS = [
  { text: "Parlez-moi de votre parcours.", duration: "0:14" },
  { text: "Comment gérez-vous un désaccord ?", duration: "0:11" },
  { text: "Décrivez un projet dont vous êtes fier.", duration: null },
];

const CRITERIA = ["Technique", "Communication", "Autonomie"];

// Vidéo de la recruteuse (30 fps, ~11,7 s) décomposée en images, bouclée
// proprement pour couvrir les 180 frames de la scène.
const EVA_VIDEO_FRAMES = 351;

// La première question — et donc le cadre vidéo de la recruteuse — apparaît
// une fois l'intitulé du poste saisi.
const FIRST_QUESTION_DELAY = 98;

export const SceneDefinition: React.FC = () => {
  const rawFrame = useCurrentFrame();
  const frame = rawFrame - DEMO_ENTER_DELAY;
  const { fps } = useVideoConfig();

  const shellIn = spring({ frame, fps, config: { damping: 18 } });
  const titleIn = spring({ frame: frame - 12, fps, config: { damping: 20 } });

  // Saisie animée de l'intitulé du poste
  const typedCount = Math.max(
    0,
    Math.min(TITLE.length, Math.round(interpolate(frame - 38, [0, 52], [0, TITLE.length], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })))
  );
  const typed = TITLE.slice(0, typedCount);
  const caretOn = Math.floor(rawFrame / 12) % 2 === 0;

  // Apparition du cadre recruteuse, synchronisée avec la première question
  const camIn = spring({
    frame: frame - FIRST_QUESTION_DELAY,
    fps,
    config: { damping: 18, stiffness: 160 },
  });
  // Frames écoulées depuis l'apparition (pour le timer, les ondes et la boucle vidéo)
  const camFrame = Math.max(0, frame - FIRST_QUESTION_DELAY);

  // Timer partagé entre la ligne 3 et le badge d'enregistrement : 0:03 → 0:07
  const seconds = Math.floor(
    interpolate(camFrame, [0, 175], [3, 7.99], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );
  const recTimer = `0:0${seconds}`;
  const dotOpacity = 0.4 + 0.6 * Math.abs(Math.sin((camFrame / fps) * Math.PI));

  const levels = new Array(10).fill(0).map((_, i) => {
    const s = Math.sin((camFrame / fps) * 6 + i * 0.8);
    const s2 = Math.sin((camFrame / fps) * 3.1 + i * 0.4);
    return 0.25 + 0.75 * Math.abs(s * 0.6 + s2 * 0.4);
  });

  return (
    <FitScene designWidth={1180} designHeight={720}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 30, width: "100%", height: "100%" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 58,
              fontWeight: 600,
              color: FG,
              letterSpacing: -1.4,
              lineHeight: 1.1,
              lineHeight: 1.1,
              opacity: titleIn,
              transform: `translateY(${interpolate(titleIn, [0, 1], [16, 0])}px)`,
            }}
          >
            Vous définissez <span style={{ color: ACCENT }}>l'entretien.</span>
          </div>
          <Subtitle frame={frame} mainDelay={12} mainFontSize={52}>
            Vos critères, vos questions — posées par vous.
          </Subtitle>
        </div>

        <div style={{ transform: `scale(${0.94 + 0.06 * shellIn})`, opacity: shellIn }}>
          <BrowserChrome url="interw · nouveau poste" width={1180} height={560}>
            <div style={{ padding: "24px 30px", display: "flex", flexDirection: "column", gap: 24 }}>
              {/* Intitulé */}
              <div>
                <Label>Intitulé du poste</Label>
                <div
                  style={{
                    marginTop: 10,
                    background: "#FFFFFF",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 10,
                    padding: "14px 18px",
                    fontSize: 20,
                    color: FG,
                    fontWeight: 500,
                  }}
                >
                  {typed}
                  <span style={{ opacity: caretOn && typedCount < TITLE.length ? 1 : 0 }}>|</span>
                </div>
              </div>

              {/* Questions enregistrées + cadre recruteuse */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 200px", gap: 22, alignItems: "start" }}>
                <div>
                  <Label>Questions enregistrées</Label>
                  <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 10 }}>
                    {QUESTIONS.map((q, i) => {
                      const a = spring({ frame: frame - (FIRST_QUESTION_DELAY + i * 20), fps, config: { damping: 17, stiffness: 180 } });
                      const active = q.duration === null;
                      return (
                        <div
                          key={q.text}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 14,
                            background: active ? "rgba(9,9,11,0.05)" : BG_ELEV_2,
                            border: `1px solid ${active ? "rgba(9,9,11,0.35)" : BORDER}`,
                            borderRadius: 10,
                            padding: "13px 16px",
                            opacity: a,
                            transform: `translateX(${interpolate(a, [0, 1], [-24, 0])}px)`,
                          }}
                        >
                          <span
                            style={{
                              width: 26,
                              height: 26,
                              borderRadius: 6,
                              background: ACCENT,
                              color: "#FFFFFF",
                              fontSize: 13,
                              fontWeight: 600,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              flexShrink: 0,
                            }}
                          >
                            {i + 1}
                          </span>
                          <span style={{ color: FG, fontSize: 17, flex: 1 }}>{q.text}</span>
                          {active ? (
                            <span style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#EF4444", fontSize: 15, fontWeight: 600 }}>
                              <span style={{ width: 9, height: 9, borderRadius: 5, background: "#EF4444", opacity: dotOpacity }} />
                              {recTimer}
                            </span>
                          ) : (
                            <span style={{ color: FG_DIM, fontSize: 15 }}>{q.duration}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cadre d'enregistrement recruteuse — apparaît avec la 1re question */}
                <div
                  style={{
                    position: "relative",
                    width: 200,
                    height: 250,
                    borderRadius: 14,
                    overflow: "hidden",
                    background: "#09090B",
                    border: `1px solid ${BORDER}`,
                    opacity: camIn,
                    transform: `scale(${0.9 + 0.1 * camIn})`,
                    transformOrigin: "top center",
                  }}
                >
                  <Img
                    src={staticFile(
                      `eva/frames/e${String((camFrame % EVA_VIDEO_FRAMES) + 1).padStart(4, "0")}.jpg`,
                    )}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />


                  <div
                    style={{
                      position: "absolute",
                      top: 10,
                      left: 10,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 10px",
                      borderRadius: 16,
                      background: "rgba(9,9,11,0.55)",
                      color: "#FFFFFF",
                      fontSize: 11,
                      fontWeight: 500,
                    }}
                  >
                    <span style={{ width: 7, height: 7, borderRadius: 4, background: "#EF4444", opacity: dotOpacity }} />
                    Enregistrement · 00:0{seconds}
                  </div>

                  <div
                    style={{
                      position: "absolute",
                      left: 10,
                      right: 10,
                      bottom: 10,
                      height: 32,
                      borderRadius: 8,
                      background: "rgba(9,9,11,0.45)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 4,
                    }}
                  >
                    {levels.map((l, i) => (
                      <div
                        key={i}
                        style={{
                          width: 3,
                          height: 5 + l * 18,
                          borderRadius: 2,
                          background: "rgba(255,255,255,0.85)",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Critères */}
              <div>
                <Label>Critères de sélection</Label>
                <div style={{ marginTop: 12, display: "flex", gap: 10 }}>
                  {CRITERIA.map((c, i) => {
                    const a = spring({ frame: frame - (188 + i * 15), fps, config: { damping: 14, stiffness: 200 } });
                    return (
                      <span
                        key={c}
                        style={{
                          fontSize: 15,
                          fontWeight: 500,
                          color: ACCENT,
                          background: "rgba(9,9,11,0.05)",
                          border: `1px solid ${BORDER}`,
                          padding: "8px 16px",
                          borderRadius: 20,
                          opacity: a,
                          transform: `scale(${0.85 + 0.15 * a})`,
                        }}
                      >
                        {c}
                      </span>
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

const Label: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ color: FG_DIM, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.4 }}>
    {children}
  </div>
);

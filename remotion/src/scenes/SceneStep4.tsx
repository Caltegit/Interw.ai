import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring, interpolate } from "remotion";
import { BrowserChrome, ACCENT, FG, FG_DIM, BORDER, BG_ELEV_2 } from "../components/BrowserChrome";
import { WizardStepBar } from "../components/WizardStepBar";

export const SceneStep4: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wizardIn = spring({ frame, fps, config: { damping: 18 } });
  const linkIn = spring({ frame: frame - 24, fps, config: { damping: 18 } });
  const copyFlash = spring({ frame: frame - 78, fps, config: { damping: 14, stiffness: 220 } });
  const reportIn = spring({ frame: frame - 130, fps, config: { damping: 16, stiffness: 160 } });

  // Score qui compte de 0 à 87
  const scoreP = spring({ frame: frame - 150, fps, config: { damping: 30, stiffness: 80 } });
  const score = Math.round(scoreP * 87);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div style={{ transform: `scale(${0.92 + 0.08 * wizardIn})`, opacity: wizardIn, display: "flex", gap: 36 }}>
        {/* Left: lien candidat */}
        <BrowserChrome url="interw.ai/projects/new" width={780} height={620}>
          <WizardStepBar active={4} />
          <div style={{ padding: "40px 36px" }}>
            <div style={{ color: FG, fontSize: 26, fontWeight: 600, marginBottom: 6, letterSpacing: -0.5 }}>
              Lien candidat
            </div>
            <div style={{ color: FG_DIM, fontSize: 14, marginBottom: 24 }}>
              Partagez par email ou copiez le lien.
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                background: BG_ELEV_2,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "14px 16px",
                opacity: linkIn,
                transform: `translateY(${interpolate(linkIn, [0, 1], [10, 0])}px)`,
              }}
            >
              <span style={{ color: ACCENT, fontSize: 18 }}>🔗</span>
              <div style={{ flex: 1, color: FG, fontSize: 16, fontFamily: "Inter, monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                interw.ai/session/product-manager-x4t2
              </div>
              <button
                style={{
                  background: copyFlash > 0.5 ? "#4ade80" : `linear-gradient(135deg, ${ACCENT}, #B58952)`,
                  color: "#0F0F10",
                  fontSize: 13,
                  fontWeight: 600,
                  padding: "8px 14px",
                  borderRadius: 8,
                  border: "none",
                  transform: `scale(${1 + copyFlash * 0.08})`,
                }}
              >
                {copyFlash > 0.5 ? "✓ Copié" : "Copier"}
              </button>
            </div>

            <div style={{ display: "flex", gap: 12, marginTop: 28 }}>
              <Stat label="Sessions" value="0" />
              <Stat label="Statut" value="Actif" highlight />
              <Stat label="Crédits" value="∞" />
            </div>
          </div>
        </BrowserChrome>

        {/* Right: rapport reçu */}
        <div
          style={{
            opacity: reportIn,
            transform: `translateX(${interpolate(reportIn, [0, 1], [40, 0])}px) scale(${0.95 + 0.05 * reportIn})`,
            width: 460,
            background: "#16161A",
            border: `1px solid rgba(245,240,232,0.18)`,
            borderRadius: 18,
            padding: 28,
            boxShadow: "0 30px 80px rgba(0,0,0,0.5)",
          }}
        >
          <div style={{ color: FG_DIM, fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", marginBottom: 8 }}>
            📧 Nouveau rapport
          </div>
          <div style={{ color: FG, fontSize: 22, fontWeight: 600, marginBottom: 4 }}>Sophie Laurent</div>
          <div style={{ color: FG_DIM, fontSize: 14, marginBottom: 24 }}>Product Manager · 8 questions</div>

          {/* Score circle */}
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24 }}>
            <div
              style={{
                position: "relative",
                width: 96,
                height: 96,
                borderRadius: 48,
                background: `conic-gradient(${ACCENT} ${score * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <div
                style={{
                  width: 78,
                  height: 78,
                  borderRadius: 39,
                  background: "#16161A",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: FG,
                  fontSize: 26,
                  fontWeight: 700,
                }}
              >
                {score}
              </div>
            </div>
            <div>
              <div style={{ color: FG_DIM, fontSize: 12, textTransform: "uppercase", letterSpacing: 1.2 }}>Score global</div>
              <div style={{ color: "#4ade80", fontSize: 18, fontWeight: 600, marginTop: 4 }}>👍 Recommandé</div>
            </div>
          </div>

          {/* Mini criteria bars */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {[
              { l: "Autonomie", v: 92 },
              { l: "Résilience", v: 78 },
              { l: "Fit culturel", v: 85 },
            ].map((c) => (
              <div key={c.l}>
                <div style={{ display: "flex", justifyContent: "space-between", color: FG_DIM, fontSize: 13, marginBottom: 4 }}>
                  <span>{c.l}</span>
                  <span style={{ color: FG }}>{c.v}/100</span>
                </div>
                <div style={{ height: 4, background: "rgba(255,255,255,0.06)", borderRadius: 2, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${c.v * scoreP}%`, background: ACCENT, borderRadius: 2 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Stat: React.FC<{ label: string; value: string; highlight?: boolean }> = ({ label, value, highlight }) => (
  <div style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: `1px solid ${BORDER}`, borderRadius: 10, padding: "12px 14px" }}>
    <div style={{ color: FG_DIM, fontSize: 11, textTransform: "uppercase", letterSpacing: 1.2 }}>{label}</div>
    <div style={{ color: highlight ? "#4ade80" : FG, fontSize: 20, fontWeight: 600, marginTop: 2 }}>{value}</div>
  </div>
);

import React from "react";
import { ACCENT, FG, FG_DIM, BORDER } from "./BrowserChrome";

interface WizardStepBarProps {
  active: 1 | 2 | 3 | 4;
}

const STEPS = ["Poste", "Questions", "Critères", "Activation"];

export const WizardStepBar: React.FC<WizardStepBarProps> = ({ active }) => {
  return (
    <div style={{ display: "flex", gap: 32, alignItems: "center", padding: "20px 32px", borderBottom: `1px solid ${BORDER}` }}>
      {STEPS.map((label, i) => {
        const idx = i + 1;
        const isActive = idx === active;
        const isPast = idx < active;
        return (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 14,
                background: isActive || isPast ? ACCENT : "transparent",
                border: `2px solid ${isActive || isPast ? ACCENT : "rgba(245,240,232,0.25)"}`,
                color: isActive || isPast ? "#0F0F10" : FG_DIM,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 600,
              }}
            >
              {isPast ? "✓" : idx}
            </div>
            <span
              style={{
                fontSize: 16,
                fontWeight: isActive ? 600 : 400,
                color: isActive ? FG : FG_DIM,
              }}
            >
              {label}
            </span>
          </div>
        );
      })}
    </div>
  );
};

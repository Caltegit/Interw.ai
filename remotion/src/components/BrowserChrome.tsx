import React from "react";

export const ACCENT = "#d4a574";
export const FG = "#F5F0E8";
export const FG_DIM = "rgba(245,240,232,0.6)";
export const BG = "#0F0F10";
export const BG_ELEV = "#16161A";
export const BG_ELEV_2 = "#1C1C22";
export const BORDER = "rgba(245,240,232,0.10)";
export const BORDER_STRONG = "rgba(245,240,232,0.18)";

interface BrowserChromeProps {
  url?: string;
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  style?: React.CSSProperties;
}

export const BrowserChrome: React.FC<BrowserChromeProps> = ({
  url = "interw.ai",
  children,
  width = 1400,
  height = 760,
  style,
}) => {
  return (
    <div
      style={{
        width,
        height,
        borderRadius: 18,
        overflow: "hidden",
        background: BG_ELEV,
        border: `1px solid ${BORDER_STRONG}`,
        boxShadow: "0 30px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.02) inset",
        display: "flex",
        flexDirection: "column",
        ...style,
      }}
    >
      {/* Top bar */}
      <div
        style={{
          height: 40,
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 8,
          borderBottom: `1px solid ${BORDER}`,
          background: "rgba(255,255,255,0.02)",
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: 6, background: "#FF5F57" }} />
        <span style={{ width: 11, height: 11, borderRadius: 6, background: "#FEBC2E" }} />
        <span style={{ width: 11, height: 11, borderRadius: 6, background: "#28C840" }} />
        <div
          style={{
            marginLeft: 16,
            background: "rgba(255,255,255,0.04)",
            borderRadius: 6,
            padding: "4px 12px",
            fontSize: 13,
            color: FG_DIM,
            fontFamily: "Inter, sans-serif",
            minWidth: 280,
          }}
        >
          {url}
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>{children}</div>
    </div>
  );
};

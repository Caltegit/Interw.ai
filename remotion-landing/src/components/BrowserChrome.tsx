import React from "react";

export const ACCENT = "#09090B";
export const FG = "#09090B";
export const FG_DIM = "#71717A";
export const BG = "#FFFFFF";
export const BG_ELEV = "#FAFAFA";
export const BG_ELEV_2 = "#F4F4F5";
export const BORDER = "#E4E4E7";
export const BORDER_STRONG = "#D4D4D8";

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
        boxShadow: "0 24px 60px rgba(9,9,11,0.10)",
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
          background: "rgba(9,9,11,0.02)",
        }}
      >
        <span style={{ width: 11, height: 11, borderRadius: 6, background: "#FF5F57" }} />
        <span style={{ width: 11, height: 11, borderRadius: 6, background: "#FEBC2E" }} />
        <span style={{ width: 11, height: 11, borderRadius: 6, background: "#28C840" }} />
        <div
          style={{
            marginLeft: 16,
            background: "rgba(9,9,11,0.04)",
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

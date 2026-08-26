import React from "react";
import { spring, interpolate, useVideoConfig } from "remotion";
import { ACCENT } from "./BrowserChrome";

interface SubtitleProps {
  /** Frame de la scène (déjà décalée du délai d'entrée). */
  frame: number;
  /** Frame d'apparition du texte principal. */
  mainDelay: number;
  /** Conservé pour compatibilité — la taille est désormais fixe. */
  mainFontSize?: number;
  children: React.ReactNode;
}

/**
 * Sous-titre unifié sur le style de la scène 1 (Agenda) :
 * 38 px, graisse 500, couleur accent, interlettrage -0,6,
 * apparition 12 frames après le titre.
 */
export const Subtitle: React.FC<SubtitleProps> = ({ frame, mainDelay, children }) => {
  const { fps } = useVideoConfig();
  const a = spring({ frame: frame - (mainDelay + 12), fps, config: { damping: 20 } });

  return (
    <div
      style={{
        marginTop: 16,
        fontSize: 38,
        fontWeight: 500,
        color: ACCENT,
        opacity: a,
        letterSpacing: -0.6,
        textAlign: "center",
        transform: `translateY(${interpolate(a, [0, 1], [16, 0])}px)`,
      }}
    >
      {children}
    </div>
  );
};

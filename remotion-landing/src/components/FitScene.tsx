import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";

interface FitSceneProps {
  /** Largeur de la maquette telle que dessinée. */
  designWidth: number;
  /** Hauteur de la maquette telle que dessinée. */
  designHeight: number;
  /** Part du cadre à occuper (0-1). */
  fill?: number;
  children: React.ReactNode;
}

/**
 * Met à l'échelle le contenu d'une scène pour qu'il occupe ~94 % du cadre vidéo,
 * afin d'éviter les grandes marges vides (illisibles sur mobile).
 */
export const FitScene: React.FC<FitSceneProps> = ({
  designWidth,
  designHeight,
  fill = 0.8,
  children,
}) => {
  const { width, height } = useVideoConfig();
  const scale = Math.min((width * fill) / designWidth, (height * fill) / designHeight);

  return (
    <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
      <div
        style={{
          width: designWidth,
          height: designHeight,
          transform: `scale(${scale})`,
          transformOrigin: "center center",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

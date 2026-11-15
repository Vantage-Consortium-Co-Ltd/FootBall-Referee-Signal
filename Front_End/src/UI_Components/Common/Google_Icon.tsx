"use client";

import React from "react";

export interface GoogleIconProps extends React.HTMLAttributes<HTMLSpanElement> {
  name: string;
  size?: number | string;
  filled?: boolean;
  weight?: 100 | 200 | 300 | 400 | 500 | 600 | 700;
  className?: string;
}

/**
 * Google Font Icon Component (Material Symbols Outlined)
 * Unified iconography across Football Referee Academy platform
 */
export const Google_Icon: React.FC<GoogleIconProps> = ({
  name,
  size = 20,
  filled = false,
  weight = 400,
  className = "",
  style,
  ...rest
}) => {
  const pixelSize = typeof size === "number" ? `${size}px` : size;

  const fontVariation = `'FILL' ${filled ? 1 : 0}, 'wght' ${weight}, 'GRAD' 0, 'opsz' 24`;

  return (
    <span
      className={`material-symbols-outlined select-none shrink-0 inline-flex items-center justify-center leading-none ${className}`}
      style={{
        fontSize: pixelSize,
        width: pixelSize,
        height: pixelSize,
        fontVariationSettings: fontVariation,
        verticalAlign: "middle",
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    >
      {name}
    </span>
  );
};

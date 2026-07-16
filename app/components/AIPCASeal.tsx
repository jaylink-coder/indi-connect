"use client";

import { useId } from "react";
import { CrossGlyph } from "./CrossGlyph";

type AIPCASealProps = {
  size?: number;
  className?: string;
};

/**
 * A redrawn, original rendering of AIPCA's own circular seal - the
 * encircling "AFRICAN INDEPENDENT PENTECOSTAL / CHURCH OF AFRICA" text
 * around the three-bar cross - built as scalable, brand-colored SVG
 * rather than embedding a raster copy of the source images.
 *
 * The ring text uses two separate arcs (top, bottom) rather than one
 * path wrapped around the full circle - a single full-circle path
 * renders the bottom half of the text upside down.
 */
export function AIPCASeal({ size = 200, className = "" }: AIPCASealProps) {
  const uid = useId();
  const topId = `seal-arc-top-${uid}`;
  const bottomId = `seal-arc-bottom-${uid}`;

  return (
    <svg viewBox="0 0 220 220" width={size} height={size} className={className} role="img" aria-label="AIPCA seal">
      <circle cx="110" cy="110" r="104" fill="#FDFBF3" stroke="#D4AF37" strokeWidth="2.5" />
      <circle cx="110" cy="110" r="86" fill="none" stroke="#D4AF37" strokeWidth="1.2" opacity="0.65" />
      <path id={topId} d="M 22 110 A 88 88 0 0 1 198 110" fill="none" />
      <path id={bottomId} d="M 22 130 A 88 88 0 0 0 198 130" fill="none" />
      <text fontSize="11" fontWeight="700" letterSpacing="1.6" fill="#024424">
        <textPath href={`#${topId}`} startOffset="50%" textAnchor="middle">
          AFRICAN INDEPENDENT PENTECOSTAL
        </textPath>
      </text>
      <text fontSize="11" fontWeight="700" letterSpacing="1.6" fill="#024424">
        <textPath href={`#${bottomId}`} startOffset="50%" textAnchor="middle">
          CHURCH OF AFRICA
        </textPath>
      </text>
      <g transform="translate(110,112) scale(0.66) translate(-50,-77)">
        <CrossGlyph fill="#024424" />
      </g>
    </svg>
  );
}

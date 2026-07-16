type CrossGlyphProps = {
  fill?: string;
};

/**
 * The three-bar cross (short top bar, long middle bar, slanted footrest
 * bar) used across AIPCA's own emblem, seals, and vestments - redrawn
 * as an original scalable mark rather than embedding any of the
 * reference images directly. viewBox is 0 0 100 150.
 */
export function CrossGlyph({ fill = "#D4AF37" }: CrossGlyphProps) {
  return (
    <g fill={fill}>
      <rect x="43" y="4" width="14" height="142" rx="1" />
      <rect x="27" y="26" width="46" height="12" rx="1" />
      <rect x="6" y="63" width="88" height="15" rx="1" />
      <g transform="rotate(-22 50 108)">
        <rect x="24" y="102" width="52" height="12" rx="1" />
        <rect x="20" y="98" width="10" height="10" transform="rotate(45 25 103)" />
        <rect x="70" y="98" width="10" height="10" transform="rotate(45 75 103)" />
      </g>
      <rect x="45" y="-1" width="10" height="10" transform="rotate(45 50 4)" />
      <rect x="45" y="141" width="10" height="10" transform="rotate(45 50 146)" />
      <rect x="22" y="27" width="10" height="10" transform="rotate(45 27 32)" />
      <rect x="68" y="27" width="10" height="10" transform="rotate(45 73 32)" />
      <rect x="1" y="65.5" width="10" height="10" transform="rotate(45 6 70.5)" />
      <rect x="89" y="65.5" width="10" height="10" transform="rotate(45 94 70.5)" />
    </g>
  );
}

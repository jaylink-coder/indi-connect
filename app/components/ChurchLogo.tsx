import { CrossGlyph } from "./CrossGlyph";

type ChurchLogoProps = {
  className?: string;
  showText?: boolean;
  tone?: "light" | "dark";
};

export function ChurchLogo({ className = "", showText = true, tone = "light" }: ChurchLogoProps) {
  const nameColor = tone === "dark" ? "text-white" : "text-[#024424]";

  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-[#024424] shadow-sm">
        <svg viewBox="0 0 100 150" className="h-8 w-8" aria-hidden="true">
          <CrossGlyph fill="#D4AF37" />
        </svg>
      </div>
      {showText ? (
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">AIPCA</span>
          <span className={`text-sm font-black ${nameColor}`}>Indi Connect</span>
        </div>
      ) : null}
    </div>
  );
}

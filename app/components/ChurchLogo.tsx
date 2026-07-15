type ChurchLogoProps = {
  className?: string;
  showText?: boolean;
};

export function ChurchLogo({ className = "", showText = true }: ChurchLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-[#024424] shadow-sm">
        <svg viewBox="0 0 64 64" className="h-7 w-7 text-white" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <rect x="8" y="8" width="48" height="48" rx="12" fill="#024424" stroke="#D4AF37" strokeWidth="2" />
          <path d="M32 16V48" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M16 32H48" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" />
          <path d="M24 24L40 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M40 24L24 40" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      </div>
      {showText ? (
        <div className="flex flex-col">
          <span className="text-[10px] font-semibold uppercase tracking-[0.3em] text-[#D4AF37]">AIPCA</span>
          <span className="text-sm font-black text-[#024424]">Indi Connect</span>
        </div>
      ) : null}
    </div>
  );
}

type ChurchLogoProps = {
  className?: string;
  showText?: boolean;
};

export function ChurchLogo({ className = "", showText = true }: ChurchLogoProps) {
  return (
    <div className={`inline-flex items-center gap-3 ${className}`}>
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#D4AF37] bg-[#024424] shadow-sm">
        <svg viewBox="0 0 64 64" className="h-7 w-7 text-[#D4AF37]" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
          <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.5" />
          <path d="M32 10V54" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
          <path d="M18 24H46" stroke="currentColor" strokeWidth="4.5" strokeLinecap="round" />
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

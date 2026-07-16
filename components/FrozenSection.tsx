import type { ReactNode } from "react";
import { Lock } from "lucide-react";

/**
 * Renders `children` normally when `allowed` is true; otherwise renders the
 * same content visibly but disabled/greyed-out with a lock badge, per the
 * product rule: sections a role can't reach stay visible-but-frozen, never
 * hidden outright.
 */
export function FrozenSection({ allowed, label, children }: { allowed: boolean; label: string; children: ReactNode }) {
  if (allowed) return <>{children}</>;

  return (
    <div className="relative">
      <div className="pointer-events-none select-none opacity-40 blur-[1px]">{children}</div>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-white/60">
        <Lock size={20} className="text-gray-500" />
        <p className="text-xs font-semibold text-gray-500">{label} is frozen for your role</p>
      </div>
    </div>
  );
}

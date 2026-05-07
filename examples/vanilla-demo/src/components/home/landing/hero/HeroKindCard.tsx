import type { GlobeKind, StarfieldConfig, ThemePresetName } from '@your-globe/core';
import { DecorationGlobe } from '@/components/shared';
import { cn } from '@/lib/utils';

const NO_STARS: StarfieldConfig = { enabled: false };

export interface HeroKindCardProps {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
  readonly label: string;
  readonly caption: string;
  readonly active: boolean;
  readonly accent: string;
  readonly onClick: () => void;
}

export function HeroKindCard({
  kind,
  theme,
  label,
  caption,
  active,
  accent,
  onClick,
}: HeroKindCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group grid grid-cols-[68px_1fr] items-center gap-3 rounded-2xl border bg-white/[0.035] p-2.5 text-left backdrop-blur-xl transition-all duration-300',
        active
          ? 'shadow-[0_0_34px_-14px_currentColor,inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-white/[0.12] hover:border-white/25 hover:bg-white/[0.055]',
      )}
      style={
        active
          ? { borderColor: `${accent}b0`, color: accent }
          : undefined
      }
    >
      <span className="relative block size-[60px] overflow-hidden rounded-xl border border-white/[0.1] bg-black/35">
        <DecorationGlobe
          kind={kind}
          theme={theme}
          speed={0.012}
          initialLat={12}
          initialLng={kind === 'paper' ? -30 : -44}
          starfield={NO_STARS}
          atmosphere
          framingPadding={0.04}
          className="absolute inset-0"
        />
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-400">{caption}</span>
      </span>
    </button>
  );
}

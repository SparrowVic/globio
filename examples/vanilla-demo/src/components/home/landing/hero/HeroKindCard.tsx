import type { CSSProperties } from 'react';
import type { GlobeKind } from '@your-globe/core';
import { cn } from '@/lib/utils';

export interface HeroKindCardProps {
  readonly kind: GlobeKind;
  readonly label: string;
  readonly caption: string;
  readonly active: boolean;
  readonly accent: string;
  readonly onClick: () => void;
}

export function HeroKindCard({
  kind,
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
      <KindStaticPreview kind={kind} accent={accent} />
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-400">{caption}</span>
      </span>
    </button>
  );
}

function KindStaticPreview({
  kind,
  accent,
}: {
  readonly kind: GlobeKind;
  readonly accent: string;
}) {
  const style = {
    background:
      kind === 'paper'
        ? `radial-gradient(circle at 38% 32%, ${accent}80, transparent 30%), linear-gradient(135deg, #6f5a31, #1b160f)`
        : `radial-gradient(circle at 35% 28%, ${accent}75, transparent 30%), radial-gradient(circle at 65% 70%, ${accent}2e, transparent 34%), linear-gradient(145deg, #101827, #030712)`,
    borderColor: `${accent}44`,
    boxShadow: `inset 0 1px 0 rgba(255,255,255,0.08), 0 0 24px -14px ${accent}`,
  } satisfies CSSProperties;

  return (
    <span
      className="relative block size-[60px] overflow-hidden rounded-xl border bg-black/35"
      style={style}
      aria-hidden="true"
    >
      <span className="absolute inset-[9px] rounded-full border border-white/15" />
      {kind === 'dotted' ? (
        <span
          className="absolute inset-3 rounded-full opacity-80"
          style={{
            backgroundImage: `radial-gradient(circle, ${accent} 1px, transparent 1.5px)`,
            backgroundSize: '6px 6px',
          }}
        />
      ) : null}
      {kind === 'wireframe' ? (
        <span
          className="absolute inset-3 rounded-full opacity-75"
          style={{
            backgroundImage: `linear-gradient(${accent}55 1px, transparent 1px), linear-gradient(90deg, ${accent}55 1px, transparent 1px)`,
            backgroundSize: '9px 9px',
          }}
        />
      ) : null}
      {kind === 'hologram' ? (
        <span
          className="absolute inset-2 rounded-full opacity-75"
          style={{
            backgroundImage: `repeating-linear-gradient(0deg, transparent 0 5px, ${accent}66 5px 6px)`,
          }}
        />
      ) : null}
      {kind === 'paper' ? (
        <span
          className="absolute inset-2 rounded-full opacity-70"
          style={{
            backgroundImage:
              'repeating-linear-gradient(28deg, transparent 0 5px, rgba(255,255,255,0.16) 5px 6px)',
          }}
        />
      ) : null}
      {kind === 'outline' ? (
        <span
          className="absolute left-3 right-3 top-1/2 h-px -translate-y-1/2 rotate-[-24deg]"
          style={{ background: accent, boxShadow: `0 0 10px ${accent}` }}
        />
      ) : null}
      <span
        className="absolute bottom-2 right-2 size-2 rounded-full"
        style={{ background: accent, boxShadow: `0 0 12px ${accent}` }}
      />
    </span>
  );
}

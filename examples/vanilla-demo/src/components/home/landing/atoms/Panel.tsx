import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PanelProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
  readonly accent?: 'amber' | 'cyan' | 'violet' | 'rose' | 'emerald' | 'paper';
}

const ACCENT_RADIAL: Record<NonNullable<PanelProps['accent']>, string> = {
  amber:
    'radial-gradient(circle at 18% 10%, rgba(251,191,36,0.10), transparent 28%), radial-gradient(circle at 90% 20%, rgba(34,211,238,0.10), transparent 28%)',
  cyan:
    'radial-gradient(circle at 18% 10%, rgba(34,211,238,0.12), transparent 28%), radial-gradient(circle at 90% 20%, rgba(251,191,36,0.08), transparent 28%)',
  violet:
    'radial-gradient(circle at 18% 10%, rgba(167,139,250,0.12), transparent 28%), radial-gradient(circle at 90% 20%, rgba(244,114,182,0.08), transparent 28%)',
  rose:
    'radial-gradient(circle at 18% 10%, rgba(244,114,182,0.12), transparent 28%), radial-gradient(circle at 90% 20%, rgba(251,191,36,0.08), transparent 28%)',
  emerald:
    'radial-gradient(circle at 18% 10%, rgba(110,231,183,0.10), transparent 28%), radial-gradient(circle at 90% 20%, rgba(34,211,238,0.08), transparent 28%)',
  paper:
    'radial-gradient(circle at 18% 10%, rgba(242,193,91,0.12), transparent 28%), radial-gradient(circle at 90% 20%, rgba(251,191,36,0.08), transparent 28%)',
};

export function Panel({ children, className, id, accent = 'amber' }: PanelProps) {
  return (
    <div
      id={id}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[#07111c]/72 shadow-[0_24px_80px_-55px_rgba(34,211,238,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: ACCENT_RADIAL[accent] }}
      />
      {children}
    </div>
  );
}

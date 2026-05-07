import { cn } from '@/lib/utils';

export interface ThemeSwatchProps {
  readonly color: string;
  readonly label: string;
  readonly active?: boolean;
  readonly onClick?: () => void;
  readonly size?: 'sm' | 'md';
}

export function ThemeSwatch({ color, label, active, onClick, size = 'md' }: ThemeSwatchProps) {
  const dim = size === 'sm' ? 'size-6' : 'size-8';
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'relative rounded-full border transition-all duration-200',
        dim,
        active
          ? 'scale-110 border-white/45 shadow-[0_0_22px_-4px_currentColor]'
          : 'border-white/[0.12] hover:scale-105 hover:border-white/30',
      )}
      style={{ background: color, color }}
    >
      {active && <span className="absolute inset-1 rounded-full ring-2 ring-white/60" />}
    </button>
  );
}

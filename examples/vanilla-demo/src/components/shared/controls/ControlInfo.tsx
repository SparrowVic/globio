import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export interface ControlLabelProps {
  readonly label: string;
  readonly info?: ReactNode | undefined;
  readonly disabledReason?: ReactNode | undefined;
  readonly className?: string | undefined;
}

export function ControlLabel({
  label,
  info,
  disabledReason,
  className,
}: ControlLabelProps) {
  const tooltip = disabledReason ?? info;
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <Label className="truncate text-[12px] font-medium leading-none text-slate-300">
        {label}
      </Label>
      {tooltip ? (
        <ControlInfoTooltip tone={disabledReason ? 'warning' : 'neutral'}>
          {tooltip}
        </ControlInfoTooltip>
      ) : null}
    </div>
  );
}

export function ControlInfoTooltip({
  children,
  tone = 'neutral',
}: {
  readonly children: ReactNode;
  readonly tone?: 'neutral' | 'warning';
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className={cn(
            'flex size-4 shrink-0 cursor-help items-center justify-center rounded-full transition-colors',
            tone === 'warning'
              ? 'text-amber-200/90 hover:bg-amber-300/10 hover:text-amber-100'
              : 'text-slate-500 hover:bg-white/[0.055] hover:text-slate-200'
          )}
          aria-label={tone === 'warning' ? 'Why is this disabled?' : 'More info'}
        >
          <Info className="size-3.5" />
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={7}
        className="max-w-[280px] rounded-lg border border-white/10 bg-[#08101f]/95 px-3.5 py-2.5 text-[11.5px] leading-snug text-slate-200 shadow-[0_18px_44px_-18px_rgba(0,0,0,0.85),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl"
        arrowClassName="bg-[#08101f] fill-[#08101f]"
      >
        {children}
      </TooltipContent>
    </Tooltip>
  );
}

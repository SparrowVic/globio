import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { FeatureTip, resolveFeature } from '@/components/shared/components/FeatureTip';
import { Label } from '@/components/ui/label';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import { useFeatureScope } from './feature-scope';

/** Props every control forwards so its label can show the right help tip. */
export interface FeatureProps {
  /** Registry id of the feature this control belongs to. Overrides the enclosing scope. */
  readonly feature?: string | undefined;
  /** The GlobeConfig key this control edits, e.g. `atmosphere.power`. Picks the feature and shows the key's type and default. */
  readonly configPath?: string | undefined;
}

export interface ControlLabelProps extends FeatureProps {
  readonly label: string;
  readonly info?: ReactNode | undefined;
  readonly disabledReason?: ReactNode | undefined;
  readonly className?: string | undefined;
}

/**
 * Label row of every control. The glyph next to the label is, in order of
 * precedence: the reason the control is disabled, the feature help card
 * (when a feature resolves from the control or its scope), or the plain
 * info tooltip.
 */
export function ControlLabel({
  label,
  info,
  disabledReason,
  feature,
  configPath,
  className,
}: ControlLabelProps) {
  const scope = useFeatureScope();
  const resolved = resolveFeature({ feature, configPath, scopeFeature: scope?.feature });
  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <Label className="truncate text-[12px] font-medium leading-none text-slate-300">
        {label}
      </Label>
      {disabledReason ? (
        <ControlInfoTooltip tone="warning">{disabledReason}</ControlInfoTooltip>
      ) : resolved ? (
        <FeatureTip feature={resolved} configPath={configPath ?? scope?.configPath} label={label} note={info} />
      ) : info ? (
        <ControlInfoTooltip tone="neutral">{info}</ControlInfoTooltip>
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

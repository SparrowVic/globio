import { Info } from 'lucide-react';
import type { ReactNode } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Conditional disable / hide wrapper. Wraps any control (or a whole
 * cluster of controls) and applies a visible-but-inert state when
 * `when` is falsy, with a tooltip explaining the prerequisite.
 *
 *   <DependsOn when={settings.autoRotate} because="Enable Auto rotate first">
 *     <SliderField label="Rotate speed" ... />
 *   </DependsOn>
 *
 * `variant`:
 *   - 'dim' (default) — opacity-50 + pointer-events-none + (i) icon hint
 *     in the corner. Keeps the control visible so the user can see what
 *     they could unlock.
 *   - 'hidden'        — removes from DOM. Reserve for "this control
 *     doesn't apply to the current chart-type" semantics where keeping
 *     it would be misleading rather than just inactive.
 *
 * **Sticky values are intentional.** A disabled field's value stays put
 * in the underlying state — when the prereq comes back, the field reads
 * the value the user last set, not a "neutral" reset. This matches the
 * standard form-control mental model: turning auto-rotate off and on
 * again should restore your prior speed, not snap to zero. If a specific
 * field needs reset-on-disable semantics, the caller does that explicitly
 * in its onChange handler, not via this wrapper.
 */
export interface DependsOnProps {
  readonly when: boolean;
  readonly because?: string;
  readonly variant?: 'dim' | 'hidden';
  /**
   * Classes applied to the inner wrapper around children when dimmed.
   * Use this to replicate the parent's vertical spacing (e.g. `space-y-4`)
   * — without it, dim-mode collapses the children into one DOM element and
   * any `space-y-*` on the parent stops applying *between* the children,
   * making the form jump when toggling the master switch on/off.
   */
  readonly className?: string;
  readonly children: ReactNode;
}

export function DependsOn({
  when,
  because,
  variant = 'dim',
  className,
  children,
}: DependsOnProps) {
  if (when) return <>{children}</>;
  if (variant === 'hidden') return null;
  return (
    <div className="relative">
      <div className={cn('pointer-events-none opacity-50', className)}>{children}</div>
      {because ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span
              className={cn(
                'absolute right-1 top-1 flex size-5 cursor-help items-center justify-center rounded-full',
                'border border-amber-300/40 bg-slate-900/80 text-amber-200 shadow-sm',
              )}
              aria-label="Why is this disabled?"
              role="img"
            >
              <Info className="size-3" />
            </span>
          </TooltipTrigger>
          <TooltipContent side="left" sideOffset={6} className="max-w-[240px] text-xs">
            {because}
          </TooltipContent>
        </Tooltip>
      ) : null}
    </div>
  );
}

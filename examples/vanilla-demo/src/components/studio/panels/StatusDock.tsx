import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChevronDown,
  faCircleCheck,
  faCircleSmall,
  faCopy,
  faFileCode,
  faWaveform,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePanelState } from '@/hooks/usePanelState';
import { cn } from '@/lib/utils';
import type { RuntimeStatus } from '@/configurator/types';

export interface StatusDockProps {
  readonly status: RuntimeStatus;
  readonly exportedJson: string;
}

/**
 * Bottom-centred status dock — slim by default (one line: ready badge,
 * runtime message, hover tooltip mirror, dataset summary), expandable
 * to a details panel with the exported JSON for power users.
 *
 * Restyled to match the home page / new top bar — floating glass pill
 * with iridescent edge sheen, FA Sharp Duotone icons, animated chevron
 * for expand/collapse. Status pulse uses an emerald ping when the globe
 * is ready, amber when still booting.
 */
export function StatusDock({ status, exportedJson }: StatusDockProps) {
  const [expanded, setExpanded] = usePanelState('panel-status', false);

  const copyJson = (): void => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(exportedJson);
  };

  return (
    <footer className="pointer-events-none fixed inset-x-0 bottom-0 z-28 flex justify-center px-3 pb-3">
      <div
        className={cn(
          'pointer-events-auto relative w-full overflow-hidden rounded-full border border-white/[0.08] backdrop-blur-2xl backdrop-saturate-150',
          'bg-white/[0.04] shadow-[0_18px_60px_-18px_rgba(0,0,0,0.65),inset_0_1px_0_0_rgba(255,255,255,0.06)]',
          'transition-[border-radius,max-height] duration-300',
          expanded ? 'max-w-[820px] !rounded-2xl' : 'max-w-[720px]',
        )}
      >
        {/* Iridescent edge — same as the top bar so the chrome matches. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-40 [mask:linear-gradient(white,transparent_70%)]"
          style={{
            background:
              'linear-gradient(120deg, rgba(255,200,90,0.12) 0%, rgba(255,255,255,0) 35%, rgba(120,180,255,0.10) 70%, rgba(255,255,255,0) 100%)',
          }}
        />

        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          className="relative flex w-full items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-white/[0.025]"
        >
          {/* Ready badge with double-pulse when live. */}
          <span
            className={cn(
              'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2 py-0.5 font-mono text-[9px] uppercase tracking-[0.18em]',
              status.ready
                ? 'border-emerald-300/30 bg-emerald-300/[0.08] text-emerald-200'
                : 'border-amber-300/30 bg-amber-300/[0.06] text-amber-200',
            )}
          >
            <span className="relative flex size-1.5">
              <span
                className={cn(
                  'absolute inline-flex size-full animate-ping rounded-full opacity-70',
                  status.ready ? 'bg-emerald-400' : 'bg-amber-400',
                )}
              />
              <span
                className={cn(
                  'relative inline-flex size-1.5 rounded-full',
                  status.ready ? 'bg-emerald-400' : 'bg-amber-400',
                )}
              />
            </span>
            {status.ready ? 'live' : 'booting'}
          </span>

          {/* Runtime message — what the globe last reported. */}
          <span className="flex shrink-0 items-center gap-1.5 text-[12px] text-slate-100">
            <FontAwesomeIcon icon={faWaveform} className="size-3 text-slate-400" />
            <span className="max-w-[180px] truncate">{status.message}</span>
          </span>

          <span aria-hidden="true" className="h-3 w-px bg-white/[0.08]" />

          {/* Hover state — what's under the cursor on the globe. Variable
              width so it absorbs whatever's left after the fixed-width
              status / message / summary blocks claim their space. */}
          <span className="min-w-0 flex-1 truncate text-[12px] text-slate-300">
            {status.hover}
          </span>

          <span aria-hidden="true" className="hidden h-3 w-px bg-white/[0.08] md:block" />

          {/* Dataset summary — counts / resolutions / etc. Hidden on
              narrow viewports so the line stays one row. */}
          <span className="hidden max-w-[220px] shrink-0 truncate text-[11px] text-slate-400 md:inline">
            {status.dataSummary}
          </span>

          <FontAwesomeIcon
            icon={faChevronDown}
            className={cn(
              'size-3 shrink-0 text-slate-400 transition-transform duration-300',
              expanded ? 'rotate-180' : '',
            )}
          />
        </button>

        {expanded && (
          <div className="relative border-t border-white/[0.06] bg-black/[0.18] px-4 pb-3 pt-3">
            <div className="grid grid-cols-1 gap-3 text-xs text-slate-300 md:grid-cols-3">
              <DetailCell label="Active layer" value={status.layerSummary} icon={faCircleCheck} />
              <DetailCell label="Last hover" value={status.hover} icon={faCircleSmall} />
              <DetailCell label="Dataset" value={status.dataSummary} icon={faWaveform} />
            </div>
            <div className="mt-3">
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
                <FontAwesomeIcon icon={faFileCode} className="size-3 text-rose-200" />
                <span>Config JSON</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-200 transition-colors hover:border-white/20 hover:bg-white/[0.08]"
                      onClick={copyJson}
                    >
                      <FontAwesomeIcon icon={faCopy} className="size-2.5" />
                      Copy
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>Copy JSON to clipboard</TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                value={exportedJson}
                readOnly
                className="mt-2 h-[120px] resize-none rounded-md border-white/10 bg-black/30 font-mono text-[10px] leading-4 text-slate-300"
              />
            </div>
          </div>
        )}
      </div>
    </footer>
  );
}

function DetailCell({
  label,
  value,
  icon,
}: {
  readonly label: string;
  readonly value: string;
  readonly icon: typeof faCircleCheck;
}) {
  return (
    <div className="rounded-lg border border-white/[0.05] bg-white/[0.015] p-2.5">
      <div className="flex items-center gap-1.5 text-[9px] uppercase tracking-[0.18em] text-slate-500">
        <FontAwesomeIcon icon={icon} className="size-2.5" />
        {label}
      </div>
      <div className="mt-1 truncate text-[11.5px] text-slate-200">{value}</div>
    </div>
  );
}

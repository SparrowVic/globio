import { Activity, ChevronDown, Copy, FileJson } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { usePanelState } from '@/hooks/usePanelState';
import { cn } from '@/lib/utils';
import type { RuntimeStatus } from '@/configurator/types';

/**
 * Bottom-centred status dock — slim by default (one line: status badge,
 * hover text, FPS-ish summary), expandable to a details panel with the
 * exported JSON. Sits in its own glass surface (not via `<Panel>`)
 * because its slim mode is shorter than a panel header would allow.
 */
export function StatusDock({
  status,
  exportedJson,
}: {
  readonly status: RuntimeStatus;
  readonly exportedJson: string;
}) {
  const [expanded, setExpanded] = usePanelState('panel-status', false);

  const copyJson = (): void => {
    if (!navigator.clipboard) return;
    void navigator.clipboard.writeText(exportedJson);
  };

  return (
    <footer
      className={cn('status-dock', expanded ? 'status-dock-expanded' : 'status-dock-slim')}
    >
      <button
        type="button"
        className="status-dock-line"
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
      >
        <span className="status-dock-pulse">
          <Activity className="size-3.5 text-emerald-200" />
          <Badge
            className={cn(
              'rounded-md border-white/10 bg-white/[0.04] px-2 py-0 text-[10px] uppercase tracking-wide text-slate-200',
              status.ready ? 'text-emerald-200' : 'text-amber-200',
            )}
          >
            {status.ready ? 'ready' : 'loading'}
          </Badge>
        </span>
        <span className="status-dock-message truncate">{status.message}</span>
        <span className="status-dock-divider" aria-hidden />
        <span className="status-dock-hover truncate">{status.hover}</span>
        <span className="status-dock-divider" aria-hidden />
        <span className="status-dock-summary truncate text-xs text-slate-400">
          {status.dataSummary}
        </span>
        <ChevronDown
          className={cn(
            'status-dock-chevron size-4 shrink-0 text-slate-400',
            expanded ? '' : 'rotate-180',
          )}
        />
      </button>

      {expanded ? (
        <div className="status-dock-details">
          <div className="grid grid-cols-1 gap-2 text-xs text-slate-300 md:grid-cols-2">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Layer</div>
              <div className="mt-0.5">{status.layerSummary}</div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wide text-slate-500">Last hover</div>
              <div className="mt-0.5 truncate">{status.hover}</div>
            </div>
          </div>
          <div className="mt-3">
            <div className="flex items-center gap-2 text-[10px] uppercase tracking-wide text-slate-500">
              <FileJson className="size-3 text-rose-200" />
              <span>Config JSON</span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    className="ml-auto inline-flex items-center gap-1 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[10px] text-slate-200 hover:bg-white/[0.08]"
                    onClick={copyJson}
                  >
                    <Copy className="size-3" /> Copy
                  </button>
                </TooltipTrigger>
                <TooltipContent>Copy JSON to clipboard</TooltipContent>
              </Tooltip>
            </div>
            <Textarea
              value={exportedJson}
              readOnly
              className="mt-2 h-[120px] resize-none border-white/10 bg-black/25 font-mono text-[10px] leading-4 text-slate-300"
            />
          </div>
        </div>
      ) : null}
    </footer>
  );
}

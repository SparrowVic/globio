import type { ReactNode } from 'react';
import { Download, Home, Play, RotateCcw, Settings2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { configuratorPresets } from '@/configurator/defaults';
import type { ConfiguratorState } from '@/configurator/types';

/**
 * Slim 44px-tall command strip pinned to the top of the viewport.
 * Fields it carries (left → right):
 *   - app glyph (Settings2)
 *   - "Globio" wordmark
 *   - preset selector (centered)
 *   - 4 icon-only action buttons (Replay, Home, Export, Reset)
 *
 * Status / current-state info used to live here as a sub-title; that
 * moved to per-panel badges so the bar stays one-line.
 */
export function TopCommandBar({
  state: _state,
  onPreset,
  onReplay,
  onHome,
  onExport,
  onReset,
}: {
  readonly state: ConfiguratorState;
  readonly onPreset: (id: string) => void;
  readonly onReplay: () => void;
  readonly onHome: () => void;
  readonly onExport: () => void;
  readonly onReset: () => void;
}) {
  return (
    <header className="top-command">
      <div className="flex min-w-0 shrink-0 items-center gap-2.5">
        <div className="flex size-7 shrink-0 items-center justify-center rounded-md border border-white/10 bg-white/[0.04]">
          <Settings2 className="size-3.5 text-amber-200" />
        </div>
        <div className="truncate text-sm font-semibold text-slate-50">Globio</div>
      </div>

      <div className="flex min-w-0 flex-1 items-center justify-center">
        <Select onValueChange={onPreset}>
          <SelectTrigger className="h-7 w-[200px] border-white/10 bg-white/[0.04] text-xs text-slate-100">
            <SelectValue placeholder="Apply preset…" />
          </SelectTrigger>
          <SelectContent className="border-white/10 bg-slate-950 text-slate-100">
            {configuratorPresets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id} className="text-xs">
                {preset.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Replay animation" onClick={onReplay}>
          <Play className="size-3.5" />
        </IconButton>
        <IconButton label="Reset camera" onClick={onHome}>
          <Home className="size-3.5" />
        </IconButton>
        <IconButton label="Export JSON" onClick={onExport}>
          <Download className="size-3.5" />
        </IconButton>
        <IconButton label="Reset configurator" onClick={onReset}>
          <RotateCcw className="size-3.5" />
        </IconButton>
      </div>
    </header>
  );
}

function IconButton({
  label,
  children,
  onClick,
}: {
  readonly label: string;
  readonly children: ReactNode;
  readonly onClick: () => void;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="size-7 border-white/10 bg-white/[0.04] text-slate-100 hover:bg-white/[0.09]"
          onClick={onClick}
          aria-label={label}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent sideOffset={6}>{label}</TooltipContent>
    </Tooltip>
  );
}

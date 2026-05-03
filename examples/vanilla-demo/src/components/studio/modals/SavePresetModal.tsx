import { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBookmark } from '@fortawesome/sharp-duotone-solid-svg-icons';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  presetFromState,
  saveCustomPreset,
  type CustomPreset,
} from '@/lib/custom-presets';
import type { ConfiguratorState } from '@/configurator/types';

/**
 * Tiny modal for naming + saving the current configurator state as a
 * reusable preset. No tokens / per-field knobs here — preset captures
 * the whole snapshot so the form is just "name it".
 */
export function SavePresetModal({
  open,
  onOpenChange,
  state,
  onSaved,
}: {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly state: ConfiguratorState;
  readonly onSaved: (preset: CustomPreset) => void;
}) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) {
      // Suggest a default name based on the layer + chartType / surface
      // so the user gets a useful starter rather than an empty input.
      const hint =
        state.activeLayer === 'charts'
          ? `${state.charts.chartType} on ${state.globe.kind}`
          : state.activeLayer === 'heatmap'
            ? `${state.heatmap.surfaceMode} heatmap`
            : state.activeLayer === 'hexbin'
              ? `${state.hexbin.aggregate} hexbin`
              : `${state.globe.kind} setup`;
      setName(hint);
    }
  }, [
    open,
    state.activeLayer,
    state.charts.chartType,
    state.heatmap.surfaceMode,
    state.hexbin.aggregate,
    state.globe.kind,
  ]);

  const canSave = name.trim().length > 0;

  const handleSave = (): void => {
    if (!canSave) return;
    const preset = presetFromState(name, state);
    saveCustomPreset(preset);
    onSaved(preset);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FontAwesomeIcon icon={faBookmark} className="size-3.5 text-amber-200" />
            <span>Save current as preset</span>
          </DialogTitle>
          <DialogDescription>
            Captures kind, theme, active layer, dataset, and animation timing.
            Lives in your browser via localStorage.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4">
          <div className="space-y-1.5">
            <Label
              htmlFor="custom-preset-name"
              className="text-[11px] uppercase tracking-wider text-slate-400"
            >
              Preset name
            </Label>
            <Input
              id="custom-preset-name"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Energy mix · stacked bars"
              autoFocus
              onKeyDown={(event) => {
                if (event.key === 'Enter') handleSave();
              }}
              className="h-8 border-white/10 bg-white/[0.04] text-slate-100"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 border-white/10 bg-white/[0.04]"
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={!canSave}
            className="h-8 bg-amber-300 text-slate-900 hover:bg-amber-200 disabled:opacity-40"
          >
            Save preset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

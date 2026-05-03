import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBookmark,
  faPenToSquare,
  faSparkles,
  faTrash,
} from '@fortawesome/sharp-duotone-solid-svg-icons';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { CustomTheme } from '@/lib/custom-themes';
import type { CustomPreset } from '@/lib/custom-presets';

/**
 * One modal that surfaces every saved custom artifact (themes + presets)
 * with rename / edit / delete actions. Tabs split themes from presets so
 * the table fits a reasonable width even when both lists are long.
 *
 * Themes link to the editor (CustomThemeModal in `editing` mode) via
 * `onEditTheme(theme)`; presets only support delete in v1 since "edit a
 * preset" would mean "apply it then re-save", which is already a single
 * dropdown click + Save current as preset.
 */
export interface ManageSavedModalProps {
  readonly open: boolean;
  readonly onOpenChange: (open: boolean) => void;
  readonly themes: ReadonlyArray<CustomTheme>;
  readonly presets: ReadonlyArray<CustomPreset>;
  readonly onEditTheme: (theme: CustomTheme) => void;
  readonly onDeleteTheme: (id: string) => void;
  readonly onDeletePreset: (id: string) => void;
}

export function ManageSavedModal({
  open,
  onOpenChange,
  themes,
  presets,
  onEditTheme,
  onDeleteTheme,
  onDeletePreset,
}: ManageSavedModalProps) {
  const [tab, setTab] = useState<'themes' | 'presets'>('themes');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Manage saved</DialogTitle>
          <DialogDescription>
            Custom themes and presets you've saved live in this browser. Edit a theme to
            re-open the builder pre-filled; delete to remove from the dropdown.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(next) => setTab(next as 'themes' | 'presets')} className="px-5 py-3">
          <TabsList className="bg-white/[0.04]">
            <TabsTrigger value="themes" className="gap-1.5 text-xs">
              <FontAwesomeIcon icon={faSparkles} className="size-3" />
              <span>Themes</span>
              <span className="ml-1 rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums">{themes.length}</span>
            </TabsTrigger>
            <TabsTrigger value="presets" className="gap-1.5 text-xs">
              <FontAwesomeIcon icon={faBookmark} className="size-3" />
              <span>Presets</span>
              <span className="ml-1 rounded-full bg-white/10 px-1.5 text-[10px] tabular-nums">{presets.length}</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="themes" className="mt-3">
            {themes.length === 0 ? (
              <EmptyState
                title="No custom themes yet"
                hint="Theme dropdown → Custom → + Create custom theme"
              />
            ) : (
              <ul className="divide-y divide-white/[0.06] rounded-md border border-white/[0.06]">
                {themes.map((theme) => (
                  <li key={theme.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-100">{theme.name}</div>
                      <div className="truncate text-[10px] text-slate-400">
                        based on {theme.extends} · saved {formatRelative(theme.createdAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            type="button"
                            variant="outline"
                            size="icon-sm"
                            className="size-7 border-white/10 bg-white/[0.04]"
                            onClick={() => {
                              onEditTheme(theme);
                              onOpenChange(false);
                            }}
                            aria-label={`Edit ${theme.name}`}
                          >
                            <FontAwesomeIcon icon={faPenToSquare} className="size-3" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Edit</TooltipContent>
                      </Tooltip>
                      <DeleteButton
                        label={theme.name}
                        onConfirm={() => onDeleteTheme(theme.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>

          <TabsContent value="presets" className="mt-3">
            {presets.length === 0 ? (
              <EmptyState
                title="No custom presets yet"
                hint="Preset dropdown → Save current as preset…"
              />
            ) : (
              <ul className="divide-y divide-white/[0.06] rounded-md border border-white/[0.06]">
                {presets.map((preset) => (
                  <li key={preset.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                    <div className="min-w-0">
                      <div className="truncate text-sm text-slate-100">{preset.name}</div>
                      <div className="truncate text-[10px] text-slate-400">
                        {preset.state.globe.kind} · {preset.state.activeLayer} · saved{' '}
                        {formatRelative(preset.createdAt)}
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <DeleteButton
                        label={preset.name}
                        onConfirm={() => onDeletePreset(preset.id)}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
            className="h-8 border-white/10 bg-white/[0.04]"
          >
            Done
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Two-step delete: first click arms the button (turns red, swaps icon to
 * a check-style "are you sure"); second click within 4s commits. Auto-
 * disarms after timeout so accidental hits don't linger.
 */
function DeleteButton({ label, onConfirm }: { readonly label: string; readonly onConfirm: () => void }) {
  const [armed, setArmed] = useState(false);

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={
            armed
              ? 'size-7 border-red-400/60 bg-red-500/20 text-red-200 hover:bg-red-500/30'
              : 'size-7 border-white/10 bg-white/[0.04] text-slate-300 hover:text-red-300'
          }
          onClick={() => {
            if (armed) {
              onConfirm();
              setArmed(false);
            } else {
              setArmed(true);
              setTimeout(() => setArmed(false), 4000);
            }
          }}
          aria-label={armed ? `Confirm delete ${label}` : `Delete ${label}`}
        >
          <FontAwesomeIcon icon={faTrash} className="size-3" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{armed ? 'Click again to confirm' : 'Delete'}</TooltipContent>
    </Tooltip>
  );
}

function EmptyState({ title, hint }: { readonly title: string; readonly hint: string }) {
  return (
    <div className="rounded-md border border-dashed border-white/[0.08] bg-white/[0.02] px-4 py-6 text-center text-sm text-slate-400">
      <div>{title}</div>
      <div className="mt-1 text-[11px] text-slate-500">{hint}</div>
    </div>
  );
}

const formatRelative = (timestamp: number): string => {
  const diffMs = Date.now() - timestamp;
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(timestamp).toLocaleDateString();
};

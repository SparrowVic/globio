import { useState, type ReactNode } from 'react';

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

import type { FeatureProps } from './ControlInfo';
import { Field, type DisableProps, type SelectOption } from './Field';

/**
 * Optgroup-style select used for Theme + Preset pickers — categories with
 * a label header, dividers between groups, and an optional footer slot per
 * group for action items (e.g. "+ Create custom theme"). The footer's
 * `onClick` gets invoked with the menu auto-dismissed first so the
 * downstream handler can open a modal without competing with Radix's own
 * close transition.
 */
export interface GroupedSelectGroup<T extends string = string> {
  readonly label: string;
  readonly options: ReadonlyArray<SelectOption<T>>;
  readonly footer?: {
    readonly content: ReactNode;
    readonly onClick: () => void;
  };
}

export interface GroupedSelectFieldProps<T extends string> extends DisableProps, FeatureProps {
  readonly label: string;
  readonly value?: T | undefined;
  readonly groups: ReadonlyArray<GroupedSelectGroup<T>>;
  readonly placeholder?: string;
  readonly onChange: (value: T) => void;
  readonly className?: string | undefined;
  readonly triggerClassName?: string | undefined;
  readonly contentClassName?: string | undefined;
  /**
   * Render only the trigger — no `Field` chrome around it. Use when the
   * select needs to sit inline with non-field UI (e.g. the top-bar pickers).
   */
  readonly hideLabel?: boolean;
}

export function GroupedSelectField<T extends string>({
  label,
  info,
  value,
  groups,
  placeholder,
  onChange,
  className,
  triggerClassName,
  contentClassName,
  hideLabel = false,
  disabled,
  disabledReason,
  feature,
  configPath,
  typePath,
}: GroupedSelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const trigger = (
    <Select
      disabled={disabled}
      open={open}
      onOpenChange={setOpen}
      {...(value !== undefined ? { value } : {})}
      onValueChange={(next) => onChange(next as T)}
    >
      <SelectTrigger
        aria-label={label}
        className={cn(
          'h-8 w-full border-white/10 bg-white/[0.04] text-slate-100',
          triggerClassName,
        )}
      >
        <SelectValue placeholder={placeholder ?? label} />
      </SelectTrigger>
      <SelectContent className={cn('border-white/10 bg-slate-950 text-slate-100', contentClassName)}>
        {groups.map((group, idx) => {
          const hasItems = group.options.length > 0;
          const hasFooter = Boolean(group.footer);
          if (!hasItems && !hasFooter) return null;
          return (
            <div key={`${group.label}-${idx}`}>
              {idx > 0 ? <SelectSeparator /> : null}
              <SelectGroup>
                {group.label ? (
                  <SelectLabel className="text-[10px] uppercase tracking-wide text-slate-400">
                    {group.label}
                  </SelectLabel>
                ) : null}
                {group.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
                {group.footer ? (
                  <div
                    role="button"
                    tabIndex={0}
                    onPointerDown={(event) => {
                      // Don't let Radix treat this as a SelectItem click.
                      event.preventDefault();
                      event.stopPropagation();
                      setOpen(false);
                      group.footer?.onClick();
                    }}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        setOpen(false);
                        group.footer?.onClick();
                      }
                    }}
                    className="mx-1 mt-1 cursor-pointer rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/60"
                  >
                    {group.footer.content}
                  </div>
                ) : null}
              </SelectGroup>
            </div>
          );
        })}
      </SelectContent>
    </Select>
  );

  if (hideLabel) {
    if (disabled && disabledReason) {
      return (
        <Tooltip>
          <TooltipTrigger asChild>
            <div className={cn('pointer-events-none opacity-50', className)}>{trigger}</div>
          </TooltipTrigger>
          <TooltipContent side="bottom" sideOffset={4} className="text-xs">
            {disabledReason}
          </TooltipContent>
        </Tooltip>
      );
    }
    return <div className={className}>{trigger}</div>;
  }
  return (
    <Field label={label} info={info} className={className} disabled={disabled} disabledReason={disabledReason} feature={feature} configPath={configPath} typePath={typePath}>
      {trigger}
    </Field>
  );
}

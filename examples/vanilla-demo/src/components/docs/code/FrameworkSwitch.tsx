import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { FRAMEWORKS, type FrameworkId } from '@/docs/frameworks';
import { cn } from '@/lib/utils';
import { useFramework } from './framework-context';

export interface FrameworkSwitchProps {
  /** Restrict the visible options (a code panel only lists the snippets it has). */
  readonly only?: ReadonlyArray<FrameworkId>;
  /** Highlight this option instead of the global choice (panel fallback). */
  readonly value?: FrameworkId;
  readonly onChange?: (id: FrameworkId) => void;
  readonly size?: 'sm' | 'md';
  readonly className?: string;
}

/**
 * Segmented control for the framework choice. Used standalone in the top
 * bar and inside every code panel header; both write the same global value.
 */
export function FrameworkSwitch({ only, value, onChange, size = 'md', className }: FrameworkSwitchProps) {
  const { framework, setFramework } = useFramework();
  const active = value ?? framework;
  const options = only ? FRAMEWORKS.filter((f) => only.includes(f.id)) : FRAMEWORKS;

  return (
    <div role="tablist" aria-label="Framework" className={cn('docs-seg', size === 'sm' && 'docs-seg-sm', className)}>
      {options.map((f) => (
        <button
          key={f.id}
          type="button"
          role="tab"
          aria-selected={active === f.id}
          onClick={() => {
            setFramework(f.id);
            onChange?.(f.id);
          }}
          className={cn('docs-seg-item', active === f.id && 'is-active')}
        >
          <FontAwesomeIcon icon={f.icon} className={size === 'sm' ? 'size-3' : 'size-3.5'} />
          <span>{f.label}</span>
        </button>
      ))}
    </div>
  );
}

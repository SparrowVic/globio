import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/** Numbered procedure. Use only when the order is real (install, then mount, then …). */
export function Steps({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return <ol className={cn('docs-steps', className)}>{children}</ol>;
}

export interface StepProps {
  readonly title: string;
  readonly children?: ReactNode;
}

export function Step({ title, children }: StepProps) {
  return (
    <li className="docs-step">
      <span className="docs-step-num" aria-hidden="true" />
      <div className="docs-step-body">
        <h4 className="docs-step-title">{title}</h4>
        {children}
      </div>
    </li>
  );
}

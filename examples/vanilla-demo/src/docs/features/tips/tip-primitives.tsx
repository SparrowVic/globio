import type { ReactNode } from 'react';

/** Shared bits for the illustrated tips: a caption line and a tiny legend. */
export function TipCaption({ children }: { readonly children: ReactNode }) {
  return <p className="feature-tip-caption">{children}</p>;
}

export const TIP_COLORS = {
  ink: '#e2e8f0',
  mist: '#94a3b8',
  atm: '#6fb4ff',
  ember: '#ff8a4c',
  hair: 'rgba(226, 232, 240, 0.16)',
} as const;

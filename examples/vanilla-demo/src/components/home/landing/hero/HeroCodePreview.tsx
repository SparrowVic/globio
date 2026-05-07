import type { GlobeKind, ThemePresetName } from '@your-globe/core';
import { CodeBlock } from '../atoms';

export interface HeroCodePreviewProps {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
}

export function HeroCodePreview({ kind, theme }: HeroCodePreviewProps) {
  const code = `import { createGlobe } from '@your-globe/core';

const globe = createGlobe({
  kind: '${kind}',
  theme: '${theme}',
  autoRotate: { enabled: true },
});

globe.mount();`;

  return (
    <div
      className="rounded-2xl border border-white/[0.12] bg-[#07111c]/85 p-3 backdrop-blur-xl"
      style={{
        boxShadow: '0 22px 70px -40px var(--hero-accent)',
        transition: 'box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <CodeBlock code={code} copy />
    </div>
  );
}

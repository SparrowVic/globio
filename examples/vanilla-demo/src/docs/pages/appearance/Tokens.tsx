import { Callout, DocPage, DocSection, TokenSwatches } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';

export function Tokens({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <Callout tone="note">Values shown are the resolved tokens of <code>outline-dark</code>. The content pass will list every preset's resolved set.</Callout>
      <DocSection title="Surface and background" eyebrow="background · globe">
        <TokenSwatches
          tokens={[
            { name: 'background.color', value: '#050608', description: 'Canvas clear colour when the globe is not transparent.' },
            { name: 'globe.surfaceColor', value: '#0d1420', description: 'Ocean and land base.' },
          ]}
        />
      </DocSection>
      <DocSection title="Countries" eyebrow="countries.*">
        <TokenSwatches
          tokens={[
            { name: 'countries.border.color', value: '#5b6b85' },
            { name: 'countries.border.width', value: 1 },
            { name: 'countries.border.opacity', value: 0.9 },
            { name: 'countries.borderHover.color', value: '#dcebff' },
            { name: 'countries.borderHover.glowColor', value: '#6fb4ff', description: 'Soft halo behind the hovered border.' },
            { name: 'countries.borderActive.color', value: '#ff8a4c' },
            { name: 'countries.fill.defaultColor', value: '#15181d', description: 'Fill for countries without data.' },
            { name: 'countries.fill.opacity', value: 0.85 },
          ]}
        />
      </DocSection>
      <DocSection title="Labels and tooltip" eyebrow="countries.label · tooltip">
        <TokenSwatches
          tokens={[
            { name: 'countries.label.color', value: '#dcebff' },
            { name: 'countries.label.fontSize', value: 12 },
            { name: 'countries.label.fontFamily', value: 'inherit' },
            { name: 'tooltip.backgroundColor', value: '#0b0e14' },
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

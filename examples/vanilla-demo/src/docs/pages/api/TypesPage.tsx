import { DEFAULT_TOKENS } from '@your-globe/core';
import { Callout, CodePanel, DocPage, DocSection, Types } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { COUNTRY_DATA, MARKERS, STORY, THEME_EXTEND } from '@/docs/snippets';
import type { FrameworkCode } from '@/docs/frameworks';

interface TypePageSpec {
  readonly lead: string;
  readonly example?: FrameworkCode;
  readonly sections: ReadonlyArray<{ readonly id: string; readonly title: string; readonly names: ReadonlyArray<string> }>;
}

const SPECS: Readonly<Record<string, TypePageSpec>> = {
  'api/markers-and-arcs': {
    lead: 'The three layer item types. Ids are stable identities for add, remove and events.',
    example: MARKERS,
    sections: [
      { id: 'markers', title: 'Markers', names: ['MarkerConfig', 'MarkerEvent'] },
      { id: 'html-markers', title: 'HTML markers', names: ['HtmlMarkerConfig'] },
      { id: 'arcs', title: 'Arcs', names: ['ArcConfig'] },
    ],
  },
  'api/story-types': {
    lead: 'A story is a list of scenes; each scene moves the camera, highlights a country and shows a popup for a duration.',
    example: STORY,
    sections: [
      { id: 'story', title: 'Story', names: ['StoryConfig', 'SceneConfig'] },
      { id: 'story-events', title: 'Events', names: ['StorySceneEvent', 'StoryCompleteEvent'] },
    ],
  },
  'api/scales': {
    lead: 'Scales map values to colours for country data and every data layer; legends render them.',
    example: COUNTRY_DATA,
    sections: [
      { id: 'scale', title: 'ScaleConfig', names: ['ScaleConfig', 'SequentialScale', 'DivergingScale', 'ThresholdScale', 'CategoricalScale'] },
      { id: 'palettes', title: 'Palettes', names: ['ScalePalette', 'ScalePaletteName'] },
      { id: 'legend', title: 'Legend', names: ['LegendOptions', 'LegendPosition', 'LegendStyle'] },
    ],
  },
  'api/theme-types': {
    lead: 'A theme is a preset name or a preset extended with token overrides; the resolved result is a complete token set.',
    example: THEME_EXTEND,
    sections: [
      { id: 'input', title: 'Theme input', names: ['ThemeInput', 'ThemeConfig', 'ThemePresetName', 'PartialTokenSet'] },
    ],
  },
};

export function TypesPage({ tab, group, page }: DocLocation) {
  const spec = SPECS[page.slug];
  if (!spec) return null;
  const tokenKeys = page.slug === 'api/theme-types' ? Object.keys(DEFAULT_TOKENS) : null;
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={spec.lead}>
      {spec.example && <CodePanel code={spec.example} />}
      {spec.sections.map((s) => (
        <DocSection key={s.id} id={s.id} title={s.title}>
          <Types names={s.names} />
        </DocSection>
      ))}
      {tokenKeys && (
        <DocSection title="TokenKey" id="token-key" lead={`The ${tokenKeys.length} token paths a theme may override. Values and defaults are on the tokens page.`}>
          <div className="docs-key-cloud">
            {tokenKeys.map((k) => (
              <code key={k}>{k}</code>
            ))}
          </div>
          <Callout tone="note">TypeScript validates token keys in typed config objects. Plain JavaScript receives no compile-time validation.</Callout>
        </DocSection>
      )}
    </DocPage>
  );
}

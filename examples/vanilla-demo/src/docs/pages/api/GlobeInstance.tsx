import { Callout, DocPage, DocSection, Methods, Pill } from '@/components/docs';
import { useApi } from '@/docs/api';
import type { DocLocation } from '@/docs/manifest';

const CATEGORIES: ReadonlyArray<{ readonly id: string; readonly title: string; readonly lead: string; readonly methods: ReadonlyArray<string> }> = [
  { id: 'lifecycle', title: 'Lifecycle', lead: 'Mount, patch, pause, resize, tear down.', methods: ['mount', 'destroy', 'update', 'resize', 'setPaused', 'getCanvas'] },
  { id: 'events', title: 'Events', lead: 'Subscribe and unsubscribe by name.', methods: ['on', 'off'] },
  { id: 'camera', title: 'Camera', lead: 'Point, fly and frame.', methods: ['setRotation', 'flyTo', 'focusOnCountry'] },
  { id: 'countries', title: 'Countries', lead: 'Selection, data and labels.', methods: ['setActiveCountry', 'getActiveCountry', 'setCountryData', 'getCountryData', 'setCountryLabelsEnabled', 'setCountryLabels'] },
  { id: 'data-layers', title: 'Data layers and legend', lead: 'The high-level visualisation slot and its legend.', methods: ['setDataLayer', 'getDataLayer', 'playDataLayerAnimation', 'setCinematicData', 'getCinematicData', 'showLegend', 'hideLegend'] },
  { id: 'markers-and-arcs', title: 'Markers and arcs', lead: 'Replace, add or remove by id.', methods: ['setMarkers', 'addMarker', 'removeMarker', 'setHtmlMarkers', 'addHtmlMarker', 'removeHtmlMarker', 'setArcs', 'addArc', 'removeArc'] },
  { id: 'story', title: 'Story', lead: 'Load a story and drive playback.', methods: ['setStory', 'playStory', 'pauseStory', 'nextScene', 'prevScene', 'goToScene', 'getCurrentScene', 'isStoryPlaying'] },
  { id: 'export', title: 'Export and projection', lead: 'Pixels out.', methods: ['toImage', 'project'] },
];

export function GlobeInstancePage({ tab, group, page }: DocLocation) {
  const api = useApi();
  const categorised = new Set(CATEGORIES.flatMap((c) => c.methods));
  const other = api ? api.instance.filter((m) => !categorised.has(m.name)).map((m) => m.name) : [];
  return (
    <DocPage
      crumbs={[tab.label, group.label]}
      eyebrow={page.eyebrow}
      title={page.title}
      lead="What createGlobe() returns. Signatures and descriptions are generated from the instance type."
      meta={api && <Pill tone="accent">{api.stats.instanceMethods} methods</Pill>}
    >
      <Callout tone="tip">
        The framework wrappers reach this object through <code>getInstance()</code>; everything below works the same there.
      </Callout>
      {CATEGORIES.map((c) => (
        <DocSection key={c.id} id={c.id} title={c.title} lead={c.lead}>
          <Methods names={c.methods} />
        </DocSection>
      ))}
      {other.length > 0 && (
        <DocSection title="Other" id="other">
          <Methods names={other} />
        </DocSection>
      )}
    </DocPage>
  );
}

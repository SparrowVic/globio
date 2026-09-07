import { Callout, CodePanel, DocPage, DocSection, PropsTable, Signature, Step, Steps } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';
import { QUICK_START } from '@/docs/snippets';

export const CONFIG_ROWS = [
  { name: 'container', type: 'HTMLElement', description: 'Element the canvas fills.', required: true },
  { name: 'kind', type: 'GlobeKind', default: "'outline'", description: 'Renderer.' },
  { name: 'theme', type: 'ThemeInput', default: 'kind default', description: 'Preset name or preset plus token overrides.' },
  { name: 'countries', type: 'CountriesConfig', description: 'Resolution, hover and border styling.' },
  { name: 'countryLabels', type: 'CountryLabelsConfig', description: 'Label visibility and custom names.', kinds: ['outline', 'paper'] as const },
  { name: 'countryData', type: 'CountryDataMap', description: 'Initial choropleth values.' },
  { name: 'markers', type: 'MarkerConfig[]', description: 'Initial pins.' },
  { name: 'htmlMarkers', type: 'HtmlMarkerConfig[]', description: 'Initial DOM-anchored markers.' },
  { name: 'arcs', type: 'ArcConfig[]', description: 'Initial great-circle connections.' },
  { name: 'atmosphere', type: 'AtmosphereConfig', description: 'Rim glow: colour, intensity, radius, side.' },
  { name: 'starfield', type: 'StarfieldConfig', description: 'Background stars.' },
  { name: 'postprocessing', type: 'PostProcessingConfig', description: 'Bloom, streaks, grading.', kinds: ['cinematic'] as const },
  { name: 'cinematic', type: 'CinematicConfig', description: 'Sun, clouds, textures, surface.', kinds: ['cinematic'] as const },
  { name: 'autoRotate', type: 'AutoRotateConfig', default: '{ enabled: false }', description: 'Ambient rotation.' },
  { name: 'initialPosition', type: 'LatLng', default: '[0, 0]', description: 'What faces the camera on mount.' },
  { name: 'axisTilt', type: 'number', default: '0', description: 'Degrees of axial tilt.' },
  { name: 'zoom', type: 'ZoomConfig', description: 'Mode, strength, smoothing, limits.' },
  { name: 'framing', type: 'FramingConfig', description: 'Padding around the globe and zoom lock for decoration use.' },
  { name: 'performance', type: 'PerformanceConfig', description: 'Antialias, pixel ratio, max fps, adaptive quality, pause when hidden.' },
  { name: 'transparent', type: 'boolean', default: 'false', description: 'Transparent canvas so the page background shows through.' },
];

export function CreateGlobe({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <Signature code="function createGlobe(config: GlobeConfig): GlobeInstance" />
      <DocSection title="Lifecycle">
        <Steps>
          <Step title="Create">The scene, renderer and kind are built synchronously. Nothing touches the DOM yet.</Step>
          <Step title="Mount">
            <code>mount()</code> appends the canvas, loads country geometry and starts the frame loop. <code>ready</code> fires after shader compile.
          </Step>
          <Step title="Update">
            <code>update(partial)</code> patches the running scene. A new <code>kind</code> rebuilds the renderer in place.
          </Step>
          <Step title="Destroy">
            <code>destroy()</code> releases the WebGL context and every listener. Required before removing the container.
          </Step>
        </Steps>
        <CodePanel code={QUICK_START} />
      </DocSection>
      <DocSection title="GlobeConfig" eyebrow="config keys">
        <PropsTable rows={CONFIG_ROWS} />
        <Callout tone="note">
          Kind-specific groups (<code>outline</code>, <code>dotted</code>, <code>wireframe</code>, <code>hologram</code>, <code>paper</code>,{' '}
          <code>cinematic</code>) are ignored by other kinds, so a config can carry all of them and switch kinds freely.
        </Callout>
      </DocSection>
    </DocPage>
  );
}

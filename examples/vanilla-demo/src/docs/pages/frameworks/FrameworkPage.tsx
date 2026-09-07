import { CopyCommand } from '@/components/home/landing/atoms';
import { Callout, CodePanel, DocPage, DocSection, DocSubsection, LinkCard, CardGrid, Pill, PropsTable } from '@/components/docs';
import { frameworkMeta, type FrameworkId } from '@/docs/frameworks';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { FLY_TO, QUICK_START } from '@/docs/snippets';

const MAPPING: Readonly<Record<FrameworkId, ReadonlyArray<{ name: string; type: string; description: string; default?: string }>>> = {
  vanilla: [
    { name: 'createGlobe(config)', type: 'GlobeInstance', description: 'The factory. Every key of GlobeConfig, plus container.' },
    { name: 'globe.on(event, handler)', type: 'void', description: 'Events by name.' },
    { name: 'globe.update(partial)', type: 'void', description: 'Change anything after mount.' },
  ],
  react: [
    { name: 'kind, theme, markers, …', type: 'GlobeConfig keys', description: 'Every config key is a prop. Changing a prop calls update() with just that key.' },
    { name: 'onCountryClick', type: '(event: CountryEvent) => void', description: 'Every event is an on* callback.' },
    { name: 'onCountryHover', type: '(event: CountryEvent | null) => void', description: 'Null on leave.' },
    { name: 'onReady / onError', type: '() => void / (error) => void', description: 'Lifecycle callbacks.' },
    { name: 'ref', type: 'GlobeHandle', description: 'The instance and the container element.' },
  ],
  vue: [
    { name: 'kind, theme, :markers, …', type: 'GlobeConfig keys', description: 'Props in kebab-case; objects bound with the colon.' },
    { name: '@country-click', type: '(event: CountryEvent) => void', description: 'Events as emits.' },
    { name: '@ready / @error', type: '() => void / (error) => void', description: 'Lifecycle emits.' },
    { name: 'ref.instance', type: 'GlobeInstance', description: 'The instance through a template ref.' },
  ],
  angular: [
    { name: '[kind], [theme], [markers], …', type: 'GlobeConfig keys', description: 'Inputs for every config key.' },
    { name: '(countryClick)', type: 'EventEmitter<CountryEvent>', description: 'Outputs for every event.' },
    { name: '(ready) / (error)', type: 'EventEmitter', description: 'Lifecycle outputs.' },
    { name: 'ViewChild(GlobeComponent).instance', type: 'GlobeInstance', description: 'The instance from the component.' },
  ],
};

export function FrameworkPage({ tab, group, page }: DocLocation) {
  const id = page.framework ?? 'vanilla';
  const meta = frameworkMeta(id);
  return (
    <DocPage
      crumbs={[tab.label, group.label]}
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.summary}
      meta={
        <>
          <Pill tone="accent">{meta.pkg}</Pill>
          <Pill>peer: @your-globe/core</Pill>
          <Pill>peer: three</Pill>
        </>
      }
    >
      <DocSection title="Install">
        <CopyCommand command={`npm i ${meta.pkg}${id === 'vanilla' ? '' : ' @your-globe/core'} three`} size="sm" />
      </DocSection>

      <DocSection title="Component">
        <CodePanel code={QUICK_START} pinned={id} caption="Same config as everywhere else; this page shows only this framework." />
        <DocSubsection title="Props and events">
          <PropsTable rows={MAPPING[id]} />
        </DocSubsection>
      </DocSection>

      <DocSection title="Reach the instance">
        <p>Anything the component does not expose declaratively — camera moves, legends, stories — is available on the instance.</p>
        <CodePanel code={FLY_TO} pinned={id} />
        <Callout tone="note" title="Server rendering">
          The engine touches <code>window</code> on creation. Render the component on the client only; the SSR guide has the pattern for each framework.
        </Callout>
      </DocSection>

      <DocSection title="See also">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('frameworks/ssr')} eyebrow="typeof window" title="Server rendering" description="Client-only mounting in Next, Nuxt and Angular Universal." />
          <LinkCard to={pageHref('frameworks/bundlers')} eyebrow="peerDependencies" title="Bundlers and CDNs" description="One copy of three.js per page." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}

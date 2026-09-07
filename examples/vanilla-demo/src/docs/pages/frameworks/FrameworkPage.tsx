import { CopyCommand } from '@/components/home/landing/atoms';
import { ApiLoading, ApiTable, Callout, CardGrid, CodePanel, DocPage, DocSection, DocSubsection, DocText, LinkCard, MethodsTable, Pill, PropsTable } from '@/components/docs';
import { useApi } from '@/docs/api';
import { featureForConfigPath } from '@/docs/features';
import { frameworkMeta, type FrameworkId } from '@/docs/frameworks';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { FLY_TO, QUICK_START } from '@/docs/snippets';

const propName = (id: FrameworkId, key: string): string => {
  if (id === 'vue') return `:${key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
  if (id === 'angular') return `[${key}]`;
  return key;
};

const eventName = (id: FrameworkId, name: string): string => {
  if (id === 'react') return `on${name.charAt(0).toUpperCase()}${name.slice(1)}`;
  if (id === 'vue') return `@${name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)}`;
  if (id === 'angular') return `(${name === 'error' ? 'globeError' : name})`;
  return `globe.on('${name}')`;
};

const INSTANCE_ACCESS: Readonly<Record<FrameworkId, string>> = {
  vanilla: 'createGlobe() returns the instance; everything is a method on it.',
  react: 'Pass a ref; ref.current.getInstance() returns the GlobeInstance once mounted.',
  vue: 'Put a template ref on <VueGlobe>; ref.value.getInstance() returns the GlobeInstance once mounted.',
  angular: 'Query the component with @ViewChild(GlobeComponent); globe.getInstance() returns the GlobeInstance after ngAfterViewInit.',
};

export function FrameworkPage({ tab, group, page }: DocLocation) {
  const id = page.framework ?? 'vanilla';
  const meta = frameworkMeta(id);
  const api = useApi();
  const configKeys = api ? api.config.filter((e) => e.name !== 'container') : [];
  const wrapper = api?.wrappers;

  return (
    <DocPage
      crumbs={[tab.label, group.label]}
      eyebrow={page.eyebrow}
      title={page.title}
      lead={page.summary}
      meta={
        <>
          <Pill tone="accent">{meta.pkg}</Pill>
          {id !== 'vanilla' && <Pill>peer: @your-globe/core</Pill>}
          <Pill>peer: three</Pill>
        </>
      }
    >
      <DocSection title="Install">
        <CopyCommand command={`npm i ${meta.pkg}${id === 'vanilla' ? '' : ' @your-globe/core'} three`} size="sm" />
      </DocSection>

      <DocSection title="Component">
        <CodePanel code={QUICK_START} pinned={id} caption="The same config as everywhere else, in this framework's idiom." />
        <DocSubsection title="Props">
          <p>
            {id === 'vanilla'
              ? 'Every key of GlobeConfig, passed to createGlobe() and later to update().'
              : 'Every key of GlobeConfig is a prop; changing one calls update() with that key. Generated from the wrapper source.'}
          </p>
          {api ? (
            <PropsTable
              rows={configKeys.map((e) => ({
                name: propName(id, e.name),
                id: `prop-${e.name}`,
                type: e.ref ?? e.type,
                default: e.default,
                description: e.description ? <DocText text={e.description} inline /> : featureForConfigPath(e.name)?.summary ?? '',
              }))}
            />
          ) : (
            <ApiLoading />
          )}
        </DocSubsection>
        <DocSubsection title="Events">
          {api ? (
            <ApiTable
              columns={[
                { key: 'name', label: id === 'react' ? 'Callback' : id === 'vue' ? 'Emit' : id === 'angular' ? 'Output' : 'Event', className: 'docs-col-name' },
                { key: 'payload', label: 'Payload', className: 'docs-col-type' },
                { key: 'description', label: 'Description' },
              ]}
              rows={api.events.map((e) => ({
                id: `event-${e.name}`,
                cells: {
                  name: <code>{eventName(id, e.name)}</code>,
                  payload: <code className="docs-type">{e.payload}</code>,
                  description: <DocText text={e.description || 'See the events guide.'} inline />,
                },
              }))}
            />
          ) : (
            <ApiLoading />
          )}
        </DocSubsection>
      </DocSection>

      <DocSection title="Reach the instance">
        <p>{INSTANCE_ACCESS[id]}</p>
        <CodePanel code={FLY_TO} pinned={id} />
        {wrapper && id === 'react' && (
          <MethodsTable rows={wrapper.react.handle.map((h) => ({ name: h.name, signature: `${h.name}: ${h.type}`, description: h.name === 'getInstance' ? 'The whole GlobeInstance.' : 'Forwarded to the instance.' }))} />
        )}
        {wrapper && id === 'vue' && (
          <MethodsTable rows={wrapper.vue.exposed.map((n) => ({ name: n, signature: `${n}()`, description: n === 'getInstance' ? 'The whole GlobeInstance.' : 'Forwarded to the instance.' }))} />
        )}
        {wrapper && id === 'angular' && (
          <MethodsTable rows={wrapper.angular.methods.map((m) => ({ name: m.name, signature: m.signature, description: m.name === 'getInstance' ? 'The whole GlobeInstance.' : 'Forwarded to the instance.' }))} />
        )}
        <Callout tone="note" title="Server rendering">
          The engine touches <code>window</code> on creation. Render the component on the client only; the server rendering guide has the pattern for each
          framework.
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

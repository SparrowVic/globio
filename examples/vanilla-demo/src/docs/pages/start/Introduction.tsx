import { faAngular, faJs, faReact, faVuejs } from '@fortawesome/free-brands-svg-icons';
import { Callout, CardGrid, CodePanel, DocPage, DocSection, KindBadges, LinkCard, Pill } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { QUICK_START } from '@/docs/snippets';

export function Introduction({ tab, group, page }: DocLocation) {
  return (
    <DocPage
      crumbs={[tab.label, group.label]}
      eyebrow={page.eyebrow}
      title="A globe engine, not a map engine."
      lead="Globio renders an interactive 3D Earth from one typed config: six visual kinds, country interaction, data layers, a story engine and wrappers for React, Vue and Angular. The core uses three.js as a peer dependency."
      meta={
        <>
          <Pill tone="accent">v0.1.0</Pill>
          <Pill>MIT</Pill>
          <Pill>ESM + CJS</Pill>
        </>
      }
    >
      <DocSection title="What it renders">
        <p>
          Call <code>createGlobe()</code> with an element, then <code>mount()</code> to attach the WebGL canvas. The <code>kind</code> key picks the renderer at creation; shared settings and the supported data layers can then be updated through the instance.
        </p>
        <p>
          <KindBadges kinds="all" /> support countries, markers and arcs. Choropleth fills, labels and the cinematic surface differ per kind; the matrix on
          the kinds page lists every combination.
        </p>
        <CodePanel code={QUICK_START} caption="The smallest useful config." />
      </DocSection>

      <DocSection title="What it leaves out">
        <ul>
          <li>No map tiles, street data or geocoding. Globio draws countries, not addresses.</li>
          <li>Outline can render charts inside the canvas. Legends, country labels and tooltips use DOM overlays; HTML markers let you add your own content.</li>
          <li>No state management. The instance is imperative; the wrappers make it declarative.</li>
        </ul>
        <Callout tone="tip" title="Design it first">
          The Studio is the fastest way to find a look: pick a kind, tune the panels, export the exact config to any of the four frameworks.
        </Callout>
      </DocSection>

      <DocSection title="Packages">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('frameworks/vanilla')} icon={faJs} eyebrow="@your-globe/core" title="Core" description="The engine. Framework-agnostic." />
          <LinkCard to={pageHref('frameworks/react')} icon={faReact} eyebrow="@your-globe/react" title="React" description="<Globe /> with a ref handle." />
          <LinkCard to={pageHref('frameworks/vue')} icon={faVuejs} eyebrow="@your-globe/vue" title="Vue" description="<VueGlobe /> with emits." />
          <LinkCard to={pageHref('frameworks/angular')} icon={faAngular} eyebrow="@your-globe/angular" title="Angular" description="Standalone <ng-globe>." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}

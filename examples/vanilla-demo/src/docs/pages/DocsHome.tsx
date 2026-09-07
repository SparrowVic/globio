import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faMagnifyingGlass } from '@fortawesome/sharp-solid-svg-icons';
import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { CardGrid, CodePanel, DocSection, FrameworkSwitch, KindCard, LinkCard, LivePreview, Prose, useDocsUi } from '@/components/docs';
import { DOCS_TABS, pageHref, tabHref } from '@/docs/manifest';
import { QUICK_START } from '@/docs/snippets';

/** `/docs` — the front door: a quick start, the four sections, the six kinds. */
export function DocsHome() {
  const { openSearch } = useDocsUi();
  return (
    <article className="docs-article docs-article-wide">
      <header className="docs-page-head">
        <span className="docs-eyebrow">documentation</span>
        <h1 className="docs-title">Everything Globio does, in one place.</h1>
        <p className="docs-lead">
          Guides, the full reference, the framework wrappers and the Studio. Pick a framework once and every example on every page follows.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <FrameworkSwitch />
          <button type="button" onClick={openSearch} className="docs-search-btn">
            <FontAwesomeIcon icon={faMagnifyingGlass} className="size-3.5" />
            Search docs
            <span className="docs-kbd" aria-hidden="true">
              <kbd>⌘</kbd>
              <kbd>K</kbd>
            </span>
          </button>
        </div>
      </header>

      <Prose>
        <div className="docs-two-col">
          <CodePanel code={QUICK_START} caption="A globe in one call. Change any key later with update()." />
          <LivePreview kind="outline" theme="outline-cyber" caption="What that config renders." />
        </div>

        <DocSection title="Start here" id="start-here">
          <CardGrid columns={2}>
            <LinkCard to={pageHref('start/installation')} eyebrow="npm i @your-globe/core" title="Installation" description="Add the engine and a wrapper to any project." />
            <LinkCard to={pageHref('start/first-globe')} eyebrow="createGlobe()" title="Your first globe" description="Mount, pick a kind, react to a click." />
            <LinkCard to={pageHref('start/choosing-a-kind')} eyebrow="kind" title="Choosing a kind" description="Which renderer fits a dashboard, a hero, a status view." />
            <LinkCard to={pageHref('api/globe-config')} eyebrow="GlobeConfig" title="Every config key" description="The reference, grouped by what each key controls." />
          </CardGrid>
        </DocSection>

        <DocSection title="Sections" id="sections">
          <CardGrid columns={3}>
            {DOCS_TABS.map((t) => (
              <LinkCard key={t.id} to={tabHref(t)} icon={t.icon} title={t.label} description={t.description} layout="stack" />
            ))}
          </CardGrid>
        </DocSection>

        <DocSection title="Kinds" id="kinds" lead="Six renderers share one config. Each page has a live globe next to the code that produces it.">
          <CardGrid columns={3}>
            {KIND_CHAPTERS.map((c) => (
              <KindCard key={c.kind} kind={c.kind} title={c.title} description={c.tagline} />
            ))}
          </CardGrid>
        </DocSection>
      </Prose>
    </article>
  );
}

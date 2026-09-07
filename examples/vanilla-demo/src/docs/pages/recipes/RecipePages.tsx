import { Callout, CardGrid, CodePanel, DocPage, DocSection, LinkCard, LivePreview, Step, Steps } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';
import { DASHBOARD_CODE, FEED_CODE, HERO_CODE, ROUTES, ROUTES_CODE, STORY_CODE, dashboardSetup, feedSetup, routesSetup, storySetup } from '@/docs/recipes';

const RECIPES = [
  { slug: 'recipes/choropleth-dashboard', title: 'Choropleth dashboard', what: 'Values through a scale, a legend, a click that selects.', kind: 'outline' as const },
  { slug: 'recipes/flight-routes', title: 'Flight routes', what: 'Pulsing hubs and animated great-circle routes.', kind: 'outline' as const },
  { slug: 'recipes/story-landing', title: 'Story-driven landing', what: 'A looping story with captions from scene events.', kind: 'cinematic' as const },
  { slug: 'recipes/hero-globe', title: 'Hero globe', what: 'A decorative globe that never steals the scroll.', kind: 'cinematic' as const },
  { slug: 'recipes/live-feed', title: 'Live data feed', what: 'Markers arriving over time, capped and pulsing.', kind: 'dotted' as const },
];

export function RecipesOverview({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title="Five builds to copy." lead="Each recipe is a complete, working setup: the live preview on the page runs the same values the snippet shows, so what you see is what you paste.">
      <DocSection title="Recipes" id="recipes">
        <CardGrid columns={2}>
          {RECIPES.map((r) => (
            <LinkCard key={r.slug} to={pageHref(r.slug)} eyebrow={`kind: '${r.kind}'`} title={r.title} description={r.what} />
          ))}
        </CardGrid>
      </DocSection>
      <DocSection title="How to read them" id="how">
        <ul>
          <li>The Vanilla snippet is complete; the React, Vue and Angular ones show the parts that differ.</li>
          <li>Anything imperative goes through the instance: <code>getInstance()</code> in the wrappers, the return value of <code>createGlobe()</code> otherwise.</li>
          <li>Ids in the data are ISO 3166-1 numeric strings, as everywhere in the engine.</li>
        </ul>
      </DocSection>
    </DocPage>
  );
}

export function ChoroplethDashboard({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <div className="docs-two-col">
        <CodePanel code={DASHBOARD_CODE} caption="Ten countries through a viridis scale, a legend, and a toggle selection on click." />
        <LivePreview kind="outline" theme="outline-dark" interactive initialLat={30} initialLng={15} setup={dashboardSetup} caption="Interactive: click a country to select it, click again to clear." />
      </div>
      <DocSection title="Steps" id="steps">
        <Steps>
          <Step title="Key the data by numeric id">
            <p>
              <code>'616'</code> is Poland, <code>'840'</code> the United States. Convert alpha-2 codes at the edge of your app; numbers and short strings are
              padded for you.
            </p>
          </Step>
          <Step title="Pick one scale and use it twice">
            <p>The same object drives <code>setCountryData()</code> and <code>showLegend()</code>, so the legend can never disagree with the fills.</p>
          </Step>
          <Step title="Update in place">
            <p>Call <code>setCountryData()</code> whenever the numbers change. Fills tween between values; nothing is rebuilt.</p>
          </Step>
        </Steps>
        <Callout tone="tip">
          For a panel next to the globe, listen to <code>countryHover</code> as well: the payload carries the country name, so the panel can preview before
          the click.
        </Callout>
      </DocSection>
      <DocSection title="Related" id="related">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('data/country-data')} eyebrow="setCountryData()" title="Country data" description="Entries, scales and live updates." />
          <LinkCard to={pageHref('data/legends')} eyebrow="ScaleConfig" title="Scales and legends" description="Palettes and the legend overlay." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}

export function FlightRoutes({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <div className="docs-two-col">
        <CodePanel code={ROUTES_CODE} caption="Hubs as markers, routes as arcs; the busiest hub pulses." />
        <LivePreview kind="outline" theme="outline-cyber" initialLat={35} initialLng={30} arcs={ROUTES} setup={routesSetup} caption="Animated heads show direction; the dashed route is a planned one." />
      </div>
      <DocSection title="Steps" id="steps">
        <Steps>
          <Step title="Markers first, arcs second">
            <p>Both are keyed by id, so a route can reference its hubs and be removed with them.</p>
          </Step>
          <Step title="Let long routes climb">
            <p>
              <code>height: 'auto'</code> scales the apex with distance. Short hops stay low; intercontinental routes arc high.
            </p>
          </Step>
          <Step title="Animate sparingly">
            <p>A moving head per active route reads as traffic. Dozens of heads read as noise, and each is a per-frame update.</p>
          </Step>
        </Steps>
      </DocSection>
      <DocSection title="Related" id="related">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('data/arcs')} eyebrow="ArcConfig" title="Arcs" description="Height, dashes and the animated head." />
          <LinkCard to={pageHref('data/markers')} eyebrow="MarkerConfig" title="Markers" description="Pins, pulse and HTML markers." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}

export function StoryLanding({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <div className="docs-two-col">
        <CodePanel code={STORY_CODE} caption="Three scenes on a loop; captions come from sceneEnter, so pause and skip stay in sync." />
        <LivePreview kind="cinematic" theme="cinematic-dawn" lockZoom={false} speed={0.02} setup={storySetup} caption="The preview runs the same story: Poland, Japan, Brazil." />
      </div>
      <DocSection title="Steps" id="steps">
        <Steps>
          <Step title="Describe scenes, not animations">
            <p>A scene says where to look, what to highlight and for how long. The engine handles the flight, the easing and the hold.</p>
          </Step>
          <Step title="Drive the page from events">
            <p>
              <code>sceneEnter</code> is the only source that stays right when a reader presses next or the story is paused. Render captions from it.
            </p>
          </Step>
          <Step title="Give the flight room">
            <p>
              A little <code>transitionElevation</code> turns a straight slerp into a fly-over. Keep <code>padding</code> generous so the country never touches the
              edge on arrival.
            </p>
          </Step>
        </Steps>
        <Callout tone="note">
          Stories change the camera distance, so do not lock the zoom on a story globe. The hero recipe shows the opposite case.
        </Callout>
      </DocSection>
      <DocSection title="Related" id="related">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('story/engine')} eyebrow="setStory()" title="Story engine" description="Scenes, playback and events." />
          <LinkCard to={pageHref('camera/fly-to')} eyebrow="focusOnCountry()" title="flyTo and focusOnCountry" description="What a scene does under the hood." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}

export function HeroGlobe({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <div className="docs-two-col">
        <CodePanel code={HERO_CODE} caption="Transparent, padded, zoom locked, low geometry, 30 fps, paused when hidden." />
        <LivePreview kind="cinematic" theme="cinematic-night" starfield speed={0.05} caption="The landing page's hero uses this setup at medium resolution." />
      </div>
      <DocSection title="Why each line" id="why">
        <ul>
          <li>
            <strong>transparent</strong> — the page's gradient or photo shows through; the theme background would clip the halo into a square.
          </li>
          <li>
            <strong>framing.padding</strong> — the halo fades inside the canvas instead of against its edge.
          </li>
          <li>
            <strong>framing.lockZoom</strong> — the wheel scrolls the page; a decoration must never trap the cursor.
          </li>
          <li>
            <strong>countries.resolution: 'low'</strong> and <strong>hoverEnabled: false</strong> — a tenth of the geometry and no picking work per frame.
          </li>
          <li>
            <strong>performance</strong> — a 30 fps cap and pausing when hidden leave the budget to the rest of the page.
          </li>
        </ul>
        <Callout tone="perf">
          Reveal the canvas on <code>ready</code> with an opacity transition. The first frame is then a finished one, and the build cost hides behind the
          headline.
        </Callout>
      </DocSection>
      <DocSection title="Related" id="related">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('camera/position')} eyebrow="framing" title="Position and framing" description="Padding and the zoom lock." />
          <LinkCard to={pageHref('performance/overview')} eyebrow="performance" title="Performance" description="What each setting costs." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}

export function LiveFeed({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <div className="docs-two-col">
        <CodePanel code={FEED_CODE} caption="One marker per message, a pulse on arrival, the newest eight kept." />
        <LivePreview kind="dotted" speed={0.06} setup={feedSetup} caption="The preview simulates a feed: a new city every second, capped at eight." />
      </div>
      <DocSection title="Steps" id="steps">
        <Steps>
          <Step title="Add, do not replace">
            <p>
              <code>addMarker()</code> is cheap and keeps the other markers' animation state; <code>setMarkers()</code> would restart every pulse.
            </p>
          </Step>
          <Step title="Cap the set">
            <p>Remove the oldest ids as new ones arrive. A readable globe shows a handful of fresh events, not the whole history.</p>
          </Step>
          <Step title="Use ids from the feed">
            <p>Reusing an id replaces the marker in place, which is exactly right when the same sensor reports again.</p>
          </Step>
        </Steps>
        <Callout tone="tip">
          For the history, switch to a data layer: a heatmap or hex bins summarise thousands of samples without a marker each.
        </Callout>
      </DocSection>
      <DocSection title="Related" id="related">
        <CardGrid columns={2}>
          <LinkCard to={pageHref('data/markers')} eyebrow="addMarker()" title="Markers" description="Pins, pulse, hover and payloads." />
          <LinkCard to={pageHref('data/data-layers')} eyebrow="setDataLayer()" title="Data layers" description="Heatmaps and hex bins for the history." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}

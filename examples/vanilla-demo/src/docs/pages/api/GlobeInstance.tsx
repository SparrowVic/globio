import { DocPage, DocSection, MethodsTable } from '@/components/docs';
import type { DocLocation } from '@/docs/manifest';

const m = (name: string, signature: string, description: string) => ({ name, signature, description });

export function GlobeInstancePage({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <DocSection title="Lifecycle">
        <MethodsTable
          rows={[
            m('mount', 'mount(): void', 'Attach the canvas and start rendering.'),
            m('destroy', 'destroy(): void', 'Release everything. The instance is unusable afterwards.'),
            m('update', 'update(config: Partial<GlobeConfig>): void', 'Patch the running config.'),
            m('resize', 'resize(): void', 'Re-measure the container. Called automatically by a ResizeObserver; call it after a CSS transform.'),
            m('setPaused', 'setPaused(paused: boolean): void', 'Stop or resume the frame loop without losing state.'),
            m('getCanvas', 'getCanvas(): HTMLCanvasElement', 'The canvas element, for screenshots or event binding.'),
          ]}
        />
      </DocSection>
      <DocSection title="Events">
        <MethodsTable
          rows={[
            m('on', 'on<K>(event: K, handler: GlobeEvents[K]): void', 'Subscribe.'),
            m('off', 'off<K>(event: K, handler: GlobeEvents[K]): void', 'Unsubscribe the same function.'),
          ]}
        />
      </DocSection>
      <DocSection title="Camera">
        <MethodsTable
          rows={[
            m('setRotation', 'setRotation(position: LatLng, animate?: boolean): void', 'Point the globe at a coordinate, optionally animated.'),
            m('flyTo', 'flyTo(position: LatLng, distance?: number, options?: FlyToOptions): void', 'Animated camera move.'),
            m('focusOnCountry', 'focusOnCountry(id: string, options?: FocusOptions): void', 'Fit a country in view.'),
          ]}
        />
      </DocSection>
      <DocSection title="Countries and data">
        <MethodsTable
          rows={[
            m('setActiveCountry', 'setActiveCountry(id: string | null): void', 'Select or clear the highlighted country.'),
            m('getActiveCountry', 'getActiveCountry(): string | null', 'The selected id.'),
            m('setCountryData', 'setCountryData(data: CountryDataMap | null, scale?: ScaleConfig): void', 'Set or clear the choropleth.'),
            m('getCountryData', 'getCountryData(): CountryDataMap | null', 'Current values.'),
            m('setCountryLabelsEnabled', 'setCountryLabelsEnabled(enabled: boolean): void', 'Toggle labels.'),
            m('setCountryLabels', 'setCountryLabels(labels: Record<string, string>): void', 'Override label text by id.'),
            m('showLegend', 'showLegend(scale: ScaleConfig, options?: LegendOptions): void', 'Draw the legend overlay.'),
            m('hideLegend', 'hideLegend(): void', 'Remove it.'),
          ]}
        />
      </DocSection>
      <DocSection title="Markers and arcs">
        <MethodsTable
          rows={[
            m('setMarkers', 'setMarkers(markers: MarkerConfig[]): void', 'Replace all pins.'),
            m('addMarker', 'addMarker(marker: MarkerConfig): void', 'Add one.'),
            m('removeMarker', 'removeMarker(id: string): void', 'Remove one.'),
            m('setHtmlMarkers', 'setHtmlMarkers(markers: HtmlMarkerConfig[]): void', 'Replace DOM markers.'),
            m('setArcs', 'setArcs(arcs: ArcConfig[]): void', 'Replace all arcs.'),
            m('addArc', 'addArc(arc: ArcConfig): void', 'Add one.'),
            m('removeArc', 'removeArc(id: string): void', 'Remove one.'),
          ]}
        />
      </DocSection>
      <DocSection title="Story">
        <MethodsTable
          rows={[
            m('setStory', 'setStory(story: StoryConfig | null): void', 'Load or clear a story.'),
            m('playStory', 'playStory(): void', 'Start from the current scene.'),
            m('pauseStory', 'pauseStory(): void', 'Pause.'),
            m('nextScene', 'nextScene(): void', 'Advance.'),
            m('prevScene', 'prevScene(): void', 'Go back.'),
            m('goToScene', 'goToScene(id: string): void', 'Jump.'),
            m('getCurrentScene', 'getCurrentScene(): SceneConfig | null', 'The active scene.'),
            m('isStoryPlaying', 'isStoryPlaying(): boolean', 'Playback state.'),
          ]}
        />
      </DocSection>
      <DocSection title="Export and projection">
        <MethodsTable
          rows={[
            m('toImage', 'toImage(options?: { width?: number; height?: number }): Promise<string>', 'A PNG data URL of the current frame.'),
            m('project', 'project(lat: number, lng: number): [x, y] | null', 'Screen pixels for a coordinate, or null when it is behind the globe.'),
          ]}
        />
      </DocSection>
    </DocPage>
  );
}

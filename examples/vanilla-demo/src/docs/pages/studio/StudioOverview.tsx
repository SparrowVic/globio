import { Kbd } from '@/components/shared/components/Kbd';
import { ApiTable, Callout, CardGrid, DocPage, DocSection, LinkCard, Step, Steps } from '@/components/docs';
import { pageHref, type DocLocation } from '@/docs/manifest';

const SHORTCUTS = [
  { keys: ['⌘', 'K'], action: 'Command palette: any panel, preset or action by name.' },
  { keys: ['⌘', 'E'], action: 'Export the current config.' },
  { keys: ['⌘', 'S'], action: 'Save a snapshot.' },
  { keys: ['1', '…', '6'], action: 'Switch kind.' },
  { keys: ['Space'], action: 'Pause or resume auto-rotate.' },
];

export function StudioOverview({ tab, group, page }: DocLocation) {
  return (
    <DocPage crumbs={[tab.label, group.label]} eyebrow={page.eyebrow} title={page.title} lead={page.summary}>
      <DocSection title="A session">
        <Steps>
          <Step title="Start from a preset">Every kind ships with presets in the Workshop. Pick the closest one; nothing is locked.</Step>
          <Step title="Tune the panels">Appearance, camera, data and effects live in the inspector. Every control has a help tip that links back here.</Step>
          <Step title="Export the config">
            The export dialog writes the exact <code>GlobeConfig</code> for Vanilla, React, Vue or Angular, with only the keys that differ from the defaults.
          </Step>
        </Steps>
        <Callout tone="tip">
          The Studio and these docs share one description of every feature, so what a help tip says is what the reference says.
        </Callout>
      </DocSection>

      <DocSection title="Keyboard shortcuts">
        <ApiTable
          columns={[
            { key: 'keys', label: 'Keys', className: 'docs-col-name' },
            { key: 'action', label: 'Action' },
          ]}
          rows={SHORTCUTS.map((s) => ({
            cells: {
              keys: (
                <span className="inline-flex gap-1">
                  {s.keys.map((k) => (
                    <Kbd key={k}>{k}</Kbd>
                  ))}
                </span>
              ),
              action: s.action,
            },
          }))}
        />
      </DocSection>

      <DocSection title="Open it">
        <CardGrid columns={2}>
          <LinkCard to="/studio" eyebrow="/studio" title="Open Studio" description="The configurator, in this browser." />
          <LinkCard to={pageHref('studio/export')} eyebrow="Export" title="Export code" description="What the export writes and why it is short." />
        </CardGrid>
      </DocSection>
    </DocPage>
  );
}

import { ChevronUp } from 'lucide-react';
import { usePanelState } from '@/hooks/usePanelState';
import type { RuntimeStatus } from '@/configurator/types';

export function StatusDock({ status, onExport }: {
  readonly status: RuntimeStatus;
  readonly onExport: () => void;
}) {
  const [expanded, setExpanded] = usePanelState('panel-status', false);
  return <footer className="studio-status-dock">
    {expanded && <div id="studio-runtime-details" className="studio-status-details">
      <dl><div><dt>Scene</dt><dd>{status.layerSummary}</dd></div><div><dt>Dataset</dt><dd>{status.dataSummary}</dd></div><div><dt>Pointer</dt><dd>{status.hover}</dd></div></dl>
      <button className="studio-tool-button" onClick={onExport}>View export</button>
    </div>}
    <button className="studio-status-toggle" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-controls="studio-runtime-details" aria-label="Runtime details">
      <span className="studio-ready-indicator" data-ready={status.ready} />
      <span>{status.ready ? 'Globe ready' : 'Loading globe'}</span>
      <span className="studio-runtime-message">{status.message}</span>
      <span className="studio-runtime-dataset">{status.dataSummary}</span>
      <ChevronUp size={14} style={{ transform: expanded ? 'rotate(180deg)' : undefined }} />
    </button>
  </footer>;
}

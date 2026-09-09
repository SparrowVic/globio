import { useMemo, useRef, useState, type ChangeEvent } from 'react';
import { Tabs } from 'radix-ui';
import { ArrowDownToLine, Check, Copy, FileJson, FileUp } from 'lucide-react';
import type { HeatmapDataEntry } from '@your-globe/core';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import type { ConfiguratorState } from '@/configurator/types';
import type { CustomTheme } from '@/lib/custom-themes';
import {
  createRuntimeExport, createStudioDocument, generateStudioCode,
  parseStudioDocument, serializeStudioDocument, STUDIO_DOCUMENT_MAX_BYTES,
  STUDIO_FRAMEWORKS, type StudioDocument, type StudioFramework,
} from '@/lib/studio-document';

interface Props {
  readonly mode: 'export' | 'import';
  readonly state: ConfiguratorState;
  readonly customThemes: readonly CustomTheme[];
  readonly heatmapData: readonly HeatmapDataEntry[];
  readonly heatmapLoading: boolean;
  readonly heatmapError: string | null;
  readonly onClose: () => void;
  readonly onImport: (document: StudioDocument) => void;
}

function download(contents: string, filename: string, mime = 'application/json') {
  const url = URL.createObjectURL(new Blob([contents], { type: mime }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function StudioTransferDialog(props: Props) {
  const returnFocus = useRef(document.activeElement instanceof HTMLElement ? document.activeElement : null);
  return (
    <Dialog open onOpenChange={(open) => { if (!open) props.onClose(); }}>
      <DialogContent className="studio-transfer" onCloseAutoFocus={(event) => {
        event.preventDefault();
        if (returnFocus.current?.isConnected) returnFocus.current.focus();
        else document.querySelector<HTMLButtonElement>('.studio-toolbar-actions button')?.focus();
      }}>
        {props.mode === 'export' ? <ExportProject {...props} /> : <ImportProject onImport={props.onImport} />}
      </DialogContent>
    </Dialog>
  );
}

function ExportProject({ state, customThemes, heatmapData, heatmapLoading, heatmapError }: Props) {
  const [framework, setFramework] = useState<StudioFramework>('react');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const meta = STUDIO_FRAMEWORKS.find((entry) => entry.id === framework)!;
  const code = useMemo(() => generateStudioCode(framework), [framework]);
  const waiting = state.activeLayer === 'heatmap' && heatmapLoading;
  const datasetError = state.activeLayer === 'heatmap' ? heatmapError : null;
  const unavailable = waiting || Boolean(datasetError);

  const exportFile = (project: boolean) => {
    try {
      const json = project
        ? serializeStudioDocument(createStudioDocument(state, {
            customThemes,
            ...(state.activeLayer === 'heatmap' ? { heatmapData } : {}),
          }))
        : JSON.stringify(createRuntimeExport(state, heatmapData, customThemes), null, 2);
      download(json, project ? `globio-${state.globe.kind}.studio.json` : 'globe-config.json');
      setError('');
      setNotice(project ? 'Studio project saved.' : 'Config downloaded. Save the code beside it.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not export this project.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setError('');
      setNotice('Code copied.');
    } catch {
      setError('Clipboard access is unavailable. Use Download code instead.');
    }
  };

  return <>
    <div className="studio-transfer-heading">
      <span className="studio-transfer-icon"><ArrowDownToLine size={20} /></span>
      <DialogTitle>Take your globe with you</DialogTitle>
      <DialogDescription>Ship this scene in your app, or save an editable Studio project.</DialogDescription>
    </div>
    <Tabs.Root defaultValue="runtime" className="studio-transfer-tabs" onValueChange={() => { setNotice(''); setError(''); }}>
      <Tabs.List aria-label="Export format" className="studio-tab-list">
        <Tabs.Trigger value="runtime">Use in app</Tabs.Trigger>
        <Tabs.Trigger value="project">Studio project</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="runtime" className="studio-tab-content">
        <div className="studio-export-step">
          <div><strong>1. Save your scene</strong><p>Includes appearance, layers, data and custom theme tokens.</p></div>
          <button className="studio-tool-button" disabled={unavailable} onClick={() => exportFile(false)}><FileJson size={16} />Download config</button>
        </div>
        <div className="studio-export-step"><div><strong>2. Add it to your app</strong><p>Keep <code>globe-config.json</code> beside the component below.</p></div></div>
        <Tabs.Root value={framework} onValueChange={(value) => { setFramework(value as StudioFramework); setNotice(''); }}>
          <Tabs.List aria-label="Framework" className="studio-tab-list studio-frameworks">
            {STUDIO_FRAMEWORKS.map((item) => <Tabs.Trigger key={item.id} value={item.id}>{item.label}</Tabs.Trigger>)}
          </Tabs.List>
          <div className="studio-install"><code>{meta.installCommand}</code></div>
          <pre className="studio-code" tabIndex={0} aria-label={`${meta.label} integration code`}><code>{code}</code></pre>
        </Tabs.Root>
        <p className="studio-transfer-note">Requires the Globio packages; this repository links them locally. Cinematic textures also need <code>public/textures/earth</code> from the demo at the same path in your app.</p>
        <div className="studio-transfer-actions">
          <span className="studio-filename">{meta.filename}</span>
          <button className="studio-tool-button" onClick={() => { download(code, meta.filename, 'text/plain'); setNotice('Code downloaded.'); }}><ArrowDownToLine size={16} />Download code</button>
          <button className="studio-tool-button studio-tool-button--primary" onClick={() => { void copy(); }}><Copy size={16} />Copy code</button>
        </div>
      </Tabs.Content>
      <Tabs.Content value="project" className="studio-tab-content studio-project-content">
        <FileJson size={36} strokeWidth={1.25} />
        <h3>Pick up exactly where you left off.</h3>
        <p>A versioned JSON file with every Studio setting, your selected custom theme and a snapshot of the active heatmap data. Open it here later, or share it with a teammate.</p>
        <dl className="studio-project-summary"><div><dt>Style</dt><dd>{state.globe.kind}</dd></div><div><dt>Theme</dt><dd>{customThemes.find((theme) => theme.id === state.globe.theme)?.name ?? state.globe.theme}</dd></div><div><dt>Data layer</dt><dd>{state.activeLayer}</dd></div></dl>
        <button className="studio-tool-button studio-tool-button--primary" disabled={unavailable} onClick={() => exportFile(true)}><ArrowDownToLine size={16} />Save project</button>
        <p className="studio-transfer-note">Use Open project in Studio to restore it. For your application, choose Use in app.</p>
      </Tabs.Content>
    </Tabs.Root>
    {waiting && <p className="studio-transfer-note" role="status">Waiting for the heatmap dataset before exporting…</p>}
    {datasetError && <p className="studio-transfer-error" role="alert">The dataset could not load: {datasetError}. Choose another dataset before exporting.</p>}
    {error && <p className="studio-transfer-error" role="alert">{error}</p>}
    <p className="studio-transfer-notice" role="status">{notice}</p>
  </>;
}

function ImportProject({ onImport }: Pick<Props, 'onImport'>) {
  const [source, setSource] = useState('');
  const [project, setProject] = useState<StudioDocument | null>(null);
  const [error, setError] = useState('');
  const [reading, setReading] = useState(false);
  const readVersion = useRef(0);

  const chooseFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    const version = ++readVersion.current;
    setProject(null);
    setError('');
    setReading(false);
    setSource('');
    if (file.size > STUDIO_DOCUMENT_MAX_BYTES) { setError('Choose a Studio project smaller than 8 MB.'); return; }
    setReading(true);
    try {
      const text = await file.text();
      if (version === readVersion.current) setSource(text);
    } catch {
      if (version === readVersion.current) setError('This file could not be read. Choose it again or paste its JSON below.');
    } finally {
      if (version === readVersion.current) setReading(false);
    }
  };

  const review = () => {
    try { setProject(parseStudioDocument(source)); setError(''); }
    catch (reason) { setProject(null); setError(reason instanceof Error ? reason.message : 'This is not a valid Studio project.'); }
  };

  return <>
    <div className="studio-transfer-heading">
      <span className="studio-transfer-icon"><FileUp size={20} /></span>
      <DialogTitle>Open a Studio project</DialogTitle>
      <DialogDescription>Choose a saved .studio.json file or paste its contents. Review it before replacing your current scene.</DialogDescription>
    </div>
    <label className="studio-file-input">Choose JSON file<input type="file" accept=".json,application/json" onChange={(event) => { void chooseFile(event); }} /></label>
    <label className="studio-json-label" htmlFor="studio-project-json">Project JSON</label>
    <textarea id="studio-project-json" className="studio-json-input" value={source} spellCheck={false} placeholder={'{ "format": "globio-studio", "version": 1, … }'} onChange={(event) => {
      ++readVersion.current; setReading(false); setSource(event.target.value); setProject(null); setError('');
    }} />
    <p className="studio-transfer-note">Only Studio project files can restore all editor controls. The app config from Use in app is a different format.</p>
    {project && <div className="studio-import-review">
      <strong><Check size={16} />Ready to open</strong>
      <dl className="studio-project-summary"><div><dt>Style</dt><dd>{project.state.globe.kind}</dd></div><div><dt>Theme</dt><dd>{project.customThemes.find((theme) => theme.id === project.state.globe.theme)?.name ?? project.state.globe.theme}</dd></div><div><dt>Data layer</dt><dd>{project.state.activeLayer}</dd></div></dl>
      <p>Your current scene will be replaced. Saved presets and existing themes stay available.</p>
    </div>}
    {error && <p className="studio-transfer-error" role="alert">{error}</p>}
    <div className="studio-transfer-actions">
      <span className="studio-transfer-note">{reading ? 'Reading file…' : 'JSON only · up to 8 MB'}</span>
      {project ? <button className="studio-tool-button studio-tool-button--primary" onClick={() => onImport(project)}>Open project</button>
        : <button className="studio-tool-button studio-tool-button--primary" disabled={!source.trim() || reading} onClick={review}>Review project</button>}
    </div>
  </>;
}

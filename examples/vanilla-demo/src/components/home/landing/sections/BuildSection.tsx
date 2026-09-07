import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { Link } from 'react-router-dom';
import { tokenizeLine } from '@/lib/code-highlight';
import type { FrameworkId } from '@/docs/frameworks';
import './build-sections.css';

interface BuildExample {
  readonly id: FrameworkId;
  readonly label: string;
  readonly file: string;
  readonly command: string;
  readonly code: string;
}

export const BUILD_EXAMPLES: ReadonlyArray<BuildExample> = [
  {
    id: 'vanilla',
    label: 'Vanilla',
    file: 'world.ts',
    command: 'npm i @your-globe/core three',
    code: `import { createGlobe } from '@your-globe/core';

const container = document.createElement('div');
container.style.height = '480px';
document.body.append(container);

const globe = createGlobe({
  container,
  kind: 'cinematic',
  theme: 'cinematic-night',
  autoRotate: { enabled: true, speed: 0.08 },
});

globe.mount();

// When this view is removed:
// globe.destroy();`,
  },
  {
    id: 'react',
    label: 'React',
    file: 'World.tsx',
    command: 'npm i @your-globe/react @your-globe/core three',
    code: `import { Globe } from '@your-globe/react';

export function World() {
  return (
    <Globe
      style={{ height: 480 }}
      kind="cinematic"
      theme="cinematic-night"
      autoRotate={{ enabled: true, speed: 0.08 }}
    />
  );
}`,
  },
  {
    id: 'vue',
    label: 'Vue',
    file: 'World.vue',
    command: 'npm i @your-globe/vue @your-globe/core three',
    code: `<script setup lang="ts">
import { VueGlobe } from '@your-globe/vue';
</script>

<template>
  <VueGlobe
    style="height: 480px"
    kind="cinematic"
    theme="cinematic-night"
    :auto-rotate="{ enabled: true, speed: 0.08 }"
  />
</template>`,
  },
  {
    id: 'angular',
    label: 'Angular',
    file: 'world.component.ts',
    command: 'npm i @your-globe/angular @your-globe/core three',
    code: `import { Component } from '@angular/core';
import { GlobeComponent } from '@your-globe/angular';

@Component({
  selector: 'app-world',
  standalone: true,
  imports: [GlobeComponent],
  template: \`
    <ng-globe
      style="height: 480px"
      kind="cinematic"
      theme="cinematic-night"
      [autoRotate]="{ enabled: true, speed: 0.08 }"
    />
  \`,
})
export class WorldComponent {}`,
  },
];

function CopyButton({ text, label }: { readonly text: string; readonly label: string }) {
  const [status, setStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle');
  const mounted = useRef(true);
  const timer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      clearTimeout(timer.current);
    };
  }, []);

  async function copy() {
    clearTimeout(timer.current);
    setStatus('copying');
    try {
      await navigator.clipboard.writeText(text);
      if (!mounted.current) return;
      setStatus('copied');
      timer.current = setTimeout(() => setStatus('idle'), 2200);
    } catch {
      if (mounted.current) setStatus('error');
    }
  }

  return (
    <div className="home-build__copy-control">
      <button
        className="home-build__copy"
        type="button"
        onClick={copy}
        disabled={status === 'copying'}
      >
        {status === 'copied' ? 'Copied' : status === 'copying' ? 'Copying…' : label}
      </button>
      <span className={`home-build__copy-status${status === 'error' ? '' : ' home-build__copy-status--quiet'}`} role="status">
        {status === 'error' ? 'Copy unavailable. Select the text and copy it.' : status === 'copied' ? 'Copied to clipboard.' : ''}
      </span>
    </div>
  );
}

export function BuildSection() {
  const [activeId, setActiveId] = useState<FrameworkId>('vanilla');
  const tabs = useRef<Array<HTMLButtonElement | null>>([]);
  const active = BUILD_EXAMPLES.find((example) => example.id === activeId)!;

  function moveTab(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    let next: number;
    switch (event.key) {
      case 'ArrowRight': next = (index + 1) % BUILD_EXAMPLES.length; break;
      case 'ArrowLeft': next = (index - 1 + BUILD_EXAMPLES.length) % BUILD_EXAMPLES.length; break;
      case 'Home': next = 0; break;
      case 'End': next = BUILD_EXAMPLES.length - 1; break;
      default: return;
    }
    event.preventDefault();
    setActiveId(BUILD_EXAMPLES[next]!.id);
    tabs.current[next]?.focus();
  }

  return (
    <section id="frameworks" className="home-build" aria-labelledby="home-build-heading">
      <div className="home-wrap home-build__layout">
        <div className="home-build__intro">
          <h2 id="home-build-heading">Your stack.<br />Our planet.</h2>
          <p>A TypeScript engine. Components for React, Vue and Angular. Start with a globe, then add your data.</p>
          <Link className="home-text-link" to={`/docs/frameworks/${activeId}`}>
            Read the {active.label} guide <span aria-hidden="true">↗</span>
          </Link>
        </div>

        <div className="home-build__example">
          <div className="home-build__tabs" role="tablist" aria-label="Framework">
            {BUILD_EXAMPLES.map((example, index) => (
              <button
                key={example.id}
                ref={(element) => { tabs.current[index] = element; }}
                id={`home-build-tab-${example.id}`}
                className="home-build__tab"
                type="button"
                role="tab"
                aria-selected={activeId === example.id}
                aria-controls="home-build-panel"
                tabIndex={activeId === example.id ? 0 : -1}
                onClick={() => setActiveId(example.id)}
                onKeyDown={(event) => moveTab(event, index)}
              >
                {example.label}
              </button>
            ))}
          </div>

          <div
            id="home-build-panel"
            className="home-build__panel"
            role="tabpanel"
            aria-labelledby={`home-build-tab-${active.id}`}
          >
            <div className="home-build__install">
              <code tabIndex={0} aria-label={`${active.label} installation command`}>{active.command}</code>
              <CopyButton key={`${active.id}-command`} text={active.command} label="Copy command" />
            </div>
            <div className="home-build__file">
              <span>{active.file}</span>
              <CopyButton key={`${active.id}-code`} text={active.code} label="Copy code" />
            </div>
            <pre className="home-build__code" tabIndex={0} aria-label={`${active.label} example code`}>
              <code>{active.code.split('\n').map((line, lineIndex) => (
                <span className="home-build__code-line" key={lineIndex}>
                  {tokenizeLine(line).map((token, tokenIndex) => (
                    <span className={`home-build__token home-build__token--${token.kind}`} key={tokenIndex}>{token.text}</span>
                  ))}
                  {'\n'}
                </span>
              ))}</code>
            </pre>
          </div>
          <p className="home-build__note">Choose kind and theme at creation. To change either, recreate the globe or remount its component.</p>
        </div>
      </div>
    </section>
  );
}

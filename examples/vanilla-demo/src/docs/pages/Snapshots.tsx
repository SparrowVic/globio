import { useCallback, useState } from 'react';
import type { GlobeInstance, GlobeKind } from '@your-globe/core';
import { KIND_CHAPTERS } from '@/components/home/landing/data/kinds';
import { defaultThemeFor } from '@/components/home/landing/data/kind-themes';
import { DecorationGlobe, type DecorationGlobeReadyApi } from '@/components/shared/components/DecorationGlobe';

declare global {
  interface Window {
    __globioSnapshots?: Record<string, string>;
  }
}

const SIZE = 640;

/**
 * `/docs/_snapshots` — renders every kind once and captures it with
 * `toImage()`. Save the images as public/docs/kinds/<kind>.jpg; the kind
 * cards use them instead of live globes. Not linked from the navigation.
 */
export function SnapshotsPage() {
  const [shots, setShots] = useState<Partial<Record<GlobeKind, string>>>({});

  const capture = useCallback((kind: GlobeKind, instance: GlobeInstance) => {
    window.setTimeout(() => {
      void instance.toImage({ width: SIZE, height: SIZE }).then((url) => {
        setShots((prev) => ({ ...prev, [kind]: url }));
        window.__globioSnapshots = { ...(window.__globioSnapshots ?? {}), [kind]: url };
      });
    }, 2500);
  }, []);

  return (
    <main className="docs docs-snapshots">
      <h1>Kind snapshots</h1>
      <p>
        Each globe below is captured with <code>toImage()</code> a moment after it goes live. Save the images as <code>public/docs/kinds/&lt;kind&gt;.jpg</code>.
      </p>
      <div className="docs-snapshots-grid">
        {KIND_CHAPTERS.map((c) => (
          <figure key={c.kind}>
            <div className="docs-snapshots-stage">
              <DecorationGlobe
                kind={c.kind}
                theme={defaultThemeFor(c.kind)}
                speed={0}
                starfield
                atmosphere
                framingPadding={0.08}
                transparent={false}
                resolution="medium"
                maxFps={30}
                onReady={(api: DecorationGlobeReadyApi) => capture(c.kind, api.instance)}
                className="absolute inset-0"
              />
            </div>
            <figcaption>
              <code>{c.kind}</code>
              {shots[c.kind] ? (
                <a href={shots[c.kind]} download={`${c.kind}.png`}>
                  download png
                </a>
              ) : (
                <span>capturing…</span>
              )}
            </figcaption>
            {shots[c.kind] && <img src={shots[c.kind]} alt={`${c.kind} snapshot`} />}
          </figure>
        ))}
      </div>
    </main>
  );
}

# Landing Cinematic Redesign Implementation Plan

**Goal:** Rebuild the vanilla-demo landing as a 7-chapter cinematic page with real globe instances, a theme-bleed hero, lat/lng-projected data anchors, real `setDataLayer`/Story-API showcase, and senior-grade micro-detail at desktop 1440 + 1920.

**Architecture:** Restructured `examples/vanilla-demo/src/components/home/landing/` into 7 chapter components + new `atoms/` (shared primitives), `hooks/` (viewport + parallax), `data/` (kind-theme presets). Two `@globiojs/core` extensions land alongside: `GlobeInstance.project(lat, lng)` for screen-projecting data anchors and a richer `DecorationGlobe` that exposes `onReady` for imperative use (drag-rotate, theme remount with crossfade, optional dataLayer mount).

**Tech Stack:** React 18, Tailwind v4, TypeScript, Geist Variable, Font Awesome Pro Sharp Duotone, ReactBits primitives (Aurora, ClickSpark, Magnet, ScrollVelocity, ShinyText, SpotlightCard, StarBorder), `@globiojs/core` (createGlobe, themes, data layers, story API), Three.js (project()).

**Spec:** `docs/design/specs/2026-05-07-landing-cinematic-redesign-design.md`

---

## File Structure

### Created
```
docs/design/specs/2026-05-07-landing-cinematic-redesign-design.md   (already created)

packages/core/src/types/instance.ts                                       MODIFIED  add project()
packages/core/src/globe/create-globe.ts                                   MODIFIED  implement project()

examples/vanilla-demo/src/components/shared/components/DecorationGlobe.tsx   MODIFIED  onReady, theme crossfade, dataLayer

examples/vanilla-demo/src/components/home/landing/atoms/Panel.tsx
examples/vanilla-demo/src/components/home/landing/atoms/OrbitRing.tsx
examples/vanilla-demo/src/components/home/landing/atoms/KindBadge.tsx
examples/vanilla-demo/src/components/home/landing/atoms/ThemeSwatch.tsx
examples/vanilla-demo/src/components/home/landing/atoms/StatChip.tsx
examples/vanilla-demo/src/components/home/landing/atoms/CodeBlock.tsx
examples/vanilla-demo/src/components/home/landing/atoms/UseCaseChips.tsx
examples/vanilla-demo/src/components/home/landing/atoms/index.ts

examples/vanilla-demo/src/components/home/landing/data/kind-themes.ts
examples/vanilla-demo/src/components/home/landing/data/use-cases.ts

examples/vanilla-demo/src/components/home/landing/hooks/use-in-viewport.ts
examples/vanilla-demo/src/components/home/landing/hooks/use-scroll-parallax.ts

examples/vanilla-demo/src/components/home/landing/HeroStage.tsx                       REPLACED
examples/vanilla-demo/src/components/home/landing/hero/HeroLeftRail.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroCenterStage.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroOrbitRig.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroDataAnchors.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroHudReadout.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroFloorGlow.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroRightRail.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroKindCard.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroThemeSwatchRow.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroCodePreview.tsx
examples/vanilla-demo/src/components/home/landing/hero/HeroStatInstruments.tsx

examples/vanilla-demo/src/components/home/landing/KindPersonalitiesSection.tsx        NEW
examples/vanilla-demo/src/components/home/landing/personalities/PersonalityRow.tsx

examples/vanilla-demo/src/components/home/landing/LayerAnatomySection.tsx             NEW (replaces LayerArchitectureSection)
examples/vanilla-demo/src/components/home/landing/anatomy/LayerCard.tsx
examples/vanilla-demo/src/components/home/landing/anatomy/AnatomyDiagram.tsx

examples/vanilla-demo/src/components/home/landing/StudioWorkflowSection.tsx           MODIFIED (polish)
examples/vanilla-demo/src/components/home/landing/workshop/WorkshopDial.tsx
examples/vanilla-demo/src/components/home/landing/workshop/LiveLogStrip.tsx

examples/vanilla-demo/src/components/home/landing/DataStorySection.tsx                NEW
examples/vanilla-demo/src/components/home/landing/data-story/StoryTimeline.tsx
examples/vanilla-demo/src/components/home/landing/data-story/ChoroplethStage.tsx

examples/vanilla-demo/src/components/home/landing/ApiSection.tsx                      MODIFIED (polish)
examples/vanilla-demo/src/components/home/landing/api/CodePlayground.tsx

examples/vanilla-demo/src/components/home/landing/FinalCta.tsx                        MODIFIED (polish)

examples/vanilla-demo/src/components/home/landing/HomeLanding.tsx                     MODIFIED (new section list)
```

### Deleted
```
examples/vanilla-demo/src/components/home/landing/KindShowcaseSection.tsx
examples/vanilla-demo/src/components/home/landing/LayerArchitectureSection.tsx
```

---

### Task 1: Add `globe.project(lat, lng)` to core

**Files:**
- Modify: `packages/core/src/types/instance.ts`
- Modify: `packages/core/src/globe/create-globe.ts`

- [ ] **Step 1.1: Add method to GlobeInstance type**

In `packages/core/src/types/instance.ts`, after the existing `resize` method (around line 91), add:

```ts
  /**
   * Project a lat/lng pair to canvas-relative pixel coordinates. Returns
   * `null` when the point is on the back hemisphere (occluded by the
   * globe) or NDC clipped. Used by HUD overlays that want to anchor a
   * DOM element to a point on the surface.
   */
  readonly project: (lat: number, lng: number) => readonly [number, number] | null;
```

- [ ] **Step 1.2: Implement project() in create-globe**

In `packages/core/src/globe/create-globe.ts`, locate the `instance` object literal (the one returned at the end with `mount`, `update`, etc., around line 757 onward). Add a `project` method alongside the others. Use the existing `latLngToVector3` helper (already imported by sibling files from `../utils/coordinates`).

Add to the imports at the top of the file (or extend the existing one):

```ts
import { GLOBE_RADIUS, latLngToVector3 } from '../utils/coordinates';
```

Then add a project helper before `return instance` (or wherever the instance is constructed). The helper needs access to the camera and renderer canvas. Locate where `state.scene` (or equivalent) holds the camera and the canvas DOM element — they're set up during `createGlobe`.

Implementation outline:

```ts
import { Vector3 } from 'three';

const projectionVec = new Vector3();

const project = (lat: number, lng: number): readonly [number, number] | null => {
  const canvas = scene.renderer.domElement;
  const camera = scene.camera;
  if (!canvas || !camera) return null;

  // Surface position on the unit sphere.
  const surface = latLngToVector3([lat, lng], GLOBE_RADIUS);
  projectionVec.copy(surface);

  // Back-hemisphere cull: dot(camera-to-surface, surface-normal) > 0
  // means the surface point faces away from the camera.
  const cameraDir = camera.position.clone().sub(surface).normalize();
  const surfaceNormal = surface.clone().normalize();
  if (cameraDir.dot(surfaceNormal) < 0) return null;

  // Three.js NDC projection.
  projectionVec.project(camera);

  // NDC out-of-range = off-screen.
  if (
    projectionVec.x < -1 || projectionVec.x > 1 ||
    projectionVec.y < -1 || projectionVec.y > 1
  ) {
    return null;
  }

  // Map NDC [-1, 1] to canvas-relative pixels.
  const rect = canvas.getBoundingClientRect();
  const x = ((projectionVec.x + 1) / 2) * rect.width;
  const y = ((-projectionVec.y + 1) / 2) * rect.height;
  return [x, y] as const;
};
```

Then on the returned instance object add `project,` to the property list. The exact wiring depends on whether `scene.camera` / `scene.renderer.domElement` are exposed; if not, capture them from the locals already in scope at `createGlobe` time.

If `Vector3` isn't already imported, add `import { Vector3 } from 'three';` near the top.

- [ ] **Step 1.3: Build core to verify the change compiles**

Run: `pnpm --filter @globiojs/core typecheck`
Expected: exit 0.

If types fail, the most common cause is `scene.camera` or `scene.renderer.domElement` not being on the type used in this scope — capture those references from the local variables already declared in `createGlobe` instead of accessing through `scene`.

- [ ] **Step 1.4: Commit (skipped — user holds commits)**

Note: per user instruction, do not commit. Move on.

---

### Task 2: Extend `DecorationGlobe` (onReady, dataLayer, theme remount crossfade)

**Files:**
- Modify: `examples/vanilla-demo/src/components/shared/components/DecorationGlobe.tsx`

- [ ] **Step 2.1: Extend props interface**

Add to `DecorationGlobeProps`:

```ts
import type { DataLayer } from '@globiojs/core/data-layers/types';

export interface DecorationGlobeReadyApi {
  readonly instance: GlobeInstance;
  readonly project: GlobeInstance['project'];
}

// Add to DecorationGlobeProps:
readonly onReady?: (api: DecorationGlobeReadyApi) => void;
readonly onDispose?: () => void;
readonly dataLayer?: DataLayer | null;
```

If `DataLayer` isn't directly importable from the workspace package (the `instance.ts` uses `import('...')`), declare a local type alias `type DataLayerInput = Parameters<GlobeInstance['setDataLayer']>[0]` and use that for the prop.

- [ ] **Step 2.2: Wire onReady and dataLayer into the effect**

After the existing `globe.mount()` call, add:

```ts
if (dataLayer != null) {
  globe.setDataLayer(dataLayer);
}
onReady?.({ instance: globe, project: globe.project });
```

Add `dataLayer` and `onReady` to the dependency array. Add `onDispose` to be called inside the cleanup before `globe.destroy()`.

- [ ] **Step 2.3: Theme remount crossfade**

Currently the effect re-runs when any prop changes including `theme`, which destroys + rebuilds the globe (visible flash). For the personality row theme swatcher we want a smooth crossfade. Add a CSS opacity transition wrapper.

Replace the returned JSX:

```tsx
return (
  <div
    ref={containerRef}
    className={className}
    style={{
      pointerEvents: interactive ? 'auto' : 'none',
      transition: 'opacity 280ms cubic-bezier(0.4, 0, 0.2, 1)',
    }}
    aria-hidden={interactive ? undefined : 'true'}
  />
);
```

To get an actual crossfade between two theme states would require holding two canvases simultaneously — too much complexity for this iteration. Document in the spec that theme switches re-mount the globe; the wrapper's transition smooths the swap visually.

- [ ] **Step 2.4: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 3: Atoms folder — shared primitives

**Files:**
- Create: `examples/vanilla-demo/src/components/home/landing/atoms/Panel.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/atoms/OrbitRing.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/atoms/KindBadge.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/atoms/ThemeSwatch.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/atoms/StatChip.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/atoms/CodeBlock.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/atoms/UseCaseChips.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/atoms/index.ts`

- [ ] **Step 3.1: Panel.tsx**

Glass panel with subtle radial accent background. Extracted from current `KindShowcaseSection`'s local `Panel`.

```tsx
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface PanelProps {
  readonly children: ReactNode;
  readonly className?: string;
  readonly id?: string;
  readonly accent?: 'amber' | 'cyan' | 'violet' | 'rose' | 'emerald' | 'paper';
}

const ACCENT_RADIAL: Record<NonNullable<PanelProps['accent']>, string> = {
  amber: 'radial-gradient(circle at 18% 10%, rgba(251,191,36,0.1), transparent 28%), radial-gradient(circle at 90% 20%, rgba(34,211,238,0.1), transparent 28%)',
  cyan: 'radial-gradient(circle at 18% 10%, rgba(34,211,238,0.12), transparent 28%), radial-gradient(circle at 90% 20%, rgba(251,191,36,0.08), transparent 28%)',
  violet: 'radial-gradient(circle at 18% 10%, rgba(167,139,250,0.12), transparent 28%), radial-gradient(circle at 90% 20%, rgba(244,114,182,0.08), transparent 28%)',
  rose: 'radial-gradient(circle at 18% 10%, rgba(244,114,182,0.12), transparent 28%), radial-gradient(circle at 90% 20%, rgba(251,191,36,0.08), transparent 28%)',
  emerald: 'radial-gradient(circle at 18% 10%, rgba(110,231,183,0.1), transparent 28%), radial-gradient(circle at 90% 20%, rgba(34,211,238,0.08), transparent 28%)',
  paper: 'radial-gradient(circle at 18% 10%, rgba(242,193,91,0.12), transparent 28%), radial-gradient(circle at 90% 20%, rgba(251,191,36,0.08), transparent 28%)',
};

export function Panel({ children, className, id, accent = 'amber' }: PanelProps) {
  return (
    <div
      id={id}
      className={cn(
        'relative overflow-hidden rounded-3xl border border-white/[0.09] bg-[#07111c]/72 shadow-[0_24px_80px_-55px_rgba(34,211,238,0.65),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-xl',
        className,
      )}
    >
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{ background: ACCENT_RADIAL[accent] }}
      />
      {children}
    </div>
  );
}
```

- [ ] **Step 3.2: OrbitRing.tsx**

A single orbit ring as an absolutely positioned SVG-free `div` with rounded `border`. Receives size, rotation, and accent.

```tsx
import { cn } from '@/lib/utils';

export interface OrbitRingProps {
  readonly className?: string;
  readonly width: number;
  readonly height: number;
  readonly rotateDeg?: number;
  readonly borderColor?: string;
  readonly glowColor?: string;
  readonly opacity?: number;
}

export function OrbitRing({
  className,
  width,
  height,
  rotateDeg = 0,
  borderColor = 'rgba(255, 200, 90, 0.4)',
  glowColor = 'rgba(251, 191, 36, 0.95)',
  opacity = 1,
}: OrbitRingProps) {
  return (
    <div
      className={cn(
        'absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%] border',
        className,
      )}
      style={{
        width,
        height,
        transform: `translate(-50%, -50%) rotate(${rotateDeg}deg)`,
        borderColor,
        boxShadow: `0 0 36px -18px ${glowColor}`,
        opacity,
        transition: 'border-color 280ms cubic-bezier(0.4, 0, 0.2, 1), box-shadow 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
}
```

- [ ] **Step 3.3: KindBadge.tsx**

```tsx
import type { GlobeKind, ThemePresetName, StarfieldConfig } from '@globiojs/core';
import { DecorationGlobe } from '@/components/shared';
import { cn } from '@/lib/utils';

const NO_STARS: StarfieldConfig = { enabled: false };

export interface KindBadgeProps {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
  readonly label: string;
  readonly caption?: string;
  readonly active?: boolean;
  readonly accentColor?: string;
  readonly onClick?: () => void;
}

export function KindBadge({ kind, theme, label, caption, active, accentColor = '#fbbf24', onClick }: KindBadgeProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group grid grid-cols-[64px_1fr] items-center gap-3 rounded-2xl border bg-white/[0.035] p-2.5 text-left backdrop-blur-xl transition-all duration-300',
        active
          ? 'border-amber-200/65 shadow-[0_0_34px_-14px_rgba(251,191,36,0.9),inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-white/[0.12] hover:border-white/25 hover:bg-white/[0.055]',
      )}
      style={active ? { borderColor: `${accentColor}a6`, boxShadow: `0 0 34px -14px ${accentColor}, inset 0 1px 0 rgba(255,255,255,0.08)` } : undefined}
    >
      <span className="relative block size-14 overflow-hidden rounded-xl border border-white/[0.1] bg-black/35">
        <DecorationGlobe
          kind={kind}
          theme={theme}
          speed={0.012}
          initialLat={12}
          initialLng={kind === 'paper' ? -30 : -44}
          starfield={NO_STARS}
          atmosphere
          framingPadding={0.04}
          className="absolute inset-0"
        />
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        {caption && <span className="mt-0.5 block text-xs text-slate-400">{caption}</span>}
      </span>
    </button>
  );
}
```

- [ ] **Step 3.4: ThemeSwatch.tsx**

```tsx
import { cn } from '@/lib/utils';

export interface ThemeSwatchProps {
  readonly color: string;
  readonly label: string;
  readonly active?: boolean;
  readonly onClick?: () => void;
}

export function ThemeSwatch({ color, label, active, onClick }: ThemeSwatchProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'relative size-8 rounded-full border transition-all duration-200',
        active ? 'scale-110 border-white/45 shadow-[0_0_22px_-4px_currentColor]' : 'border-white/[0.12] hover:scale-105 hover:border-white/30',
      )}
      style={{ background: color, color }}
    >
      {active && <span className="absolute inset-1 rounded-full ring-2 ring-white/60" />}
    </button>
  );
}
```

- [ ] **Step 3.5: StatChip.tsx**

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface StatChipProps {
  readonly icon: IconDefinition;
  readonly value: string;
  readonly label: string;
}

export function StatChip({ icon, value, label }: StatChipProps) {
  return (
    <div className="flex items-center gap-3 px-5">
      <FontAwesomeIcon icon={icon} className="size-6 text-amber-200" />
      <div>
        <div className="text-2xl font-semibold leading-none text-white">{value}</div>
        <div className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-500">{label}</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3.6: CodeBlock.tsx**

Mono pre with optional line numbers, copy button, and basic syntax highlighting (regex pass).

```tsx
import { useState, type ReactNode } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCopy, faCheck } from '@fortawesome/sharp-duotone-solid-svg-icons';
import { cn } from '@/lib/utils';

const KEYWORDS = /\b(import|from|export|const|let|var|function|return|type|interface|true|false|null|undefined|new|class|extends|if|else|async|await)\b/g;
const STRINGS = /(['"`])((?:\\.|(?!\1)[^\\])*?)\1/g;
const NUMBERS = /\b(\d+(?:\.\d+)?)\b/g;
const COMMENTS = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)/g;
const TYPES = /\b(string|number|boolean|object|any|void|never|unknown|GlobeConfig|MarkersConfig|ArcsConfig|LabelsConfig|GlobeKind|ThemePresetName)\b/g;

function highlight(code: string): ReactNode {
  // Simple multi-pass: split into runs of [type, text] tuples then render.
  // For one-shot landing visuals this is fine; production highlighters would use a tokenizer.
  const tokens: Array<{ kind: string; text: string }> = [];
  let cursor = 0;

  type Match = { start: number; end: number; kind: string; text: string };
  const matches: Match[] = [];

  for (const [re, kind] of [
    [COMMENTS, 'comment'] as const,
    [STRINGS, 'string'] as const,
    [KEYWORDS, 'keyword'] as const,
    [TYPES, 'type'] as const,
    [NUMBERS, 'number'] as const,
  ]) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code))) {
      matches.push({ start: m.index, end: m.index + m[0].length, kind, text: m[0] });
    }
  }

  matches.sort((a, b) => a.start - b.start || b.end - a.end);

  // Drop overlapping (later) matches.
  const filtered: Match[] = [];
  let lastEnd = -1;
  for (const m of matches) {
    if (m.start >= lastEnd) {
      filtered.push(m);
      lastEnd = m.end;
    }
  }

  for (const m of filtered) {
    if (cursor < m.start) tokens.push({ kind: 'plain', text: code.slice(cursor, m.start) });
    tokens.push({ kind: m.kind, text: m.text });
    cursor = m.end;
  }
  if (cursor < code.length) tokens.push({ kind: 'plain', text: code.slice(cursor) });

  const COLOR: Record<string, string> = {
    keyword: 'text-cyan-200',
    string: 'text-amber-200',
    comment: 'text-slate-500',
    number: 'text-emerald-300',
    type: 'text-fuchsia-300',
    plain: 'text-slate-300',
  };

  return tokens.map((t, i) => (
    <span key={i} className={COLOR[t.kind] ?? COLOR.plain}>
      {t.text}
    </span>
  ));
}

export interface CodeBlockProps {
  readonly code: string;
  readonly lineNumbers?: boolean;
  readonly copy?: boolean;
  readonly className?: string;
}

export function CodeBlock({ code, lineNumbers, copy, className }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);
  const lines = code.split('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignored — clipboard api unavailable */
    }
  };

  return (
    <div className={cn('relative rounded-2xl border border-white/[0.08] bg-black/45 backdrop-blur-xl', className)}>
      {copy && (
        <button
          type="button"
          onClick={handleCopy}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-lg border border-white/[0.1] bg-white/[0.045] px-2.5 py-1.5 text-xs text-slate-300 transition-colors hover:border-white/25 hover:text-white"
          aria-label="Copy code"
        >
          <FontAwesomeIcon icon={copied ? faCheck : faCopy} className="size-3" />
          {copied ? 'Copied' : 'Copy'}
        </button>
      )}
      <pre className="overflow-x-auto p-4 font-mono text-[12px] leading-relaxed">
        {lineNumbers ? (
          <div className="grid grid-cols-[auto_1fr] gap-x-4">
            <div className="select-none text-right text-slate-600">
              {lines.map((_, i) => (
                <div key={i}>{i + 1}</div>
              ))}
            </div>
            <code>
              {lines.map((line, i) => (
                <div key={i}>{highlight(line)}</div>
              ))}
            </code>
          </div>
        ) : (
          <code>{highlight(code)}</code>
        )}
      </pre>
    </div>
  );
}
```

- [ ] **Step 3.7: UseCaseChips.tsx**

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faChartArea,
  faRadar,
  faNewspaper,
  faBookOpen,
  faFilm,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { cn } from '@/lib/utils';

const USE_CASES: ReadonlyArray<readonly [IconDefinition, string]> = [
  [faChartArea, 'Dashboards'],
  [faRadar, 'Command Centers'],
  [faNewspaper, 'Editorial'],
  [faBookOpen, 'Education'],
  [faFilm, 'Storytelling'],
];

export interface UseCaseChipsProps {
  readonly variant?: 'compact' | 'expanded';
  readonly className?: string;
}

export function UseCaseChips({ variant = 'compact', className }: UseCaseChipsProps) {
  const expanded = variant === 'expanded';
  return (
    <div className={cn('flex flex-wrap items-center gap-3', className)}>
      {USE_CASES.map(([icon, label]) => (
        <span
          key={label}
          className={cn(
            'inline-flex items-center gap-2 rounded-full border border-white/[0.12] bg-white/[0.035] backdrop-blur-md transition-colors',
            expanded ? 'px-4 py-2.5 text-sm text-slate-200 hover:border-white/25' : 'px-3 py-1.5 text-xs text-slate-300 hover:border-white/22',
          )}
        >
          <FontAwesomeIcon icon={icon} className={cn('text-amber-200', expanded ? 'size-4' : 'size-3.5')} />
          {label}
        </span>
      ))}
    </div>
  );
}
```

- [ ] **Step 3.8: index.ts barrel**

```ts
export { Panel } from './Panel';
export type { PanelProps } from './Panel';
export { OrbitRing } from './OrbitRing';
export { KindBadge } from './KindBadge';
export { ThemeSwatch } from './ThemeSwatch';
export { StatChip } from './StatChip';
export { CodeBlock } from './CodeBlock';
export { UseCaseChips } from './UseCaseChips';
```

- [ ] **Step 3.9: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 4: Hooks — `useInViewport`, `useScrollParallax`

**Files:**
- Create: `examples/vanilla-demo/src/components/home/landing/hooks/use-in-viewport.ts`
- Create: `examples/vanilla-demo/src/components/home/landing/hooks/use-scroll-parallax.ts`

- [ ] **Step 4.1: use-in-viewport.ts**

```ts
import { useEffect, useState, type RefObject } from 'react';

export interface UseInViewportOptions {
  readonly rootMargin?: string;
  readonly threshold?: number | ReadonlyArray<number>;
}

export function useInViewport<T extends Element>(
  ref: RefObject<T | null>,
  options: UseInViewportOptions = {},
): boolean {
  const [inView, setInView] = useState(false);
  const { rootMargin = '0px', threshold = 0.15 } = options;

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          setInView(entry.isIntersecting);
        }
      },
      { rootMargin, threshold: threshold as number | number[] },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, rootMargin, threshold]);

  return inView;
}
```

- [ ] **Step 4.2: use-scroll-parallax.ts**

```ts
import { useEffect, useState, type RefObject } from 'react';

/**
 * Returns the scroll-driven Y offset for a parallax element. The offset is
 * `(window.scrollY - sectionTop) * factor`, clamped to ±maxAbs.
 */
export function useScrollParallax<T extends HTMLElement>(
  ref: RefObject<T | null>,
  factor: number,
  maxAbs: number,
): number {
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    let raf = 0;
    const update = () => {
      const rect = el.getBoundingClientRect();
      const center = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const next = (center - viewportCenter) * factor;
      const clamped = Math.max(-maxAbs, Math.min(maxAbs, next));
      setOffset(clamped);
    };
    const onScroll = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      cancelAnimationFrame(raf);
    };
  }, [ref, factor, maxAbs]);

  return offset;
}
```

- [ ] **Step 4.3: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 5: Data — `kind-themes.ts`, `use-cases.ts`

**Files:**
- Create: `examples/vanilla-demo/src/components/home/landing/data/kind-themes.ts`
- Create: `examples/vanilla-demo/src/components/home/landing/data/use-cases.ts`

- [ ] **Step 5.1: kind-themes.ts**

First check the actual exported preset names in `packages/core/src/theme/presets.ts` and pick 3–4 per kind that are currently shipped. Run:

```bash
grep -E "'[a-z]+-[a-z]+'" /Users/witek/repos/globio/packages/core/src/theme/presets.ts | head -30
```

Then assemble:

```ts
import type { GlobeKind, ThemePresetName } from '@globiojs/core';

export interface KindThemeEntry {
  readonly preset: ThemePresetName;
  readonly label: string;
  readonly swatch: string;
}

export const KIND_THEMES: Readonly<Record<GlobeKind, ReadonlyArray<KindThemeEntry>>> = {
  outline: [
    { preset: 'outline-sunset', label: 'Sunset', swatch: '#fbbf24' },
    { preset: 'outline-dark', label: 'Dark', swatch: '#3b4252' },
    { preset: 'outline-cyan', label: 'Cyan', swatch: '#22d3ee' },
  ],
  dotted: [
    { preset: 'dotted-dark', label: 'Dark', swatch: '#67e8f9' },
    { preset: 'dotted-day', label: 'Day', swatch: '#fde68a' },
    { preset: 'dotted-magenta', label: 'Magenta', swatch: '#f472b6' },
  ],
  wireframe: [
    { preset: 'wireframe-tron', label: 'Tron', swatch: '#a78bfa' },
    { preset: 'wireframe-amber', label: 'Amber', swatch: '#fbbf24' },
    { preset: 'wireframe-mint', label: 'Mint', swatch: '#86efac' },
  ],
  hologram: [
    { preset: 'hologram-cyan', label: 'Cyan', swatch: '#22d3ee' },
    { preset: 'hologram-violet', label: 'Violet', swatch: '#c084fc' },
    { preset: 'hologram-rose', label: 'Rose', swatch: '#f472b6' },
  ],
  paper: [
    { preset: 'paper-default', label: 'Atlas', swatch: '#f2c15b' },
    { preset: 'paper-vintage', label: 'Vintage', swatch: '#d97706' },
    { preset: 'paper-mono', label: 'Mono', swatch: '#94a3b8' },
  ],
};

export const KIND_ACCENT: Readonly<Record<GlobeKind, string>> = {
  outline: '#fbbf24',
  dotted: '#67e8f9',
  wireframe: '#a78bfa',
  hologram: '#22d3ee',
  paper: '#f2c15b',
};
```

**Important:** verify each preset name actually exists in the core's `THEME_PRESETS` constant. If a preset doesn't exist (e.g. `dotted-magenta`), pick the next-best one that does (e.g. `dotted-aurora` or fall back to a 2-entry list for that kind). Adjust the entries based on what actually compiles.

- [ ] **Step 5.2: use-cases.ts**

Already covered by `atoms/UseCaseChips.tsx` Task 3.7 — its constant array is co-located with the component since the data is short and used only there. Skip a separate file.

- [ ] **Step 5.3: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0. If a preset name is invalid, the compiler will tell you which — adjust.

---

### Task 6: Hero rebuild

**Files (all under `examples/vanilla-demo/src/components/home/landing/`):**
- Replace: `HeroStage.tsx`
- Create: `hero/HeroLeftRail.tsx`
- Create: `hero/HeroCenterStage.tsx`
- Create: `hero/HeroOrbitRig.tsx`
- Create: `hero/HeroDataAnchors.tsx`
- Create: `hero/HeroHudReadout.tsx`
- Create: `hero/HeroFloorGlow.tsx`
- Create: `hero/HeroRightRail.tsx`
- Create: `hero/HeroKindCard.tsx`
- Create: `hero/HeroThemeSwatchRow.tsx`
- Create: `hero/HeroCodePreview.tsx`
- Create: `hero/HeroStatInstruments.tsx`

- [ ] **Step 6.1: Composition root — HeroStage.tsx**

Holds `activeKind` + `activeTheme` state, references to the GlobeInstance for projection, applies `--hero-accent` CSS variable.

```tsx
import { useEffect, useMemo, useRef, useState } from 'react';
import type { GlobeKind, GlobeInstance, StarfieldConfig, ThemePresetName } from '@globiojs/core';
import { KIND_ACCENT, KIND_THEMES } from './data/kind-themes';
import { HeroLeftRail } from './hero/HeroLeftRail';
import { HeroCenterStage } from './hero/HeroCenterStage';
import { HeroRightRail } from './hero/HeroRightRail';
import { HeroStatInstruments } from './hero/HeroStatInstruments';

export function HeroStage() {
  const [activeKind, setActiveKind] = useState<GlobeKind>('outline');
  const [activeTheme, setActiveTheme] = useState<ThemePresetName>(KIND_THEMES.outline[0].preset);
  const globeApiRef = useRef<{ instance: GlobeInstance; project: GlobeInstance['project'] } | null>(null);
  const accent = KIND_ACCENT[activeKind];

  // When kind changes, snap theme to that kind's first preset.
  useEffect(() => {
    setActiveTheme(KIND_THEMES[activeKind][0].preset);
  }, [activeKind]);

  return (
    <section
      className="relative isolate overflow-hidden bg-[#03060c] px-6 pb-12 pt-24"
      style={{
        ['--hero-accent' as string]: accent,
        minHeight: 'min(110vh, 1320px)',
        transition: 'background-color 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      {/* Layered background — radial cool spots + dot grid + bottom fade */}
      <div className="absolute inset-0 -z-40 bg-[radial-gradient(circle_at_48%_32%,rgba(56,189,248,0.16),transparent_28%),radial-gradient(circle_at_72%_30%,rgba(251,191,36,0.12),transparent_24%),linear-gradient(180deg,#01040a_0%,#07111c_52%,#05080f_100%)]" />
      <div className="absolute inset-0 -z-30 opacity-50 [background-image:radial-gradient(circle_at_center,rgba(255,255,255,0.22)_1px,transparent_1.7px)] [background-size:46px_46px]" />
      <div className="absolute inset-x-0 bottom-0 -z-10 h-44 bg-[linear-gradient(180deg,transparent_0%,rgba(2,6,12,0.95)_46%,#02040a_100%)]" />

      <div className="mx-auto grid max-w-[1880px] grid-cols-[minmax(360px,420px)_minmax(560px,1fr)_minmax(360px,420px)] items-stretch gap-8 max-[1500px]:grid-cols-[minmax(300px,360px)_minmax(500px,1fr)_minmax(320px,380px)] max-[1500px]:gap-5">
        <HeroLeftRail />
        <HeroCenterStage
          activeKind={activeKind}
          activeTheme={activeTheme}
          accent={accent}
          onReady={(api) => {
            globeApiRef.current = api;
          }}
        />
        <HeroRightRail
          activeKind={activeKind}
          activeTheme={activeTheme}
          onKindChange={setActiveKind}
          onThemeChange={setActiveTheme}
        />
      </div>

      <HeroStatInstruments className="mt-10" />
    </section>
  );
}
```

- [ ] **Step 6.2: HeroLeftRail.tsx**

```tsx
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRight, faGlobePointer, faPlay, faBracketsCurly, faCube, faGaugeHigh } from '@fortawesome/sharp-duotone-solid-svg-icons';

const PROOF = [
  [faBracketsCurly, 'TypeScript first'],
  [faCube, 'Tree-shakeable'],
  [faGaugeHigh, '60 FPS engine'],
] as const;

export function HeroLeftRail() {
  return (
    <div className="relative z-20 flex flex-col justify-center pt-14">
      <div className="mb-8 inline-flex w-fit overflow-hidden rounded-full border border-white/[0.12] bg-white/[0.045] p-1 text-xs text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl">
        <span className="inline-flex items-center gap-2 rounded-full bg-emerald-300/15 px-3 py-1.5 font-semibold uppercase tracking-[0.18em] text-emerald-300">
          <span className="relative flex size-1.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70" />
            <span className="relative inline-flex size-1.5 rounded-full bg-emerald-300" />
          </span>
          Live
        </span>
        <span className="px-3 py-1.5">Five visual personalities</span>
      </div>

      <h1 className="max-w-[520px] text-balance text-[clamp(4rem,5vw,5.6rem)] font-semibold leading-[0.94] tracking-tight text-white">
        Five globes. <span style={{ color: 'var(--hero-accent)', textShadow: '0 0 28px var(--hero-accent)' }}>One engine.</span> Zero ceiling.
      </h1>
      <p className="mt-7 max-w-[440px] text-base leading-relaxed text-slate-300 sm:text-lg">
        A modern WebGL globe library with five visual personalities, nine canonical layers, and a typed runtime that ships in production.
      </p>

      <div className="mt-9 flex flex-wrap items-center gap-3">
        <Link
          to="/studio"
          className="group inline-flex h-[54px] items-center gap-3 overflow-hidden rounded-full bg-amber-200 px-6 text-sm font-semibold text-slate-950 shadow-[0_20px_70px_-18px_var(--hero-accent)] transition-transform hover:-translate-y-0.5"
          style={{ background: 'var(--hero-accent)' }}
        >
          <FontAwesomeIcon icon={faGlobePointer} className="size-4" />
          Open Studio
          <FontAwesomeIcon icon={faArrowUpRight} className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
        </Link>
        <a
          href="#kinds"
          className="inline-flex h-[54px] items-center gap-3 rounded-full border border-white/[0.13] bg-white/[0.035] px-6 text-sm font-semibold text-slate-200 backdrop-blur-xl transition-all hover:border-white/25 hover:bg-white/[0.065]"
        >
          <FontAwesomeIcon icon={faPlay} className="size-3.5 text-cyan-200" />
          Explore kinds
        </a>
      </div>

      <div className="mt-10 flex flex-wrap gap-x-7 gap-y-2 text-sm text-slate-400">
        {PROOF.map(([icon, label]) => (
          <span key={label} className="inline-flex items-center gap-2">
            <FontAwesomeIcon icon={icon} className="size-3.5 text-slate-200" />
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6.3: HeroCenterStage.tsx + sub-components**

Implement per spec section "Chapter 1 — Hero / Center stage". Code skeleton:

```tsx
import { useState, type ReactNode } from 'react';
import type { GlobeKind, ThemePresetName, StarfieldConfig } from '@globiojs/core';
import { DecorationGlobe, type DecorationGlobeReadyApi } from '@/components/shared';
import { HeroOrbitRig } from './HeroOrbitRig';
import { HeroDataAnchors } from './HeroDataAnchors';
import { HeroHudReadout } from './HeroHudReadout';
import { HeroFloorGlow } from './HeroFloorGlow';

const HERO_STARFIELD: StarfieldConfig = {
  enabled: true,
  density: 1500,
  size: 1.05,
  sizeVariety: 0.74,
  palette: ['#ffffff', '#ffe9c4', '#67e8f9', '#f472b6', '#86efac'],
  twinkle: { enabled: true, intensity: 0.58, speed: 0.34 },
};

export interface HeroCenterStageProps {
  readonly activeKind: GlobeKind;
  readonly activeTheme: ThemePresetName;
  readonly accent: string;
  readonly onReady?: (api: DecorationGlobeReadyApi) => void;
}

export function HeroCenterStage({ activeKind, activeTheme, accent, onReady }: HeroCenterStageProps) {
  const [api, setApi] = useState<DecorationGlobeReadyApi | null>(null);
  const initialLng = activeKind === 'paper' ? -62 : -42;

  return (
    <div className="relative z-10 mx-auto flex w-full items-center justify-center self-center [aspect-ratio:1]" style={{ height: 'clamp(560px, 64vh, 780px)' }}>
      <HeroOrbitRig accent={accent} />
      <HeroFloorGlow accent={accent} />

      <div
        className="absolute left-1/2 top-1/2 size-[min(56vw,760px)] -translate-x-1/2 -translate-y-1/2"
        style={{
          WebkitMaskImage: 'radial-gradient(circle closest-side at center, #000 0%, #000 68%, transparent 100%)',
          maskImage: 'radial-gradient(circle closest-side at center, #000 0%, #000 68%, transparent 100%)',
        }}
      >
        <DecorationGlobe
          key={activeKind}
          kind={activeKind}
          theme={activeTheme}
          speed={0.018}
          initialLat={13}
          initialLng={initialLng}
          axisTilt={23.5}
          starfield={HERO_STARFIELD}
          atmosphere
          framingPadding={0.02}
          interactive
          onReady={(readyApi) => {
            setApi(readyApi);
            onReady?.(readyApi);
          }}
          className="absolute inset-0"
        />
      </div>

      <HeroHudReadout />
      <HeroDataAnchors api={api} />
    </div>
  );
}
```

- [ ] **Step 6.4: HeroOrbitRig.tsx**

```tsx
import { OrbitRing } from '../atoms/OrbitRing';

export interface HeroOrbitRigProps {
  readonly accent: string;
}

export function HeroOrbitRig({ accent }: HeroOrbitRigProps) {
  return (
    <>
      {/* Horizontal ring */}
      <OrbitRing
        width={980}
        height={510}
        rotateDeg={-17}
        borderColor={`${accent}73`}
        glowColor={accent}
        opacity={0.85}
        className="hero-orbit hero-orbit--slow"
      />
      {/* Tilted ring */}
      <OrbitRing
        width={1040}
        height={470}
        rotateDeg={20}
        borderColor="rgba(103, 232, 249, 0.34)"
        glowColor="rgba(103, 232, 249, 0.95)"
        opacity={0.7}
      />
      {/* Trajectory arc — drawn as half-ellipse with dashed border-top */}
      <div
        className="absolute left-1/2 top-1/2 h-[740px] w-[1080px] -translate-x-1/2 -translate-y-1/2 rounded-[50%] border-t border-dashed"
        style={{ borderColor: `${accent}55`, transform: 'translate(-50%, -52%) rotate(-8deg)' }}
      />
    </>
  );
}
```

- [ ] **Step 6.5: HeroDataAnchors.tsx**

```tsx
import { useEffect, useState } from 'react';
import type { DecorationGlobeReadyApi } from '@/components/shared';

interface Anchor {
  readonly lat: number;
  readonly lng: number;
  readonly label: string;
  readonly meta: string;
}

const ANCHORS: ReadonlyArray<Anchor> = [
  { lat: 40.7, lng: -74.0, label: 'LIVE TRACE', meta: '40.7°N · 74.0°W' },
  { lat: -23.5, lng: -46.6, label: 'SIGNAL FEED', meta: '23.5°S · 46.6°W' },
];

export interface HeroDataAnchorsProps {
  readonly api: DecorationGlobeReadyApi | null;
}

export function HeroDataAnchors({ api }: HeroDataAnchorsProps) {
  const [positions, setPositions] = useState<Array<readonly [number, number] | null>>([null, null]);

  useEffect(() => {
    if (!api) return undefined;
    let raf = 0;
    const tick = () => {
      const next = ANCHORS.map((a) => api.project(a.lat, a.lng));
      setPositions(next);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [api]);

  return (
    <>
      {ANCHORS.map((anchor, i) => {
        const pos = positions[i];
        if (!pos) return null;
        return (
          <div
            key={anchor.label}
            className="pointer-events-none absolute z-30 -translate-x-1/2 -translate-y-full rounded-xl border border-white/[0.12] bg-black/55 px-3 py-2 text-[10px] text-slate-300 shadow-[0_12px_40px_-22px_rgba(0,0,0,1)] backdrop-blur-xl"
            style={{ left: pos[0], top: pos[1], transition: 'left 60ms linear, top 60ms linear' }}
          >
            <div className="font-mono font-semibold tracking-[0.16em] text-white">{anchor.label}</div>
            <div className="mt-0.5 font-mono text-[9px] text-slate-400">{anchor.meta}</div>
          </div>
        );
      })}
    </>
  );
}
```

- [ ] **Step 6.6: HeroHudReadout.tsx**

Static-ish HUD readout. Simulated FPS / lat / lng (cycle a fake value).

```tsx
import { useEffect, useState } from 'react';

export function HeroHudReadout() {
  const [fps, setFps] = useState(60);
  useEffect(() => {
    const id = setInterval(() => setFps(58 + Math.floor(Math.random() * 3)), 800);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="pointer-events-none absolute right-6 top-6 z-30 rounded-lg border border-white/[0.1] bg-black/45 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-300 backdrop-blur-md">
      <div>lat: 13.0°N</div>
      <div>lng: -42.0°W</div>
      <div className="mt-0.5 text-amber-200/80">{fps} fps</div>
    </div>
  );
}
```

- [ ] **Step 6.7: HeroFloorGlow.tsx**

```tsx
export interface HeroFloorGlowProps {
  readonly accent: string;
}

export function HeroFloorGlow({ accent }: HeroFloorGlowProps) {
  return (
    <div
      className="pointer-events-none absolute inset-x-0 bottom-0 -z-5 h-44"
      style={{
        background: `radial-gradient(ellipse 60% 100% at 50% 100%, ${accent}26 0%, transparent 70%)`,
        transition: 'background 280ms cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    />
  );
}
```

- [ ] **Step 6.8: HeroRightRail.tsx + sub-components**

```tsx
import type { GlobeKind, ThemePresetName } from '@globiojs/core';
import { KIND_THEMES, KIND_ACCENT } from '../data/kind-themes';
import { HeroKindCard } from './HeroKindCard';
import { HeroThemeSwatchRow } from './HeroThemeSwatchRow';
import { HeroCodePreview } from './HeroCodePreview';

const KIND_LIST: ReadonlyArray<{ id: GlobeKind; label: string; caption: string }> = [
  { id: 'outline', label: 'Outline', caption: 'Crisp borders & glow' },
  { id: 'dotted', label: 'Dotted', caption: 'Stippled data feel' },
  { id: 'wireframe', label: 'Wireframe', caption: 'Pure topology' },
  { id: 'hologram', label: 'Hologram', caption: 'Futuristic scanlines' },
  { id: 'paper', label: 'Paper', caption: 'Atlas & ink texture' },
];

export interface HeroRightRailProps {
  readonly activeKind: GlobeKind;
  readonly activeTheme: ThemePresetName;
  readonly onKindChange: (kind: GlobeKind) => void;
  readonly onThemeChange: (theme: ThemePresetName) => void;
}

export function HeroRightRail({ activeKind, activeTheme, onKindChange, onThemeChange }: HeroRightRailProps) {
  const themes = KIND_THEMES[activeKind];

  return (
    <div className="relative z-20 flex flex-col gap-4 pt-16 max-[1500px]:gap-3 max-[1500px]:pt-8">
      <div className="grid gap-2.5">
        {KIND_LIST.map((kind) => (
          <HeroKindCard
            key={kind.id}
            kind={kind.id}
            theme={KIND_THEMES[kind.id][0].preset}
            label={kind.label}
            caption={kind.caption}
            active={activeKind === kind.id}
            accent={KIND_ACCENT[kind.id]}
            onClick={() => onKindChange(kind.id)}
          />
        ))}
      </div>

      <HeroThemeSwatchRow themes={themes} active={activeTheme} onSelect={onThemeChange} />
      <HeroCodePreview kind={activeKind} theme={activeTheme} />
    </div>
  );
}
```

- [ ] **Step 6.9: HeroKindCard.tsx**

Same shape as `KindBadge` but inlined here so the active glow uses kind-accent color and the layout matches the right-rail row format.

```tsx
import type { GlobeKind, ThemePresetName, StarfieldConfig } from '@globiojs/core';
import { DecorationGlobe } from '@/components/shared';
import { cn } from '@/lib/utils';

const NO_STARS: StarfieldConfig = { enabled: false };

export interface HeroKindCardProps {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
  readonly label: string;
  readonly caption: string;
  readonly active: boolean;
  readonly accent: string;
  readonly onClick: () => void;
}

export function HeroKindCard({ kind, theme, label, caption, active, accent, onClick }: HeroKindCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group grid grid-cols-[68px_1fr] items-center gap-3 rounded-2xl border bg-white/[0.035] p-2.5 text-left backdrop-blur-xl transition-all duration-300',
        active
          ? 'shadow-[0_0_34px_-14px_currentColor,inset_0_1px_0_rgba(255,255,255,0.08)]'
          : 'border-white/[0.12] hover:border-white/25 hover:bg-white/[0.055]',
      )}
      style={active ? { borderColor: `${accent}b0`, color: accent } : undefined}
    >
      <span className="relative block size-[60px] overflow-hidden rounded-xl border border-white/[0.1] bg-black/35">
        <DecorationGlobe
          kind={kind}
          theme={theme}
          speed={0.012}
          initialLat={12}
          initialLng={kind === 'paper' ? -30 : -44}
          starfield={NO_STARS}
          atmosphere
          framingPadding={0.04}
          className="absolute inset-0"
        />
      </span>
      <span>
        <span className="block text-sm font-semibold text-white">{label}</span>
        <span className="mt-0.5 block text-xs text-slate-400">{caption}</span>
      </span>
    </button>
  );
}
```

- [ ] **Step 6.10: HeroThemeSwatchRow.tsx**

```tsx
import type { ThemePresetName } from '@globiojs/core';
import { ThemeSwatch } from '../atoms';
import type { KindThemeEntry } from '../data/kind-themes';

export interface HeroThemeSwatchRowProps {
  readonly themes: ReadonlyArray<KindThemeEntry>;
  readonly active: ThemePresetName;
  readonly onSelect: (theme: ThemePresetName) => void;
}

export function HeroThemeSwatchRow({ themes, active, onSelect }: HeroThemeSwatchRowProps) {
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-white/[0.08] bg-white/[0.025] p-3 backdrop-blur-xl">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">themes</span>
      <div className="ml-auto flex gap-2">
        {themes.map((t) => (
          <ThemeSwatch
            key={t.preset}
            color={t.swatch}
            label={t.label}
            active={active === t.preset}
            onClick={() => onSelect(t.preset)}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 6.11: HeroCodePreview.tsx**

Compact code block, single tab (Vanilla) — full multi-framework playground lives in chapter 6.

```tsx
import type { GlobeKind, ThemePresetName } from '@globiojs/core';
import { CodeBlock } from '../atoms';

export interface HeroCodePreviewProps {
  readonly kind: GlobeKind;
  readonly theme: ThemePresetName;
}

export function HeroCodePreview({ kind, theme }: HeroCodePreviewProps) {
  const code = `import { createGlobe } from '@globiojs/core';

const globe = createGlobe({
  kind: '${kind}',
  theme: '${theme}',
  autoRotate: { enabled: true },
});

globe.mount();`;

  return (
    <div className="rounded-3xl border border-white/[0.12] bg-[#07111c]/85 p-3 shadow-[0_22px_70px_-40px_var(--hero-accent)] backdrop-blur-xl">
      <CodeBlock code={code} copy lineNumbers={false} />
    </div>
  );
}
```

- [ ] **Step 6.12: HeroStatInstruments.tsx**

```tsx
import { faBolt, faCheck, faGaugeHigh, faGrid2, faLayerGroup, faSparkles } from '@fortawesome/sharp-duotone-solid-svg-icons';
import { StatChip } from '../atoms';
import { cn } from '@/lib/utils';

const STATS = [
  { icon: faGrid2, value: '5', label: 'Visual kinds' },
  { icon: faLayerGroup, value: '9', label: 'Canonical layers' },
  { icon: faBolt, value: '4', label: 'Frameworks' },
  { icon: faGaugeHigh, value: '60 FPS', label: 'WebGL engine' },
  { icon: faCheck, value: '0', label: 'Dependencies' },
  { icon: faSparkles, value: 'MIT', label: 'Open source' },
] as const;

export function HeroStatInstruments({ className }: { readonly className?: string }) {
  return (
    <div className={cn(
      'relative z-20 mx-auto max-w-[1500px] rounded-3xl border border-white/[0.12] bg-[#09131f]/80 px-4 py-5 shadow-[0_24px_80px_-45px_rgba(34,211,238,0.6),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-2xl',
      className,
    )}>
      <div className="grid grid-cols-6 divide-x divide-white/[0.08]">
        {STATS.map((s) => <StatChip key={s.label} {...s} />)}
      </div>
    </div>
  );
}
```

- [ ] **Step 6.13: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 7: Personalities chapter

**Files:**
- Create: `examples/vanilla-demo/src/components/home/landing/KindPersonalitiesSection.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/personalities/PersonalityRow.tsx`

- [ ] **Step 7.1: KindPersonalitiesSection.tsx**

```tsx
import type { GlobeKind } from '@globiojs/core';
import { SectionHeader } from '@/components/shared';
import { PersonalityRow } from './personalities/PersonalityRow';

interface KindCopy {
  readonly id: GlobeKind;
  readonly index: string;
  readonly tagline: string;
  readonly description: string;
}

const KINDS: ReadonlyArray<KindCopy> = [
  {
    id: 'outline',
    index: '01',
    tagline: 'Editorial command center.',
    description: 'Crisp continent borders, glowing seas, sunrise terminator. The default flagship for product dashboards and reportage that needs to look like it belongs above the fold.',
  },
  {
    id: 'dotted',
    index: '02',
    tagline: 'Stippled data atlas.',
    description: 'Continents rendered as quietly-tuned dot fields. Choropleth and tinting modes feel native, ripple animations propagate cleanly. Pairs especially well with point-data visualizations.',
  },
  {
    id: 'wireframe',
    index: '03',
    tagline: 'Pure topology.',
    description: 'Geometric line work over a translucent shell. Made for engineering-side narratives — performance dashboards, network visualization, structural storytelling.',
  },
  {
    id: 'hologram',
    index: '04',
    tagline: 'Future-tense projection.',
    description: 'Animated scanlines, fresnel atmospheres, subtle holographic shimmer. The cinematic option — works on dark backgrounds and looks sharper at large scale.',
  },
  {
    id: 'paper',
    index: '05',
    tagline: 'Tactile educational atlas.',
    description: 'Hand-drawn ink, paper grain, vintage labels. The most editorial of the five. Use it for storytelling, education, museum work, or anything that wants to feel earned.',
  },
];

export function KindPersonalitiesSection() {
  return (
    <section id="kinds" className="relative overflow-hidden bg-[#02050b] px-6 py-28">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_20%_0%,rgba(34,211,238,0.1),transparent_24%),radial-gradient(circle_at_74%_18%,rgba(251,191,36,0.08),transparent_28%),linear-gradient(180deg,#02050b_0%,#07111b_46%,#02050b_100%)]" />

      <div className="mx-auto mb-16 max-w-7xl">
        <SectionHeader
          eyebrow="Five personalities"
          title="Same engine. Five distinct globes."
          sub="Outline, dotted, wireframe, hologram, paper — each one is a real renderer, not a colorway. Pick the personality that fits the story."
        />
      </div>

      <div className="mx-auto max-w-[1480px] space-y-10">
        {KINDS.map((k, i) => (
          <PersonalityRow
            key={k.id}
            kind={k.id}
            index={k.index}
            tagline={k.tagline}
            description={k.description}
            mirror={i % 2 === 1}
          />
        ))}
      </div>
    </section>
  );
}
```

- [ ] **Step 7.2: PersonalityRow.tsx**

```tsx
import { Link } from 'react-router-dom';
import { useRef, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowUpRight } from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { GlobeKind, ThemePresetName, StarfieldConfig } from '@globiojs/core';
import { DecorationGlobe } from '@/components/shared';
import { useInViewport } from '../hooks/use-in-viewport';
import { KIND_ACCENT, KIND_THEMES } from '../data/kind-themes';
import { ThemeSwatch } from '../atoms';
import { cn } from '@/lib/utils';

const ROW_STARFIELD: StarfieldConfig = {
  enabled: true,
  density: 600,
  size: 0.95,
  sizeVariety: 0.6,
  palette: ['#ffffff', '#ffe9c4'],
  twinkle: { enabled: true, intensity: 0.4, speed: 0.28 },
};

export interface PersonalityRowProps {
  readonly kind: GlobeKind;
  readonly index: string;
  readonly tagline: string;
  readonly description: string;
  readonly mirror: boolean;
}

export function PersonalityRow({ kind, index, tagline, description, mirror }: PersonalityRowProps) {
  const rowRef = useRef<HTMLDivElement | null>(null);
  const inView = useInViewport(rowRef, { threshold: 0.25 });
  const accent = KIND_ACCENT[kind];
  const themes = KIND_THEMES[kind];
  const [activeTheme, setActiveTheme] = useState<ThemePresetName>(themes[0].preset);
  const initialLng = kind === 'paper' ? -30 : -44;

  return (
    <div
      ref={rowRef}
      className={cn(
        'relative grid items-center gap-10 overflow-hidden rounded-[2.4rem] border border-white/[0.08] p-10',
        mirror ? 'lg:grid-cols-[1fr_minmax(420px,560px)]' : 'lg:grid-cols-[minmax(420px,560px)_1fr]',
      )}
      style={{
        background: `linear-gradient(135deg, ${accent}10 0%, transparent 70%), #050812`,
      }}
    >
      <div className={cn('relative aspect-square w-full max-w-[560px]', mirror && 'lg:order-2')}>
        <div
          className="absolute left-1/2 top-1/2 size-[88%] -translate-x-1/2 -translate-y-1/2"
          style={{
            WebkitMaskImage: 'radial-gradient(circle closest-side at center, #000 0%, #000 70%, transparent 100%)',
            maskImage: 'radial-gradient(circle closest-side at center, #000 0%, #000 70%, transparent 100%)',
          }}
        >
          {inView && (
            <DecorationGlobe
              key={`${kind}-${activeTheme}`}
              kind={kind}
              theme={activeTheme}
              speed={0.018}
              initialLat={12}
              initialLng={initialLng}
              starfield={ROW_STARFIELD}
              atmosphere
              framingPadding={0.05}
              className="absolute inset-0"
            />
          )}
        </div>
      </div>

      <div className={cn(mirror && 'lg:order-1')}>
        <div className="mb-3 flex items-center gap-3 font-mono text-xs uppercase tracking-[0.22em] text-slate-500">
          <span style={{ color: accent }}>{index}</span>
          <span className="h-px flex-1 max-w-[60px] bg-white/[0.1]" />
          <span>{kind}</span>
        </div>
        <h3 className="text-balance text-[clamp(2rem,3vw,2.6rem)] font-semibold leading-[1.05] text-white">
          {tagline}
        </h3>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-slate-400">{description}</p>

        <div className="mt-6 flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500">themes</span>
          <div className="flex gap-2">
            {themes.map((t) => (
              <ThemeSwatch
                key={t.preset}
                color={t.swatch}
                label={t.label}
                active={activeTheme === t.preset}
                onClick={() => setActiveTheme(t.preset)}
              />
            ))}
          </div>
        </div>

        <Link
          to={`/studio?kind=${kind}&theme=${activeTheme}`}
          className="mt-8 inline-flex items-center gap-2 text-sm font-semibold transition-colors"
          style={{ color: accent }}
        >
          Open in Studio
          <FontAwesomeIcon icon={faArrowUpRight} className="size-3" />
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 7.3: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 8: Anatomy chapter

**Files:**
- Create: `examples/vanilla-demo/src/components/home/landing/LayerAnatomySection.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/anatomy/LayerCard.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/anatomy/AnatomyDiagram.tsx`

- [ ] **Step 8.1: LayerAnatomySection.tsx**

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faAperture,
  faBadgeCheck,
  faBullseyePointer,
  faChartMixed,
  faCrosshairs,
  faDrawPolygon,
  faEarthEurope,
  faLocationDot,
  faMoonStars,
  faRoute,
} from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { SectionHeader } from '@/components/shared';
import { LayerCard } from './anatomy/LayerCard';
import { AnatomyDiagram } from './anatomy/AnatomyDiagram';

interface LayerSpec {
  readonly name: string;
  readonly contract: string;
  readonly icon: IconDefinition;
  readonly accent: string;
}

const LAYERS: ReadonlyArray<LayerSpec> = [
  { name: 'starfield', contract: 'Backdrop points or constellations.', icon: faMoonStars, accent: '#c084fc' },
  { name: 'atmosphere', contract: 'Halo, fresnel, or material glow.', icon: faEarthEurope, accent: '#67e8f9' },
  { name: 'country-fill', contract: 'None, always, palette, or data.', icon: faChartMixed, accent: '#f59e0b' },
  { name: 'arcs', contract: 'Lat/lng route animation.', icon: faRoute, accent: '#22d3ee' },
  { name: 'markers', contract: 'Point data with hover and pulse.', icon: faLocationDot, accent: '#fb7185' },
  { name: 'selection', contract: 'Hover and pinned country state.', icon: faDrawPolygon, accent: '#34d399' },
  { name: 'labels', contract: 'DOM country labels with occlusion.', icon: faBadgeCheck, accent: '#fbbf24' },
  { name: 'focus-pulse', contract: 'Click and focus wavefront.', icon: faBullseyePointer, accent: '#f472b6' },
  { name: 'crosshair', contract: 'HUD cursor readout.', icon: faCrosshairs, accent: '#a78bfa' },
];

export function LayerAnatomySection() {
  return (
    <section id="architecture" className="relative overflow-hidden py-28">
      <div className="absolute inset-x-0 top-0 -z-10 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="absolute inset-0 -z-20 bg-[linear-gradient(180deg,transparent_0%,rgba(255,255,255,0.025)_48%,transparent_100%)]" />

      <div className="mx-auto max-w-[1480px] px-6">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <SectionHeader
              align="left"
              eyebrow="Canonical layers"
              title="Nine layers. Owned by every kind."
              sub="The public names stay predictable, the renderer behind each layer belongs to the active kind. Dotted markers don't look like outline markers, paper arcs don't behave like hologram arcs."
            />
            <div className="mt-8 grid grid-cols-2 gap-3">
              {[
                ['setMarkers()', 'same API shape'],
                ['setArcs()', 'kind-native render'],
                ['setCountryData()', 'choropleth path'],
                ['globe.update()', 'no full rebuild'],
              ].map(([label, desc]) => (
                <div key={label} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <div className="font-mono text-sm text-white">{label}</div>
                  <div className="mt-1 text-xs text-slate-500">{desc}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {LAYERS.map((layer) => (
              <LayerCard key={layer.name} {...layer} />
            ))}
          </div>
        </div>

        <AnatomyDiagram className="mt-20" />
      </div>

      <FontAwesomeIcon icon={faAperture} className="pointer-events-none absolute -bottom-16 -right-12 -z-10 size-80 text-white/[0.025]" />
    </section>
  );
}
```

- [ ] **Step 8.2: LayerCard.tsx**

```tsx
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { KIND_ACCENT } from '../data/kind-themes';

const KINDS = ['outline', 'dotted', 'wireframe', 'hologram', 'paper'] as const;

export interface LayerCardProps {
  readonly name: string;
  readonly contract: string;
  readonly icon: IconDefinition;
  readonly accent: string;
}

export function LayerCard({ name, contract, icon, accent }: LayerCardProps) {
  return (
    <Link
      to={`/studio?layer=${name}`}
      className="group relative flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.025] p-5 transition-all duration-300 hover:-translate-y-0.5 hover:border-white/[0.18]"
      style={{ ['--card-accent' as string]: accent }}
    >
      <span
        className="mb-4 flex size-11 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30"
        style={{ color: accent }}
      >
        <FontAwesomeIcon icon={icon} className="size-5" />
      </span>
      <div className="font-mono text-base font-semibold text-white">{name}</div>
      <p className="mt-1 text-sm leading-relaxed text-slate-400">{contract}</p>

      <div className="mt-5 flex items-center gap-2">
        <span className="text-[9px] uppercase tracking-[0.18em] text-slate-500">native in</span>
        <div className="flex gap-1.5">
          {KINDS.map((k) => (
            <span
              key={k}
              className="size-1.5 rounded-full"
              style={{ background: KIND_ACCENT[k], boxShadow: `0 0 8px ${KIND_ACCENT[k]}` }}
              title={k}
            />
          ))}
        </div>
      </div>

      <span
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-300 group-hover:opacity-100"
        style={{ background: `radial-gradient(circle at 30% 0%, ${accent}1f, transparent 60%)` }}
      />
    </Link>
  );
}
```

- [ ] **Step 8.3: AnatomyDiagram.tsx**

A single hologram globe with all layers active and 4 callout annotations.

```tsx
import type { StarfieldConfig } from '@globiojs/core';
import { DecorationGlobe } from '@/components/shared';
import { cn } from '@/lib/utils';

const STARS: StarfieldConfig = {
  enabled: true,
  density: 1100,
  size: 1,
  sizeVariety: 0.7,
  palette: ['#ffffff', '#67e8f9', '#f472b6'],
  twinkle: { enabled: true, intensity: 0.55, speed: 0.32 },
};

const CALLOUTS: ReadonlyArray<{ readonly label: string; readonly desc: string; readonly className: string }> = [
  { label: 'atmosphere', desc: 'fresnel halo at the terminator', className: 'left-[6%] top-[24%]' },
  { label: 'arcs', desc: 'NYC ↔ Tokyo animated route', className: 'right-[4%] top-[28%]' },
  { label: 'markers', desc: 'pulsing point with hover state', className: 'left-[8%] bottom-[28%]' },
  { label: 'country-fill', desc: 'palette mode on Africa', className: 'right-[6%] bottom-[22%]' },
];

export function AnatomyDiagram({ className }: { readonly className?: string }) {
  return (
    <div className={cn(
      'relative overflow-hidden rounded-[2.4rem] border border-white/[0.08] bg-[#050812]/85 p-10 shadow-[0_40px_140px_-80px_rgba(34,211,238,0.85)] backdrop-blur-xl',
      className,
    )}>
      <div className="relative mx-auto h-[560px] max-w-[1100px]">
        <DecorationGlobe
          kind="hologram"
          theme="hologram-cyan"
          speed={0.018}
          initialLat={12}
          initialLng={-32}
          starfield={STARS}
          atmosphere
          framingPadding={0.06}
          className="absolute inset-0"
        />
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_0%,rgba(5,8,18,0.18)_52%,#050812_94%)]" />

        {CALLOUTS.map((c) => (
          <div
            key={c.label}
            className={cn('absolute z-10 max-w-[200px] rounded-xl border border-white/[0.1] bg-black/55 px-3 py-2 backdrop-blur-md', c.className)}
          >
            <div className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em] text-cyan-200">{c.label}</div>
            <div className="mt-0.5 text-[11px] leading-snug text-slate-400">{c.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 8.4: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 9: Workshop polish

**Files:**
- Modify: `examples/vanilla-demo/src/components/home/landing/StudioWorkflowSection.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/workshop/WorkshopDial.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/workshop/LiveLogStrip.tsx`

- [ ] **Step 9.1: WorkshopDial.tsx — circular gauge**

```tsx
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';

export interface WorkshopDialProps {
  readonly label: string;
  readonly value: number;          // 0..100
  readonly icon: IconDefinition;
  readonly color: string;
}

export function WorkshopDial({ label, value, icon, color }: WorkshopDialProps) {
  const radius = 22;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - value / 100);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-3">
      <div className="flex items-center gap-3">
        <svg width="56" height="56" viewBox="0 0 56 56" className="shrink-0">
          <circle cx="28" cy="28" r={radius} stroke="rgba(255,255,255,0.08)" strokeWidth="3" fill="none" />
          <circle
            cx="28"
            cy="28"
            r={radius}
            stroke={color}
            strokeWidth="3"
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
            transform="rotate(-90 28 28)"
            style={{ filter: `drop-shadow(0 0 6px ${color})` }}
          />
        </svg>
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs text-slate-300">
            <FontAwesomeIcon icon={icon} className="size-3" style={{ color }} />
            {label}
          </div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-500">{value}%</div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 9.2: LiveLogStrip.tsx**

```tsx
import { useEffect, useState } from 'react';

const LINES: ReadonlyArray<readonly [string, string]> = [
  ['$ globe.update({ markers: { count: 42 } })', '✔ 4ms'],
  ['$ globe.setStory({ scenes: [...] })', '✔ 12ms'],
  ['$ workshop.live(arcs.glow, 0.8)', '✔ 1ms'],
  ['$ globe.update({ theme: "hologram-cyan" })', '✔ 6ms'],
];

export function LiveLogStrip() {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((n) => (n + 1) % LINES.length), 2500);
    return () => clearInterval(id);
  }, []);
  const [cmd, status] = LINES[idx];

  return (
    <div className="rounded-xl border border-white/[0.08] bg-black/55 px-4 py-2.5 font-mono text-[11px] backdrop-blur-md">
      <div className="flex items-center justify-between gap-4">
        <span className="truncate text-slate-300">{cmd}</span>
        <span className="text-emerald-300">{status}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 9.3: Modify StudioWorkflowSection.tsx**

Read the existing file. Replace the `layerDials.map(...)` progress-bar block with `<WorkshopDial>` usage. Replace the bottom 3-cell explainer with the same 3 cells but add a `<LiveLogStrip>` directly below the globe (inside the right pane, above the bottom 3-cell band). Keep the overall structure and the SpotlightCard wrapper.

Specifically: in the current file, the right pane currently contains the globe inside a `<div className="relative min-h-[520px] overflow-hidden bg-[#02030a]">`. Add `<LiveLogStrip />` inside an absolutely-positioned wrapper at the bottom-left of that pane (replacing or alongside the active-preset card).

- [ ] **Step 9.4: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 10: Data & Storytelling chapter (new)

**Files:**
- Create: `examples/vanilla-demo/src/components/home/landing/DataStorySection.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/data-story/StoryTimeline.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/data-story/ChoroplethStage.tsx`

- [ ] **Step 10.1: ChoroplethStage.tsx**

Real `setDataLayer` invocation via `DecorationGlobe`'s `dataLayer` prop. Mock continent data.

```tsx
import { useState } from 'react';
import type { StarfieldConfig } from '@globiojs/core';
import { DecorationGlobe, type DecorationGlobeReadyApi } from '@/components/shared';
import { cn } from '@/lib/utils';

const STARS: StarfieldConfig = {
  enabled: true,
  density: 700,
  size: 1,
  sizeVariety: 0.65,
  palette: ['#ffffff', '#ffe9c4', '#67e8f9'],
  twinkle: { enabled: true, intensity: 0.42, speed: 0.32 },
};

// Mock per-country populations (selection — engine will skip unmapped countries).
const MOCK_DATA = {
  US: { value: 332 },
  CN: { value: 1412 },
  IN: { value: 1380 },
  BR: { value: 213 },
  RU: { value: 144 },
  NG: { value: 219 },
  EG: { value: 109 },
  AU: { value: 26 },
  DE: { value: 84 },
  JP: { value: 125 },
  ZA: { value: 60 },
  AR: { value: 45 },
  ID: { value: 273 },
};

export interface ChoroplethStageProps {
  readonly className?: string;
  readonly onReady?: (api: DecorationGlobeReadyApi) => void;
}

export function ChoroplethStage({ className, onReady }: ChoroplethStageProps) {
  const [api, setApi] = useState<DecorationGlobeReadyApi | null>(null);
  return (
    <div className={cn('relative overflow-hidden rounded-[1.8rem] border border-white/[0.08] bg-[#02030a]', className)}>
      <DecorationGlobe
        kind="paper"
        theme="paper-default"
        speed={0.014}
        initialLat={14}
        initialLng={20}
        starfield={STARS}
        atmosphere
        framingPadding={0.08}
        interactive={false}
        onReady={(ready) => {
          // Apply mock choropleth via instance.setCountryData with a sequential scale.
          ready.instance.setCountryData(MOCK_DATA, {
            type: 'sequential',
            domain: [0, 1500],
            range: ['#22d3ee', '#f472b6'],
          });
          setApi(ready);
          onReady?.(ready);
        }}
        className="absolute inset-0 m-auto size-[min(78vmin,560px)]"
      />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,transparent_0%,rgba(2,3,10,0.18)_52%,#02030a_92%)]" />

      <div className="absolute bottom-4 right-4 rounded-xl border border-white/[0.08] bg-black/55 px-3 py-2 font-mono text-[10px] uppercase tracking-[0.16em] text-slate-400 backdrop-blur-md">
        choropleth · sequential cyan→magenta
      </div>
    </div>
  );
}
```

**Note on `setCountryData` scale shape:** verify the second argument schema matches the actual `ScaleConfig` type in `core/src/data/scales.ts`. The shape above is a guess — adjust to match (`{ type, domain, range }` or similar). Run the typecheck and let the compiler tell you the actual shape.

- [ ] **Step 10.2: StoryTimeline.tsx**

```tsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlay, faPause, faChevronRight } from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { GlobeInstance } from '@globiojs/core';
import { cn } from '@/lib/utils';

interface SceneEntry {
  readonly id: string;
  readonly label: string;
  readonly position: readonly [number, number];
  readonly meta: string;
}

const SCENES: ReadonlyArray<SceneEntry> = [
  { id: 'tokyo', label: 'Tokyo', position: [35.6, 139.7], meta: '35.6°N · 139.7°E' },
  { id: 'nyc', label: 'New York', position: [40.7, -74.0], meta: '40.7°N · 74.0°W' },
  { id: 'cairo', label: 'Cairo', position: [30.0, 31.2], meta: '30.0°N · 31.2°E' },
  { id: 'sao-paulo', label: 'São Paulo', position: [-23.5, -46.6], meta: '23.5°S · 46.6°W' },
];

export interface StoryTimelineProps {
  readonly instance: GlobeInstance | null;
}

export function StoryTimeline({ instance }: StoryTimelineProps) {
  const [activeId, setActiveId] = useState(SCENES[0].id);
  const [playing, setPlaying] = useState(false);

  const playScene = (entry: SceneEntry) => {
    setActiveId(entry.id);
    instance?.flyTo([entry.position[0], entry.position[1]], undefined, { duration: 2200 });
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.025] p-4 backdrop-blur-md">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-[10px] uppercase tracking-[0.18em] text-slate-500">scene timeline</div>
        <button
          type="button"
          onClick={() => setPlaying((p) => !p)}
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.1] bg-white/[0.035] px-2.5 py-1 text-[11px] text-slate-200"
        >
          <FontAwesomeIcon icon={playing ? faPause : faPlay} className="size-3 text-amber-200" />
          {playing ? 'Pause' : 'Play'}
        </button>
      </div>
      <div className="flex items-center gap-2 overflow-x-auto">
        {SCENES.map((s, i) => (
          <div key={s.id} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => playScene(s)}
              className={cn(
                'flex flex-col items-start rounded-xl border px-3 py-2 text-left transition-all duration-200',
                activeId === s.id
                  ? 'border-amber-200/55 bg-amber-200/[0.08] shadow-[0_0_22px_-12px_rgba(251,191,36,1)]'
                  : 'border-white/[0.08] bg-white/[0.025] hover:border-white/[0.2]',
              )}
            >
              <span className="text-xs font-semibold text-white">{s.label}</span>
              <span className="mt-0.5 font-mono text-[9px] text-slate-500">{s.meta}</span>
            </button>
            {i < SCENES.length - 1 && (
              <FontAwesomeIcon icon={faChevronRight} className="size-2 text-slate-600" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 10.3: DataStorySection.tsx**

```tsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChartArea, faFilm, faBolt } from '@fortawesome/sharp-duotone-solid-svg-icons';
import type { GlobeInstance } from '@globiojs/core';
import { SectionHeader } from '@/components/shared';
import { ChoroplethStage } from './data-story/ChoroplethStage';
import { StoryTimeline } from './data-story/StoryTimeline';
import { CodeBlock } from './atoms';

const FEATURES = [
  { icon: faChartArea, title: 'Data layers', copy: 'Choropleth, hexbin, bars, extruded, heatmap, charts. One imperative call.', accent: '#22d3ee' },
  { icon: faFilm, title: 'Story API', copy: 'Scene timeline with flyTo, focus, popups, transitions and easing curves.', accent: '#f472b6' },
  { icon: faBolt, title: 'Real-time updates', copy: 'Every setter runs without scene rebuild — live dashboards stay smooth.', accent: '#fbbf24' },
];

const SNIPPET = `globe.setCountryData({
  US: { value: 332 }, CN: { value: 1412 }, IN: { value: 1380 },
}, { type: 'sequential', domain: [0, 1500], range: ['#22d3ee', '#f472b6'] });

globe.setStory({
  scenes: [
    { id: 'tokyo', flyTo: { position: [35.6, 139.7] }, duration: 5500 },
    { id: 'nyc',   flyTo: { position: [40.7, -74.0] }, duration: 5500 },
  ],
});
globe.playStory();`;

export function DataStorySection() {
  const [instance, setInstance] = useState<GlobeInstance | null>(null);

  return (
    <section id="data" className="relative overflow-hidden py-28">
      <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_18%_30%,rgba(244,114,182,0.08),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(34,211,238,0.08),transparent_30%)]" />

      <div className="mx-auto max-w-[1480px] px-6">
        <div className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:items-start">
          <div className="lg:sticky lg:top-28">
            <SectionHeader
              align="left"
              eyebrow="Data & Storytelling"
              title="From dataset to scene."
              sub="Mount data layers and choreograph cinematic scenes using the same engine. Built-in scale, scene controller and runtime updates — no external animation library."
            />

            <div className="mt-8 grid gap-3">
              {FEATURES.map((f) => (
                <div key={f.title} className="rounded-2xl border border-white/[0.08] bg-white/[0.035] p-4">
                  <span className="mb-3 flex size-10 items-center justify-center rounded-xl border border-white/[0.08] bg-black/30">
                    <FontAwesomeIcon icon={f.icon} className="size-4" style={{ color: f.accent }} />
                  </span>
                  <h3 className="text-sm font-semibold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{f.copy}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <StoryTimeline instance={instance} />
            <ChoroplethStage
              className="aspect-square w-full lg:aspect-[16/13]"
              onReady={(api) => setInstance(api.instance)}
            />
            <CodeBlock code={SNIPPET} copy lineNumbers />
          </div>
        </div>
      </div>
    </section>
  );
}
```

- [ ] **Step 10.4: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

If `flyTo`'s third argument options shape is different from `{ duration }`, adjust per the `FlyToOptions` type in core/src/types/camera.ts. Most likely it accepts `{ duration: number }`.

---

### Task 11: Developer Surface polish

**Files:**
- Modify: `examples/vanilla-demo/src/components/home/landing/ApiSection.tsx`
- Create: `examples/vanilla-demo/src/components/home/landing/api/CodePlayground.tsx`

- [ ] **Step 11.1: CodePlayground.tsx**

Wraps the `CodeBlock` atom and adds a tabs strip on top.

```tsx
import { useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faCode } from '@fortawesome/sharp-duotone-solid-svg-icons';
import { faAngular, faJs, faReact, faVuejs } from '@fortawesome/free-brands-svg-icons';
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { CodeBlock } from '../atoms';
import { cn } from '@/lib/utils';

interface Tab {
  readonly id: string;
  readonly label: string;
  readonly icon: IconDefinition;
  readonly code: string;
}

const TABS: ReadonlyArray<Tab> = [
  {
    id: 'vanilla',
    label: 'Vanilla',
    icon: faJs,
    code: `import { createGlobe } from '@globiojs/core';

const globe = createGlobe({
  container,
  kind: 'hologram',
  theme: 'hologram-cyan',
  arcs: { enabled: true, animationSpeed: 1.2 },
  markers: { enabled: true, hoverScale: 1.35 },
});

globe.mount();
globe.update({ kind: 'paper', theme: 'paper-default' });`,
  },
  {
    id: 'react',
    label: 'React',
    icon: faReact,
    code: `import { Globe } from '@globiojs/react';

function IntelligenceGlobe({ dataset }) {
  return (
    <Globe
      kind="dotted"
      theme="dotted-dark"
      markers={{ points: dataset.cities, pulse: true }}
      arcs={{ routes: dataset.routes, colorMode: 'velocity' }}
      countryFill={{ mode: 'data', data: dataset.risk }}
    />
  );
}`,
  },
  {
    id: 'vue',
    label: 'Vue',
    icon: faVuejs,
    code: `<script setup lang="ts">
import { VueGlobe } from '@globiojs/vue';
</script>

<template>
  <VueGlobe
    kind="paper"
    theme="paper-default"
    :country-fill="{ mode: 'palette', palette }"
    :labels="{ enabled: true, density: 'featured' }"
    :focus-pulse="{ enabled: true, texture: 'ink-ring' }"
  />
</template>`,
  },
  {
    id: 'angular',
    label: 'Angular',
    icon: faAngular,
    code: `import { GlobeComponent } from '@globiojs/angular';

@Component({
  standalone: true,
  imports: [GlobeComponent],
  template: \`
    <globio-globe
      [kind]="'wireframe'"
      [theme]="'wireframe-tron'"
      [arcs]="networkRoutes"
      [markers]="edgeNodes"
      (countryClick)="selectCountry($event)" />
  \`,
})
export class NetworkPanel {}`,
  },
];

export function CodePlayground() {
  const [activeId, setActiveId] = useState(TABS[0].id);
  const active = TABS.find((t) => t.id === activeId)!;

  return (
    <div className="overflow-hidden rounded-[2rem] border border-white/[0.08] bg-[#050812]/90">
      <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.035] px-4 py-3">
        <div className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.16em] text-slate-400">
          <FontAwesomeIcon icon={faCode} className="size-3 text-amber-200" />
          typed config
        </div>
        <div className="flex rounded-full border border-white/[0.08] bg-black/25 p-1">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveId(t.id)}
              className={cn(
                'inline-flex h-8 items-center gap-2 rounded-full px-3 text-xs transition-all duration-250',
                activeId === t.id ? 'bg-white/[0.1] text-white' : 'text-slate-500 hover:text-slate-200',
              )}
            >
              <FontAwesomeIcon icon={t.icon} className="size-3" />
              <span className="hidden sm:inline">{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#02030a] p-5">
        <CodeBlock code={active.code} copy lineNumbers />
      </div>
    </div>
  );
}
```

- [ ] **Step 11.2: Modify ApiSection.tsx**

Replace the existing in-file code-tabs implementation (lines ~170-217) with `<CodePlayground />`. Keep the SectionHeader, the 4 highlight cards, the StarBorder + GitHub button cluster. Below the cluster, add `<UseCaseChips variant="compact" className="mt-8" />` (replacing nothing — this is new). Keep the `<ScrollVelocity ...>` ticker at the bottom.

Concrete edit:
- Add import: `import { CodePlayground } from './api/CodePlayground';`
- Add import: `import { UseCaseChips } from './atoms';`
- Replace the `<SpotlightCard>` block with `<SpotlightCard ...><CodePlayground /></SpotlightCard>` (keep SpotlightCard wrapper for the glow).
- Remove the `codeTabs` array, the `apiHighlights` constant + 4-card grid stays.
- Remove the embedded `<pre>` block.
- Below the closing `</div>` of the 2-col grid, add: `<UseCaseChips variant="compact" className="mt-8" />`.

- [ ] **Step 11.3: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 12: Final CTA polish

**Files:**
- Modify: `examples/vanilla-demo/src/components/home/landing/FinalCta.tsx`

- [ ] **Step 12.1: Apply changes**

In the existing file:
- Increase the globe's `className` from `size-[min(78vmin,720px)]` to `size-[min(90vmin,840px)]`.
- Replace H2 string `Open the studio and make the globe impossible to ignore.` with `Now ship a globe.`.
- Replace the subhead paragraph with: `Pick a kind, tune the layers, hand the typed config off to your app. The same engine ships from preview to production.` (keep it under 22 words).
- Replace the `ctaFeatureBadges` 3-cell grid with `<UseCaseChips variant="expanded" className="mt-10 max-w-xl" />`.
- Add import: `import { UseCaseChips } from './atoms';`.
- Remove the now-unused `ctaFeatureBadges` constant + its imports (faLayerGroup, faRoute, faRadar) if only used there.

- [ ] **Step 12.2: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 13: Wire HomeLanding + delete legacy files

**Files:**
- Modify: `examples/vanilla-demo/src/components/home/landing/HomeLanding.tsx`
- Delete: `examples/vanilla-demo/src/components/home/landing/KindShowcaseSection.tsx`
- Delete: `examples/vanilla-demo/src/components/home/landing/LayerArchitectureSection.tsx`

- [ ] **Step 13.1: Replace HomeLanding section list**

```tsx
import { useEffect } from 'react';
import { Nav } from '@/components/home/Nav';
import { ClickSpark } from '@/components/reactbits';
import { NoiseOverlay, ScrollProgress } from '@/components/shared';

import { ApiSection } from './ApiSection';
import { DataStorySection } from './DataStorySection';
import { FinalCta } from './FinalCta';
import { HeroStage } from './HeroStage';
import { KindPersonalitiesSection } from './KindPersonalitiesSection';
import { LayerAnatomySection } from './LayerAnatomySection';
import { StudioWorkflowSection } from './StudioWorkflowSection';

export function HomeLanding() {
  useEffect(() => {
    document.documentElement.style.scrollBehavior = 'smooth';
    return () => {
      document.documentElement.style.scrollBehavior = '';
    };
  }, []);

  return (
    <ClickSpark sparkColor="#ffd57a" sparkSize={8} sparkRadius={22} sparkCount={12} duration={520}>
      <main className="relative min-h-screen overflow-x-clip bg-[#02030a] text-slate-100 antialiased">
        <ScrollProgress />
        <NoiseOverlay />
        <Nav />
        <HeroStage />
        <KindPersonalitiesSection />
        <LayerAnatomySection />
        <StudioWorkflowSection />
        <DataStorySection />
        <ApiSection />
        <FinalCta />
      </main>
    </ClickSpark>
  );
}
```

- [ ] **Step 13.2: Delete legacy sections**

```bash
rm examples/vanilla-demo/src/components/home/landing/KindShowcaseSection.tsx
rm examples/vanilla-demo/src/components/home/landing/LayerArchitectureSection.tsx
```

- [ ] **Step 13.3: Update Nav anchors if needed**

Read `examples/vanilla-demo/src/components/home/Nav.tsx`. If the nav links still reference `#kinds`, `#architecture`, `#studio`, `#api`, ensure each section has a matching id:

- HeroStage — no id (root section)
- KindPersonalitiesSection — `id="kinds"` ✓
- LayerAnatomySection — `id="architecture"` ✓
- StudioWorkflowSection — `id="studio"` (verify on existing)
- DataStorySection — `id="data"` (new)
- ApiSection — `id="api"` ✓

If the Nav doesn't have a `#data` link and you want it discoverable, add it to the nav items.

- [ ] **Step 13.4: Typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0.

---

### Task 14: Verification — typecheck, build, browser

- [ ] **Step 14.1: Full typecheck**

Run: `pnpm --filter vanilla-demo typecheck`
Expected: exit 0, no errors.

- [ ] **Step 14.2: Full build**

Run: `pnpm --filter vanilla-demo build`
Expected: exit 0, build artifacts produced.

- [ ] **Step 14.3: Browser at 1440x900**

Start the dev server (`pnpm --filter vanilla-demo dev`), navigate to the landing page, check:
- Hero centerpiece globe ≥ 660px wide.
- No horizontal scrollbar.
- Theme-bleed visibly tints orbit rings + atmosphere + code preview when switching kinds.
- Drag-rotate works on hero globe.
- Stat band shows 6 columns evenly.
- All chapter sections render without console errors.
- Personality rows alternate L/R correctly.
- Anatomy 3×3 grid plus full-body diagram render.
- Workshop live-log strip cycles.
- Data & Storytelling globe renders (with choropleth if `setCountryData` shape was correct, otherwise plain globe — log any silent fallback).
- Story timeline buttons trigger flyTo.
- Code playground tabs switch and copy works.
- Final CTA globe is large and Magnet CTA hovers.
- Use-case chips strip renders in chapter 6 + chapter 7.

- [ ] **Step 14.4: Browser at 1920x1080**

Same checks at 1920x1080. Verify spacing/typography scales up, no awkward gaps, hero stays composed.

- [ ] **Step 14.5: Console + network check**

DevTools console: zero errors, ideally zero warnings (theme/preset warnings from core are acceptable).
Network: no 404s on assets.

- [ ] **Step 14.6: Report and ask for commit**

Summarize:
- What sections were rebuilt vs polished vs created.
- Any deferred stretch goals (e.g. real Story API replaced with simple flyTo cycler).
- Any issues encountered (e.g. `setCountryData` scale shape mismatch and what was done).
- Wait for user approval before committing.

---

## Self-Review

Going through the spec section-by-section against this plan:

- **Hero rebuild** — Tasks 1, 2, 6 cover core extension, DecorationGlobe extension, all hero sub-components, theme-bleed, real anchors via `project()`, drag-rotate via `interactive`, integrated stat band. ✓
- **Personalities chapter** — Task 7 covers vertical gallery, alternating L/R, IntersectionObserver pacing, theme swatches, kind accent tint per row. ✓
- **Anatomy chapter** — Task 8 covers 3×3 grid of layer cards + full-body diagram with annotations. ✓
- **Workshop polish** — Task 9 covers WorkshopDial circular gauges + LiveLogStrip + integration. ✓
- **Data & Storytelling** — Task 10 covers ChoroplethStage with real `setCountryData`, StoryTimeline with `flyTo`, sticky-left feature cards, code snippet. ✓
- **Developer Surface** — Task 11 covers CodePlayground with line numbers + copy + syntax highlighting + 4 framework tabs. UseCaseChips replaces fake trust marks. ✓
- **Final CTA** — Task 12 covers larger globe, revised copy, expanded UseCaseChips. ✓
- **Cross-cutting atoms** — Task 3 covers Panel, OrbitRing, KindBadge, ThemeSwatch, StatChip, CodeBlock, UseCaseChips. ✓
- **Hooks** — Task 4 covers useInViewport + useScrollParallax. ✓
- **Theme presets data** — Task 5 covers KIND_THEMES + KIND_ACCENT. ✓
- **Removed assets** — Task 13 covers deletion of KindShowcaseSection + LayerArchitectureSection. ✓
- **Verification** — Task 14 covers typecheck + build + 1440 + 1920 browser checks. ✓

**Placeholder scan:** none — all steps contain code or concrete instructions. The two areas that depend on engine reality (`setCountryData` scale shape, `FlyToOptions` shape) explicitly say "let the typecheck tell you and adjust" rather than guessing — that's an actionable instruction, not a placeholder.

**Type consistency:** `DecorationGlobeReadyApi` defined in Task 2 and re-imported in Tasks 6, 10 ✓. `KIND_THEMES` / `KIND_ACCENT` defined in Task 5, imported throughout ✓. `KindThemeEntry` exported from Task 5, imported in Task 6.10 ✓.

**Scope check:** Single coherent landing redesign. One spec, one plan, no further decomposition needed.

The plan stands.

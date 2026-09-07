import type { IconDefinition } from '@fortawesome/fontawesome-svg-core';
import { faAngular, faJs, faReact, faVuejs } from '@fortawesome/free-brands-svg-icons';

export type FrameworkId = 'vanilla' | 'react' | 'vue' | 'angular';

export interface FrameworkMeta {
  readonly id: FrameworkId;
  readonly label: string;
  readonly icon: IconDefinition;
  /** npm package that provides the integration. */
  readonly pkg: string;
  /** Default file name shown on code panels when a snippet has none. */
  readonly file: string;
}

/** The four ways in, in the order the landing presents them. */
export const FRAMEWORKS: ReadonlyArray<FrameworkMeta> = [
  { id: 'vanilla', label: 'Vanilla', icon: faJs, pkg: '@your-globe/core', file: 'globe.ts' },
  { id: 'react', label: 'React', icon: faReact, pkg: '@your-globe/react', file: 'Globe.tsx' },
  { id: 'vue', label: 'Vue', icon: faVuejs, pkg: '@your-globe/vue', file: 'Globe.vue' },
  { id: 'angular', label: 'Angular', icon: faAngular, pkg: '@your-globe/angular', file: 'globe.component.ts' },
];

export const DEFAULT_FRAMEWORK: FrameworkId = 'vanilla';

export const frameworkMeta = (id: FrameworkId): FrameworkMeta => {
  const meta = FRAMEWORKS.find((f) => f.id === id);
  if (!meta) throw new Error(`Unknown framework ${id}`);
  return meta;
};

export const isFrameworkId = (value: unknown): value is FrameworkId =>
  typeof value === 'string' && FRAMEWORKS.some((f) => f.id === value);

/** A snippet per framework. Panels hide the tabs of frameworks that are absent. */
export type FrameworkCode = Partial<Readonly<Record<FrameworkId, string>>>;

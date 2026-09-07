/**
 * Shape of `api.json`, produced by `scripts/docs-extract.mjs` from the
 * core's TypeScript sources. Everything here is data, never hand-edited.
 */
export interface ApiEntry {
  readonly name: string;
  /** Dot path from the top of GlobeConfig, e.g. `countries.fill.mode`. */
  readonly path: string;
  readonly type: string;
  readonly optional: boolean;
  readonly description: string;
  readonly default?: string;
  readonly since?: string;
  readonly kinds?: ReadonlyArray<string>;
  readonly deprecated?: string;
  /** Interface this entry was expanded from, when the type is a named interface. */
  readonly ref?: string;
  /** Element type name for arrays of documented interfaces. */
  readonly items?: string;
  readonly children?: ReadonlyArray<ApiEntry>;
}

export interface ApiMethod {
  readonly name: string;
  readonly signature: string;
  readonly returns: string;
  readonly description: string;
  readonly since?: string;
  readonly deprecated?: string;
}

export interface ApiEvent {
  readonly name: string;
  readonly handler: string;
  readonly payload: string;
  readonly description: string;
}

export interface ApiInterface {
  readonly name: string;
  readonly kind: 'interface';
  readonly description: string;
  readonly extends: ReadonlyArray<string>;
  readonly members: ReadonlyArray<ApiEntry>;
}

export interface ApiAlias {
  readonly name: string;
  readonly kind: 'alias';
  readonly description: string;
  readonly type: string;
  readonly variants?: ReadonlyArray<string>;
}

export type ApiType = ApiInterface | ApiAlias;

export interface ApiJson {
  readonly coreVersion: string;
  readonly stats: {
    readonly configKeys: number;
    readonly configKeysDocumented: number;
    readonly instanceMethods: number;
    readonly events: number;
    readonly types: number;
  };
  readonly config: ReadonlyArray<ApiEntry>;
  readonly instance: ReadonlyArray<ApiMethod>;
  readonly events: ReadonlyArray<ApiEvent>;
  readonly types: Readonly<Record<string, ApiType>>;
  readonly wrappers: {
    readonly react: {
      readonly forwardsWholeConfig: boolean;
      readonly props: ReadonlyArray<{ readonly name: string; readonly type: string }>;
      readonly events: ReadonlyArray<{ readonly name: string; readonly type: string }>;
      readonly handle: ReadonlyArray<{ readonly name: string; readonly type: string }>;
    };
    readonly vue: {
      readonly props: ReadonlyArray<{ readonly name: string; readonly type: string }>;
      readonly events: ReadonlyArray<{ readonly name: string; readonly payload: string }>;
      readonly exposed: ReadonlyArray<string>;
    };
    readonly angular: {
      readonly inputs: ReadonlyArray<{ readonly name: string; readonly type: string }>;
      readonly outputs: ReadonlyArray<{ readonly name: string; readonly payload: string }>;
      readonly methods: ReadonlyArray<{ readonly name: string; readonly signature: string }>;
    };
  };
}

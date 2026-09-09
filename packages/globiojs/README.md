# GlobioJS

Interactive 3D globes for JavaScript. This package re-exports `@globiojs/core` and follows its version, so both entry points share the same engine and types.

```sh
npm install globiojs three
```

```ts
import { createGlobe } from 'globiojs';
const globe = createGlobe({ container: document.querySelector('#globe')! });
// Dispose when the host component is removed.
globe.destroy();
```

Use `@globiojs/react`, `@globiojs/vue`, or `@globiojs/angular` with `@globiojs/core` for framework integrations.

[Documentation](https://globiojs.dev/docs) · [Source](https://github.com/SparrowVic/globiojs)

MIT © Wiktor Wróbel

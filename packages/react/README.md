# @globiojs/react

React component for `@globiojs/core`. Every core configuration key is available as a prop, globe events are exposed as callbacks, and the component ref provides access to the underlying engine instance.

## Installation

```bash
npm install @globiojs/react @globiojs/core react three
```

## Usage

```tsx
import { useRef } from 'react';
import { Globe, type GlobeHandle } from '@globiojs/react';

export function World() {
  const globeRef = useRef<GlobeHandle>(null);

  return (
    <Globe
      ref={globeRef}
      kind="outline"
      theme="outline-dark"
      markers={[
        { id: 'warsaw', position: [52.23, 21.01], label: 'Warsaw' },
      ]}
      onMarkerClick={({ marker }) => console.log(marker.id)}
      style={{ width: '100%', height: 520 }}
    />
  );
}
```

Use `globeRef.current?.getInstance()` for imperative APIs such as `flyTo`, data layers, legends, and stories.

See the [GlobioJS repository](https://github.com/SparrowVic/globio) for the full React guide and API reference.
